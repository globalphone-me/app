import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signCallToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetPhoneId } = body;

    if (!targetPhoneId) {
      return NextResponse.json(
        { error: "Target Phone ID required" },
        { status: 400 },
      );
    }

    // 1. Verify the person exists in our "DB"
    const user = db.getByPhoneId(targetPhoneId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Generate the "Proof of Payment" Token (JWT)
    // This token allows the user to make ONE call to this specific phoneId
    const token = signCallToken(targetPhoneId);

    // 3. Return the credentials
    return NextResponse.json({
      status: "success",
      phoneId: targetPhoneId,
      token: token,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
