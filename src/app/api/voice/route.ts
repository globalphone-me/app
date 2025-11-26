import { NextResponse } from "next/server";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { verifyCallToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();

  const token = formData.get("token") as string;
  const targetPhoneId = formData.get("phoneId") as string;
  const callSid = formData.get("CallSid") as string;

  const twiml = new VoiceResponse();

  // 1. Verify JWT
  const payload = verifyCallToken(token);

  if (!payload || payload.phoneId !== targetPhoneId) {
    twiml.say("Security check failed.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // 2. Lookup User (UPDATED: Now using await)
  const user = await db.getByPhoneId(targetPhoneId);

  if (!user) {
    twiml.say("User unavailable.");
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  await db.linkCallSid(payload.paymentId, callSid);

  // 3. Connect
  const dial = twiml.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER,
    answerOnBridge: false,

    action: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/status`,
    method: "POST",
    timeout: 20,
  });

  dial.number(
    {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/screen?parentSid=${callSid}`,
    },
    user.realPhoneNumber,
  );

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
