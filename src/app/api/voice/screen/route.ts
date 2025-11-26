import { NextResponse } from "next/server";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentSid = searchParams.get("parentSid"); // Pass this along

  const twiml = new VoiceResponse();

  // Ask the Human to press 1
  const gather = twiml.gather({
    action: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/connect?parentSid=${parentSid}`,
    numDigits: 1,
    timeout: 10, // Wait 10s for input. If Voicemail, this times out.
  });

  gather.say("You have a paid call from Global Phone. Press 1 to accept.");

  // If they don't press 1 (e.g. Voicemail), we hang up.
  // Since we hang up here, the "Bridge" never completes.
  // The Caller hears ringing, then "Call Failed". Privacy Saved.
  twiml.hangup();

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
