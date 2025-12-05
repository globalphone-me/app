import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settleCall } from "@/lib/settlement";
import VoiceResponse from "twilio/lib/twiml/VoiceResponse";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const dialCallStatus = formData.get("DialCallStatus") as string;
    const duration = parseInt(
      (formData.get("DialCallDuration") as string) || "0",
    );

    console.log(
      `[Status] Call ${callSid} ended. TwilioStatus: ${dialCallStatus}`,
    );

    // 1. Finalize Session in DB
    // We map Twilio status to our internal status logic
    // If it was already 'VERIFIED' (Human pressed 1), it stays VERIFIED.
    // Otherwise, if completed but not verified -> VOICEMAIL.
    // Otherwise -> FAILED.
    let finalStatus: any = "FAILED";

    if (dialCallStatus === "completed") finalStatus = "VOICEMAIL"; // Default assumption unless verified

    const session = await db.finalizeCallSession(
      callSid,
      finalStatus,
      duration,
    );

    // 2. Trigger Settlement
    if (session) {
      // Fire and forget (don't block the webhook response)
      settleCall(session).catch((e) => console.error("Settlement error:", e));
    } else {
      console.error("Session not found for settlement");
    }

    // 3. Kill Browser Leg
    const twiml = new VoiceResponse();
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse("Error", { status: 500 });
  }
}
