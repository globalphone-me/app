import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signCallToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetAddress } = body;

    if (!targetAddress) {
      return NextResponse.json(
        { error: "Target Address required" },
        { status: 400 },
      );
    }

    // 1. Verify user exists by Address
    const user = db.getByAddress(targetAddress);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Generate token (We still sign the phoneId, because that's what Twilio needs to connect)
    const token = signCallToken(user.phoneId);

    // 3. Return credentials
    return NextResponse.json({
      status: "success",
      phoneId: user.phoneId, // We return the hidden ID only AFTER payment
      token: token,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
