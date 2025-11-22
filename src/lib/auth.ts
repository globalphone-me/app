// lib/auth.ts
import jwt from "jsonwebtoken";

const SECRET_KEY =
  process.env.CALL_JWT_SECRET || "hackathon-secret-key-change-me";

export interface CallPayload {
  phoneId: string;
  timestamp: number;
}

// 1. Generate a token (Used after Payment is confirmed)
export function signCallToken(phoneId: string): string {
  return jwt.sign(
    { phoneId, timestamp: Date.now() },
    SECRET_KEY,
    { expiresIn: "5m" }, // Token only valid for 5 minutes
  );
}

// 2. Verify the token (Used inside the Twilio Webhook)
export function verifyCallToken(token: string): CallPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as CallPayload;
    return decoded;
  } catch (error) {
    console.error("Invalid Call Token:", error);
    return null;
  }
}
