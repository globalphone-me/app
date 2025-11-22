// A simple interface for our User
export interface Callee {
  id: string;
  name: string;
  realPhoneNumber: string; // The sensitive data (+33...)
  phoneId: string; // The public hash
}

class InMemoryDB {
  private users: Map<string, Callee> = new Map();

  constructor() {
    // Seed with a test user (Your setup from the previous step)
    this.addUser("Support Agent", process.env.NEXT_PUBLIC_TO_NUMBER || "");
  }

  // Helper to create a consistent hash (PhoneId) from a real number
  private generatePhoneId(realNumber: string): string {
    return require("crypto")
      .createHash("sha256")
      .update(realNumber)
      .digest("hex")
      .substring(0, 12);
  }

  addUser(name: string, realPhoneNumber: string) {
    const phoneId = this.generatePhoneId(realPhoneNumber);
    const user: Callee = {
      id: Math.random().toString(36).substring(7),
      name,
      realPhoneNumber,
      phoneId,
    };

    // We map by phoneId for easy lookup during the call
    this.users.set(phoneId, user);
    return user;
  }

  getByPhoneId(phoneId: string): Callee | undefined {
    return this.users.get(phoneId);
  }

  // For the frontend to list people
  getAll() {
    return Array.from(this.users.values()).map((u) => ({
      name: u.name,
      phoneId: u.phoneId, // We DO NOT return the real number here
    }));
  }
}

// Export as a singleton
export const db = new InMemoryDB();
