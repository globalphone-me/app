import { signSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { CHAIN } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support both MiniKit payload format (World App) and standard SIWE format
    let message: string;
    let signature: `0x${string}`;
    let address: `0x${string}`;
    let nonce: string;

    if (body.payload && body.payload.status === "success") {
      // MiniKit/World App format
      message = body.payload.message;
      signature = body.payload.signature as `0x${string}`;
      address = body.payload.address as `0x${string}`;
      nonce = body.nonce;
    } else if (body.message && body.signature) {
      // Standard SIWE format (from auth-handler)
      message = body.message;
      signature = body.signature as `0x${string}`;
      nonce = body.nonce;

      // Extract address from the SIWE message
      // The message format includes "0x..." address on the second line
      const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
      if (!addressMatch) {
        return NextResponse.json({ error: "Could not extract address from message" }, { status: 400 });
      }
      address = addressMatch[0] as `0x${string}`;
    } else {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Get the stored nonce from cookie
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get("siwe-nonce")?.value;

    if (!storedNonce || storedNonce !== nonce) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 400 },
      );
    }

    // Create public client to verify signature (supports ERC-1271 for smart accounts)
    const client = createPublicClient({ chain: CHAIN, transport: http() });

    // Verify the SIWE message signature
    const isValid = await client.verifySiweMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Clear the used nonce
    cookieStore.delete("siwe-nonce");

    // Store wallet address cookie
    cookieStore.set("wallet-address", address, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Generate JWT session token
    const token = signSessionToken(address);

    // Set session cookie
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("SIWE verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
