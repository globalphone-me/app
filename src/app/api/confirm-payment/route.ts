import { NextRequest, NextResponse } from "next/server";
import { MiniAppPaymentSuccessPayload } from "@worldcoin/minikit-js";
import { SignJWT } from "jose";
import { paymentReferences } from "@/lib/payment-store";
import { db } from "@/lib/db";
import { signCallToken } from "@/lib/auth";

interface ConfirmPaymentRequest {
  payload: MiniAppPaymentSuccessPayload;
}

interface Transaction {
  reference: string;
  transaction_hash: string;
  transaction_status: "pending" | "mined" | "failed";
  from: string;
  chain: string;
  timestamp: string;
  token_amount: string;
  token: string;
  to: string;
  app_id: string;
}

export async function POST(req: NextRequest) {
  try {
    const { payload } = (await req.json()) as ConfirmPaymentRequest;

    if (!payload || !payload.reference || !payload.transaction_id) {
      return NextResponse.json(
        { success: false, error: "Invalid payload" },
        { status: 400 },
      );
    }

    console.log("[DEBUG] Looking for payment reference:", payload.reference);
    console.log("[DEBUG] Total references in store:", paymentReferences.size);
    console.log(
      "[DEBUG] Available references:",
      Array.from(paymentReferences.keys()),
    );

    // Get the stored reference from our database/memory
    const storedReference = paymentReferences.get(payload.reference);

    if (!storedReference) {
      return NextResponse.json(
        { success: false, error: "Payment reference not found" },
        { status: 404 },
      );
    }

    // Verify the recipient still exists and check their verification requirements
    const recipient = await db.getByAddress(storedReference.recipientAddress);

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: "Recipient not found" },
        { status: 404 },
      );
    }

    // If recipient requires humans only, verify that a nullifier was provided
    if (recipient.onlyHumans && !storedReference.verifiedNullifier) {
      return NextResponse.json(
        {
          success: false,
          error: "This user only accepts calls from verified humans",
        },
        { status: 403 },
      );
    }

    // Log verification status
    if (storedReference.verifiedNullifier) {
      console.log(
        "[DEBUG] Payment linked to verification:",
        storedReference.verifiedNullifier,
      );
    } else {
      console.log(
        "[DEBUG] Payment does not require verification (recipient allows non-verified callers)",
      );
    }

    // Verify the payment with World Developer Portal API
    const appId = process.env.APP_ID;
    const devPortalApiKey = process.env.DEV_PORTAL_API_KEY;

    if (!appId || !devPortalApiKey) {
      console.error(
        "Missing APP_ID or DEV_PORTAL_API_KEY environment variables",
      );
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transaction_id}?app_id=${appId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${devPortalApiKey}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Failed to verify transaction with Developer Portal");
      return NextResponse.json(
        { success: false, error: "Failed to verify payment" },
        { status: 500 },
      );
    }

    const transaction: Transaction = await response.json();

    // Verify the transaction matches our stored reference and isn't failed
    if (
      transaction.reference === payload.reference &&
      transaction.transaction_status !== "failed"
    ) {
      // Verify the payment amount matches the recipient's price
      const expectedAmount = parseFloat(recipient.price);
      const paidAmount = parseFloat(transaction.token_amount);

      console.log("[DEBUG] Expected amount:", expectedAmount);
      console.log("[DEBUG] Paid amount:", paidAmount);

      if (paidAmount < expectedAmount) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient payment. Expected ${expectedAmount} USDC, received ${paidAmount} USDC`,
          },
          { status: 400 },
        );
      }

      const paymentId = crypto.randomUUID();

      await db.createCallSession(
        paymentId,
        payload.from,
        recipient.phoneId,
        recipient.price,
      );

      const token = signCallToken(recipient.phoneId, paymentId);

      return NextResponse.json({
        success: true,
        token: token,
        phoneId: recipient.phoneId,
        transaction: {
          status: transaction.transaction_status,
          hash: transaction.transaction_hash,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            transaction.transaction_status === "failed"
              ? "Transaction failed"
              : "Transaction reference mismatch",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to confirm payment" },
      { status: 500 },
    );
  }
}
