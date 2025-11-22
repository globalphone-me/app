import crypto from "crypto";

export interface Callee {
  id: string;
  name: string;
  realPhoneNumber: string;
  phoneId: string;
  address: string; // New field
}

class InMemoryDB {
  // Changed Map key to store by "address" instead of "phoneId" for easier lookup
  private users: Map<string, Callee> = new Map();

  constructor() {
    // SEED: We use the exact address from your MOCK_USERS
    this.addUser(
      "user.eth",
      process.env.NEXT_PUBLIC_TO_NUMBER || "",
      "0x1234567890abcdef1234567890abcdef12345678",
    );
  }

  private generatePhoneId(realNumber: string): string {
    return crypto
      .createHash("sha256")
      .update(realNumber)
      .digest("hex")
      .substring(0, 12);
  }

  addUser(name: string, realPhoneNumber: string, address: string) {
    const phoneId = this.generatePhoneId(realPhoneNumber);
    const user: Callee = {
      id: Math.random().toString(36).substring(7),
      name,
      realPhoneNumber,
      phoneId,
      address: address.toLowerCase(), // Store lowercase for safety
    };

    this.users.set(user.address, user);
    return user;
  }

  // New method for the Purchase Route
  getByAddress(address: string): Callee | undefined {
    return this.users.get(address.toLowerCase());
  }

  // Helper for the Voice API (which might still need ID lookup later)
  getByPhoneId(phoneId: string): Callee | undefined {
    for (const user of this.users.values()) {
      if (user.phoneId === phoneId) return user;
    }
    return undefined;
  }
}

export const db = new InMemoryDB();
