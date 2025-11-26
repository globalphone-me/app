import { NextResponse } from "next/server";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentSid = searchParams.get("parentSid");

  const formData = await request.formData();
  const digits = formData.get("Digits") as string;

  const twiml = new VoiceResponse();

  if (digits === "1" && parentSid) {
    // 1. Mark Session as VERIFIED (Human Confirmed)
    await db.markSessionVerified(parentSid);

    // 2. Connect Audio
    // Returning empty response in a <Number url> callback tells Twilio
    // "Screening complete, bridge the audio now".
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Wrong digit? Hangup.
  twiml.hangup();
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}
