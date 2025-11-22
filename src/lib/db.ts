import Redis from "ioredis";
import crypto from "crypto";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

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

  // Update signature to accept an options object or extra params
  async addUser(
    name: string,
    realPhoneNumber: string,
    address: string,
    price: string,
    onlyHumans: boolean, // <--- NEW
    rules: any[], // <--- NEW
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
      onlyHumans, // Save to object
      rules, // Save to object
    };

    const data = JSON.stringify(user);

    await redis.set(`user:addr:${lowerAddr}`, data);
    await redis.set(`user:pid:${phoneId}`, data);
    await redis.sadd("directory:users", lowerAddr);

    return user;
  }

  // ... (rest of methods getByAddress, getByPhoneId, getAllUsers remain the same)
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
}

export const db = new RedisDB();
