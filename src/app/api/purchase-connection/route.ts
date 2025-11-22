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

    const user = await db.getByAddress(targetAddress);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate token using the retrieved phoneId
    const token = signCallToken(user.phoneId);

    return NextResponse.json({
      status: "success",
      phoneId: user.phoneId,
      token: token,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
