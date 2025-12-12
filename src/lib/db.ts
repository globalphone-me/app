import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db as drizzleDb } from "./drizzle";
import { users, callSessions, payments } from "./schema";

// Types that match the old interface for backwards compatibility
export interface CallSession {
  id: string;
  paymentId: string;
  callerAddress: string;
  calleePhoneId: string;
  price: string;
  status: "PENDING" | "VERIFIED" | "COMPLETED" | "FAILED" | "VOICEMAIL";
  twilioCallSid?: string;
  duration?: number;
  chainId?: number;
}

export interface Callee {
  id: string;
  name: string;
  realPhoneNumber: string;
  phoneId: string;
  address: string;
  price: string;
  onlyHumans?: boolean;
  rules?: any[];
}

class PostgresDB {
  private generatePhoneId(realNumber: string): string {
    return crypto
      .createHash("sha256")
      .update(realNumber)
      .digest("hex")
      .substring(0, 12);
  }

  // --- USER METHODS ---

  async addUser(
    name: string,
    realPhoneNumber: string,
    address: string,
    price: string,
    onlyHumans: boolean,
    rules: any[],
  ): Promise<Callee> {
    const phoneId = this.generatePhoneId(realPhoneNumber);
    const lowerAddr = address.toLowerCase();

    const [user] = await drizzleDb.insert(users).values({
      name,
      realPhoneNumber,
      phoneId,
      address: lowerAddr,
      price,
      onlyHumans,
      rules: JSON.stringify(rules),
    })
      .onConflictDoUpdate({
        target: users.address,
        set: {
          name,
          realPhoneNumber,
          phoneId,
          price,
          onlyHumans,
          rules: JSON.stringify(rules),
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      id: user.id,
      name: user.name || "",
      realPhoneNumber: user.realPhoneNumber || "",
      phoneId: user.phoneId || "",
      address: user.address,
      price: user.price || "0",
      onlyHumans: user.onlyHumans || false,
      rules: user.rules ? JSON.parse(user.rules) : [],
    };
  }

  async getByAddress(address: string): Promise<Callee | null> {
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.address, address.toLowerCase()))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      name: user.name || "",
      realPhoneNumber: user.realPhoneNumber || "",
      phoneId: user.phoneId || "",
      address: user.address,
      price: user.price || "0",
      onlyHumans: user.onlyHumans || false,
      rules: user.rules ? JSON.parse(user.rules) : [],
    };
  }

  async getByPhoneId(phoneId: string): Promise<Callee | null> {
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.phoneId, phoneId))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      name: user.name || "",
      realPhoneNumber: user.realPhoneNumber || "",
      phoneId: user.phoneId || "",
      address: user.address,
      price: user.price || "0",
      onlyHumans: user.onlyHumans || false,
      rules: user.rules ? JSON.parse(user.rules) : [],
    };
  }

  async getAllUsers(): Promise<Callee[]> {
    const allUsers = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.realPhoneNumber, users.realPhoneNumber)); // Only callees (those with phone numbers)

    return allUsers
      .filter(u => u.realPhoneNumber) // Only return users with phone numbers (callees)
      .map(user => ({
        id: user.id,
        name: user.name || "",
        realPhoneNumber: user.realPhoneNumber || "",
        phoneId: user.phoneId || "",
        address: user.address,
        price: user.price || "0",
        onlyHumans: user.onlyHumans || false,
        rules: user.rules ? JSON.parse(user.rules) : [],
      }));
  }

  // --- CALL SESSION METHODS ---

  async createCallSession(
    paymentId: string,
    callerAddress: string,
    calleePhoneId: string,
    price: string,
    chainId?: number,
  ): Promise<CallSession> {
    // First, ensure caller has a user record (get or create)
    let caller = await this.getByAddress(callerAddress);
    if (!caller) {
      // Auto-create minimal user record for caller
      const [newUser] = await drizzleDb.insert(users).values({
        address: callerAddress.toLowerCase(),
      }).returning();
      caller = { id: newUser.id, name: "", realPhoneNumber: "", phoneId: "", address: newUser.address, price: "0" };
    }

    // Get callee by phoneId
    const callee = await this.getByPhoneId(calleePhoneId);

    // Create payment record with the provided paymentId as its ID
    const [payment] = await drizzleDb.insert(payments).values({
      id: paymentId, // Use the provided paymentId
      amount: price,
      chainId: chainId || 8453, // Default to Base
      status: "HELD",
    }).returning();

    // Create call session
    const [session] = await drizzleDb.insert(callSessions).values({
      callerId: caller.id,
      calleeId: callee?.id,
      paymentId: payment.id,
      status: "PENDING",
    }).returning();

    return {
      id: session.id,
      paymentId: payment.id,
      callerAddress: callerAddress.toLowerCase(),
      calleePhoneId,
      price,
      status: "PENDING",
      chainId,
    };
  }

  async linkCallSid(paymentId: string, callSid: string): Promise<void> {
    await drizzleDb
      .update(callSessions)
      .set({ twilioCallSid: callSid, updatedAt: new Date() })
      .where(eq(callSessions.paymentId, paymentId));
  }

  async markSessionVerified(callSid: string): Promise<void> {
    await drizzleDb
      .update(callSessions)
      .set({ status: "VERIFIED", updatedAt: new Date() })
      .where(eq(callSessions.twilioCallSid, callSid));
  }

  async finalizeCallSession(
    callSid: string,
    status: CallSession["status"],
    duration: number,
  ): Promise<CallSession | null> {
    // Get current session
    const [session] = await drizzleDb
      .select()
      .from(callSessions)
      .where(eq(callSessions.twilioCallSid, callSid))
      .limit(1);

    if (!session) return null;

    // Only update status if it wasn't already verified
    const newStatus = session.status === "PENDING" ? status : session.status;

    await drizzleDb
      .update(callSessions)
      .set({ status: newStatus, duration, updatedAt: new Date() })
      .where(eq(callSessions.twilioCallSid, callSid));

    // Get full session data with related payment
    const [payment] = await drizzleDb
      .select()
      .from(payments)
      .where(eq(payments.id, session.paymentId!))
      .limit(1);

    // Get caller address
    const [caller] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, session.callerId!))
      .limit(1);

    // Get callee phoneId
    const [callee] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.id, session.calleeId!))
      .limit(1);

    return {
      id: session.id,
      paymentId: payment?.id || "",
      callerAddress: caller?.address || "",
      calleePhoneId: callee?.phoneId || "",
      price: payment?.amount || "0",
      status: newStatus as CallSession["status"],
      twilioCallSid: callSid,
      duration,
      chainId: payment?.chainId,
    };
  }

  async getSessionBySid(callSid: string): Promise<CallSession | null> {
    const [session] = await drizzleDb
      .select()
      .from(callSessions)
      .where(eq(callSessions.twilioCallSid, callSid))
      .limit(1);

    if (!session) return null;

    // Get related data
    const [payment] = session.paymentId
      ? await drizzleDb.select().from(payments).where(eq(payments.id, session.paymentId)).limit(1)
      : [null];

    const [caller] = session.callerId
      ? await drizzleDb.select().from(users).where(eq(users.id, session.callerId)).limit(1)
      : [null];

    const [callee] = session.calleeId
      ? await drizzleDb.select().from(users).where(eq(users.id, session.calleeId)).limit(1)
      : [null];

    return {
      id: session.id,
      paymentId: payment?.id || "",
      callerAddress: caller?.address || "",
      calleePhoneId: callee?.phoneId || "",
      price: payment?.amount || "0",
      status: session.status as CallSession["status"],
      twilioCallSid: session.twilioCallSid || undefined,
      duration: session.duration || undefined,
      chainId: payment?.chainId || undefined,
    };
  }

  // Legacy method - keeping for compatibility
  async updateSessionWithCallSid(paymentId: string, callSid: string): Promise<void> {
    await this.linkCallSid(paymentId, callSid);
  }

  // Legacy method - keeping for compatibility
  async finalizeCallSessionOld(
    callSid: string,
    status: CallSession["status"],
    duration: number,
  ): Promise<CallSession | null> {
    return this.finalizeCallSession(callSid, status, duration);
  }

  // --- PAYMENT METHODS ---

  async updatePaymentStatus(
    paymentId: string,
    status: "HELD" | "FORWARDED" | "REFUNDED" | "STUCK",
    txHash?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      settledAt: new Date(),
    };

    if (status === "FORWARDED" && txHash) {
      updateData.forwardTxHash = txHash;
    } else if (status === "REFUNDED" && txHash) {
      updateData.refundTxHash = txHash;
    }

    await drizzleDb
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, paymentId));
  }
}

export const db = new PostgresDB();
