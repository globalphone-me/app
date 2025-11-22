import { NextResponse } from "next/server";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { verifyCallToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  console.log("Bro?");
  const formData = await request.formData();

  // 1. Extract the custom parameters we sent from the frontend
  // device.connect({ params: { phoneId, token } })
  const token = formData.get("token") as string;
  const targetPhoneId = formData.get("phoneId") as string;

  const twiml = new VoiceResponse();

  console.log(`📞 Incoming call request for ID: ${targetPhoneId}`);

  // 2. SECURITY: Verify the x402 JWT
  const payload = verifyCallToken(token);

  if (!payload) {
    console.error("❌ Voice Error: Invalid or expired token");
    twiml.say("Security check failed. Please pay again.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // 3. INTEGRITY: Ensure the token was issued for THIS specific phoneId
  if (payload.phoneId !== targetPhoneId) {
    console.error("❌ Voice Error: Token mismatch");
    twiml.say("Invalid connection parameters.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // 4. LOOKUP: Get the real number from the DB
  const user = db.getByPhoneId(targetPhoneId);
  if (!user) {
    console.error("❌ Voice Error: User not found in DB");
    twiml.say("The user is unavailable.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // 5. CONNECT
  const dial = twiml.dial({
    // CRITICAL: Use your Twilio/Verified Number to avoid blocking
    callerId: process.env.TWILIO_PHONE_NUMBER,
    answerOnBridge: true,
  });

  console.log({ phoneNumber: user.realPhoneNumber });
  // We dial the REAL number here. The frontend never sees this.
  dial.number(user.realPhoneNumber);

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
