import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, verifyMessage } from "viem";
import { signSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { CHAIN } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const { address, signature, message } = await req.json();

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    // Create a public client to verify the signature
    const publicClient = createPublicClient({
      chain: CHAIN,
      transport: http(),
    });

    // Verify the signature (supports Smart Accounts via ERC-1271)
    const isValid = await publicClient.verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Generate JWT
    const token = signSessionToken(address);
    const cookieStore = await cookies();

    // Set Secure Cookie
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
