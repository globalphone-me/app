import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "x402-next";
import { db } from "@/lib/db";
import { signCallToken } from "@/lib/auth";

const PAY_TO_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`;
const FACILITATOR_URL = "https://x402.org/facilitator";

// FIX: Added ': Promise<NextResponse>' to prevent strict type inference
const handler = async (request: NextRequest): Promise<NextResponse> => {
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

    // Block x402 calls to users who only accept verified humans
    if (user.onlyHumans) {
      return NextResponse.json(
        { error: "This user only accepts calls from verified humans. Please use World App." },
        { status: 403 }
      );
    }

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
};

export const POST = withX402(
  handler,
  PAY_TO_ADDRESS,
  {
    price: "0.05",
    network: "base-sepolia",
    config: {
      description: "Purchase a secure phone connection",
    },
  },
  {
    url: FACILITATOR_URL,
  },
  {
    appName: "Hackathon Voice App",
  },
);
