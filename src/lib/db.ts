import crypto from "crypto";
import { eq, sql, count, desc, asc } from "drizzle-orm";
import { db as drizzleDb } from "./drizzle";
import { users, callSessions, payments } from "./schema";
import { PLATFORM_FEE_PERCENT, ANTI_SPAM_FEE } from "./config";

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

export interface Availability {
  enabled: boolean;
  timezone: string; // e.g., 'America/New_York'
  weekdays: {
    start: string; // "09:00"
    end: string;   // "17:00"
    enabled: boolean;
  };
  weekends: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

export interface Callee {
  id: string;
  name: string;
  handle?: string;
  realPhoneNumber: string;
  phoneId: string;
  address: string;
  price: string;
  onlyHumans?: boolean;
  rules?: any[];
  availability?: Availability;
  bio?: string;
  avatarUrl?: string;
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
    availability?: Availability,
    bio?: string,
    handle?: string,
  ): Promise<Callee> {
    const phoneId = this.generatePhoneId(realPhoneNumber);
    const lowerAddr = address.toLowerCase();

    const [user] = await drizzleDb.insert(users).values({
      name,
      handle: handle ? handle.toLowerCase() : undefined,
      realPhoneNumber,
      phoneId,
      address: lowerAddr,
      price,
      onlyHumans,
      rules: JSON.stringify(rules),
      availability: availability ? JSON.stringify(availability) : null,
      bio,
    })
      .onConflictDoUpdate({
        target: users.address,
        set: {
          name,
          handle: handle ? handle.toLowerCase() : undefined,
          realPhoneNumber,
          phoneId,
          price,
          onlyHumans,
          rules: JSON.stringify(rules),
          availability: availability ? JSON.stringify(availability) : null,
          bio,
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
      availability: user.availability ? JSON.parse(user.availability) : undefined,
      bio: user.bio || undefined,
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
      handle: user.handle || undefined,
      realPhoneNumber: user.realPhoneNumber || "",
      phoneId: user.phoneId || "",
      address: user.address,
      price: user.price || "0",
      onlyHumans: user.onlyHumans || false,
      rules: user.rules ? JSON.parse(user.rules) : [],
      availability: user.availability ? JSON.parse(user.availability) : undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
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
      availability: user.availability ? JSON.parse(user.availability) : undefined,
      bio: user.bio || undefined,
    };
  }

  async getAllUsers(): Promise<Callee[]> {
    const allUsers = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.realPhoneNumber, users.realPhoneNumber))
      .orderBy(asc(users.createdAt)); // Oldest first

    return allUsers
      .filter(u => u.realPhoneNumber) // Only return users with phone numbers (callees)
      .map(user => ({
        id: user.id,
        name: user.name || "",
        handle: user.handle || undefined,
        realPhoneNumber: user.realPhoneNumber || "",
        phoneId: user.phoneId || "",
        address: user.address,
        price: user.price || "0",
        onlyHumans: user.onlyHumans || false,
        rules: user.rules ? JSON.parse(user.rules) : [],
        availability: user.availability ? JSON.parse(user.availability) : undefined,
        bio: user.bio || undefined,
        avatarUrl: user.avatarUrl || undefined,
      }));
  }

  async updateUserAvatar(address: string, avatarUrl: string): Promise<void> {
    await drizzleDb
      .update(users)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(users.address, address.toLowerCase()));
  }

  async getByHandle(handle: string): Promise<Callee | null> {
    const [user] = await drizzleDb
      .select()
      .from(users)
      .where(eq(users.handle, handle.toLowerCase()))
      .limit(1);

    if (!user) return null;

    return {
      id: user.id,
      name: user.name || "",
      handle: user.handle || undefined,
      realPhoneNumber: user.realPhoneNumber || "",
      phoneId: user.phoneId || "",
      address: user.address,
      price: user.price || "0",
      onlyHumans: user.onlyHumans || false,
      rules: user.rules ? JSON.parse(user.rules) : [],
      availability: user.availability ? JSON.parse(user.availability) : undefined,
      bio: user.bio || undefined,
      avatarUrl: user.avatarUrl || undefined,
    };
  }

  async isHandleAvailable(handle: string): Promise<boolean> {
    const [existing] = await drizzleDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.handle, handle.toLowerCase()))
      .limit(1);
    return !existing;
  }

  async updateUserHandle(address: string, handle: string): Promise<void> {
    await drizzleDb
      .update(users)
      .set({ handle: handle.toLowerCase(), updatedAt: new Date() })
      .where(eq(users.address, address.toLowerCase()));
  }

  /**
   * Reset a user's profile by clearing all profile fields.
   * Keeps the user record (with address/id) for call history integrity.
   * User can re-create their profile by signing in again.
   */
  async resetProfile(address: string): Promise<void> {
    await drizzleDb
      .update(users)
      .set({
        name: null,
        handle: null,
        realPhoneNumber: null,
        phoneId: null,
        price: null,
        onlyHumans: null,
        rules: null,
        availability: null,
        bio: null,
        avatarUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.address, address.toLowerCase()));
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

  // --- ADMIN METHODS ---

  async getAllCallSessionsAdmin(limit = 100) {
    const sessions = await drizzleDb
      .select()
      .from(callSessions)
      .orderBy(desc(callSessions.createdAt))
      .limit(limit);

    // Fetch related user and payment data
    const result = await Promise.all(
      sessions.map(async (session) => {
        const [caller] = session.callerId
          ? await drizzleDb.select().from(users).where(eq(users.id, session.callerId)).limit(1)
          : [null];
        const [callee] = session.calleeId
          ? await drizzleDb.select().from(users).where(eq(users.id, session.calleeId)).limit(1)
          : [null];
        const [payment] = session.paymentId
          ? await drizzleDb.select().from(payments).where(eq(payments.id, session.paymentId)).limit(1)
          : [null];

        return {
          id: session.id,
          status: session.status,
          twilioCallSid: session.twilioCallSid,
          duration: session.duration,
          createdAt: session.createdAt,
          caller: caller ? { address: caller.address, name: caller.name } : null,
          callee: callee ? { address: callee.address, name: callee.name, phoneId: callee.phoneId } : null,
          payment: payment ? { amount: payment.amount, status: payment.status, chainId: payment.chainId } : null,
        };
      })
    );

    return result;
  }

  async getAllPaymentsAdmin(limit = 100) {
    const allPayments = await drizzleDb
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt))
      .limit(limit);

    return allPayments.map((p) => ({
      id: p.id,
      amount: p.amount,
      chainId: p.chainId,
      status: p.status,
      txHash: p.txHash,
      forwardTxHash: p.forwardTxHash,
      refundTxHash: p.refundTxHash,
      createdAt: p.createdAt,
      settledAt: p.settledAt,
    }));
  }

  async getAdminStats() {
    const [userCount] = await drizzleDb.select({ count: count() }).from(users);
    const [callCount] = await drizzleDb.select({ count: count() }).from(callSessions);
    const [paymentCount] = await drizzleDb.select({ count: count() }).from(payments);

    // Payment status breakdown
    const paymentsByStatus = await drizzleDb
      .select({
        status: payments.status,
        count: count(),
      })
      .from(payments)
      .groupBy(payments.status);

    // Call status breakdown
    const callsByStatus = await drizzleDb
      .select({
        status: callSessions.status,
        count: count(),
      })
      .from(callSessions)
      .groupBy(callSessions.status);

    // GMV = total of all payments (money flowing through the platform)
    const [gmvResult] = await drizzleDb
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments);

    // GMV of forwarded payments (completed calls)
    const [forwardedGmv] = await drizzleDb
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "FORWARDED"));

    // GMV of refunded payments  
    const [refundedGmv] = await drizzleDb
      .select({
        total: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(eq(payments.status, "REFUNDED"));

    // Count of refunded payments (for anti-spam fee calculation)
    const [refundedCount] = await drizzleDb
      .select({ count: count() })
      .from(payments)
      .where(eq(payments.status, "REFUNDED"));

    // Fee constants imported from config.ts
    // Revenue calculation:
    // - For forwarded: 10% of the payment amount
    // - For refunded: fixed anti-spam fee per refund
    const forwardedRevenue = parseFloat(forwardedGmv?.total || "0") * PLATFORM_FEE_PERCENT;
    const refundedRevenue = (refundedCount?.count || 0) * ANTI_SPAM_FEE;
    const totalRevenue = forwardedRevenue + refundedRevenue;

    return {
      totalUsers: userCount?.count || 0,
      totalCalls: callCount?.count || 0,
      totalPayments: paymentCount?.count || 0,
      gmv: gmvResult?.total || "0",
      revenue: totalRevenue.toFixed(2),
      forwardedGmv: forwardedGmv?.total || "0",
      refundedGmv: refundedGmv?.total || "0",
      paymentsByStatus: paymentsByStatus.reduce((acc, p) => {
        acc[p.status || "UNKNOWN"] = p.count;
        return acc;
      }, {} as Record<string, number>),
      callsByStatus: callsByStatus.reduce((acc, c) => {
        acc[c.status || "UNKNOWN"] = c.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const db = new PostgresDB();
