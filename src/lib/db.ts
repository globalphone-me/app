import Redis from "ioredis";
import crypto from "crypto";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export interface CallSession {
  id: string;
  paymentId: string;
  status: "PENDING" | "VERIFIED" | "COMPLETED" | "FAILED";
  twilioCallSid?: string;
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

class RedisDB {
  private generatePhoneId(realNumber: string): string {
    return crypto
      .createHash("sha256")
      .update(realNumber)
      .digest("hex")
      .substring(0, 12);
  }

  async addUser(
    name: string,
    realPhoneNumber: string,
    address: string,
    price: string,
    onlyHumans: boolean,
    rules: any[],
  ) {
    const phoneId = this.generatePhoneId(realPhoneNumber);
    const lowerAddr = address.toLowerCase();

    const user: Callee = {
      id: crypto.randomUUID(),
      name,
      realPhoneNumber,
      phoneId,
      address: lowerAddr,
      price,
      onlyHumans,
      rules,
    };

    const data = JSON.stringify(user);
    await redis.set(`user:addr:${lowerAddr}`, data);
    await redis.set(`user:pid:${phoneId}`, data);
    await redis.sadd("directory:users", lowerAddr);

    return user;
  }

  async getByAddress(address: string): Promise<Callee | null> {
    const data = await redis.get(`user:addr:${address.toLowerCase()}`);
    return data ? JSON.parse(data) : null;
  }

  async getByPhoneId(phoneId: string): Promise<Callee | null> {
    const data = await redis.get(`user:pid:${phoneId}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllUsers(): Promise<Callee[]> {
    const addresses = await redis.smembers("directory:users");
    if (addresses.length === 0) return [];
    const pipeline = redis.pipeline();
    addresses.forEach((addr) => pipeline.get(`user:addr:${addr}`));
    const results = await pipeline.exec();
    const users: Callee[] = [];
    results?.forEach(([err, result]) => {
      if (!err && result && typeof result === "string")
        users.push(JSON.parse(result));
    });
    return users;
  }

  // --- NEW SESSION METHODS ---

  // 1. Start a session (When payment is made)
  async createCallSession(paymentId: string) {
    const session: CallSession = {
      id: crypto.randomUUID(),
      paymentId,
      status: "PENDING",
    };
    await redis.set(`session:${paymentId}`, JSON.stringify(session));
    return session;
  }

  // 2. Link Twilio CallSid (Called when call starts)
  async linkCallSid(paymentId: string, callSid: string) {
    const data = await redis.get(`session:${paymentId}`);
    if (!data) return;
    const session = JSON.parse(data);
    session.twilioCallSid = callSid;

    await redis.set(`session:${paymentId}`, JSON.stringify(session));
    // Index by SID for fast lookup in webhooks
    await redis.set(`session:sid:${callSid}`, JSON.stringify(session));
  }

  // 3. Mark as Verified (Called when human presses 1)
  async markSessionVerified(callSid: string) {
    const data = await redis.get(`session:sid:${callSid}`);
    if (!data) return;
    const session = JSON.parse(data);
    session.status = "VERIFIED";

    await redis.set(`session:sid:${callSid}`, JSON.stringify(session));
    await redis.set(`session:${session.paymentId}`, JSON.stringify(session));
  }

  // 2. Link Twilio CallSid (When call starts)
  async updateSessionWithCallSid(paymentId: string, callSid: string) {
    const data = await redis.get(`session:payment:${paymentId}`);
    if (!data) return;

    const session = JSON.parse(data);
    session.twilioCallSid = callSid;

    await redis.set(`session:payment:${paymentId}`, JSON.stringify(session));
    // Also index by CallSid for the webhook
    await redis.set(`session:sid:${callSid}`, JSON.stringify(session));
  }

  // 4. Get Session by SID
  async getSessionBySid(callSid: string): Promise<CallSession | null> {
    const data = await redis.get(`session:sid:${callSid}`);
    return data ? JSON.parse(data) : null;
  }

  // 3. Finalize (When call ends)
  async finalizeCallSession(
    callSid: string,
    status: CallSession["status"],
    duration: number,
  ) {
    const data = await redis.get(`session:sid:${callSid}`);
    if (!data) return null;

    const session = JSON.parse(data);
    session.status = status;
    session.duration = duration;

    await redis.set(`session:sid:${callSid}`, JSON.stringify(session));
    await redis.set(
      `session:payment:${session.paymentId}`,
      JSON.stringify(session),
    );

    return session;
  }
}

export const db = new RedisDB();
