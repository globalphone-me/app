import { NextResponse } from "next/server";
import Twilio from "twilio";

export async function GET() {
  // standard twilio setup
  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Create a random identity for this browser session
  const identity = "user_" + Math.random().toString(36).substring(7);

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
    incomingAllow: false, // We only make calls
  });

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity },
  );

  token.addGrant(voiceGrant);

  return NextResponse.json({ token: token.toJwt() });
}
