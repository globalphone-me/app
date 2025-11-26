import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = formData.get("CallSid") as string; // Parent CallSid

  // Check the session state in DB
  const session = await db.getSessionBySid(callSid);

  console.log("------------------------------------------------");
  if (session?.status === "VERIFIED") {
    console.log(
      `✅ SUCCESS: Human answered. Forwarding Payment ${session.paymentId}`,
    );
    // TODO: Trigger Payout Script
  } else {
    console.log(
      `🛡️ PRIVACY SHIELD: Call failed or Voicemail blocked. Refunding Payment ${session?.paymentId}`,
    );
    // TODO: Trigger Refund Script
  }
  console.log("------------------------------------------------");

  return new NextResponse("<Response/>", {
    headers: { "Content-Type": "text/xml" },
  });
}
