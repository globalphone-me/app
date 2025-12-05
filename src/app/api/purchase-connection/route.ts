import { NextRequest, NextResponse } from "next/server";
import { RouteConfig, withX402 } from "@yssf_io/x402-next";
import { db } from "@/lib/db";
import { signCallToken } from "@/lib/auth";
import { facilitator } from "@coinbase/x402";

const PAY_TO_ADDRESS = process.env.NEXT_PUBLIC_WALLET_ADDRESS as `0x${string}`;

const handler = async (request: NextRequest): Promise<NextResponse> => {
  try {
    const body = await request.json();
    const { callerAddress, targetAddress } = body;

    if (!targetAddress) {
      return NextResponse.json(
        { error: "Target Address required" },
        { status: 400 },
      );
    }

    // TODO: validate it's the right callerAddress
    if (!callerAddress) {
      return NextResponse.json(
        { error: "Caller Address required" },
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
        {
          error:
            "This user only accepts calls from verified humans. Please use World App.",
        },
        { status: 403 },
      );
    }

    const paymentId = crypto.randomUUID();

    await db.createCallSession(
      paymentId,
      callerAddress,
      user.phoneId,
      user.price,
    );

    const token = signCallToken(user.phoneId, paymentId);

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

const getRouteConfig = async (req: NextRequest): Promise<RouteConfig> => {
  const clonedReq = req.clone();
  const { targetAddress } = await clonedReq.json();

  const user = await db.getByAddress(targetAddress);

  return {
    price: user?.price || "1000000",
    network: "base",
    config: {
      description: "Purchase a secure phone connection",
    },
  };
};

export const POST = withX402(
  handler,
  PAY_TO_ADDRESS,
  getRouteConfig,
  facilitator,
  {
    appName: "Hackathon Voice App",
  },
);

// export const POST = withX402(
//   handler,
//   PAY_TO_ADDRESS,
//   {
//     price: "1.1",
//     network: "base-sepolia",
//     config: {
//       description: "Purchase a secure phone connection",
//     },
//   },
//   {
//     url: FACILITATOR_URL,
//   },
//   {
//     appName: "Hackathon Voice App",
//   },
// );
