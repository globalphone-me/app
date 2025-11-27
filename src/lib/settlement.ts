import { walletClient } from "./wallet";
import { parseUnits, formatUnits, encodeFunctionData, erc20Abi } from "viem";
import { db, CallSession } from "./db"; // Assuming you updated db.ts with CallSession
import { CHAIN } from "./config";

// USDC Contract Addresses
const USDC_ADDRESS = {
  [CHAIN.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

// Configuration
const USDC_CONTRACT = USDC_ADDRESS[CHAIN.id];
const CONNECTION_FEE = 0.1; // 10 cents Spam Tax
const PLATFORM_FEE_PERCENT = 0.1; // 10%

export async function settleCall(session: CallSession) {
  try {
    const price = parseFloat(session.price);
    const callerWallet = session.callerAddress; // Make sure your purchase route saves this!

    // We need to look up the Callee's wallet using their phoneId
    // (Or you can store calleeWallet directly on the session to save a lookup)
    const callee = await db.getByPhoneId(session.calleePhoneId);
    if (!callee) throw new Error("Callee not found for settlement");

    console.log(
      `💰 SETTLING Session ${session.id} | Status: ${session.status} | Price: ${price} USDC`,
    );

    // SCENARIO A: CALL FAILED / VOICEMAIL (Refund)
    if (session.status === "FAILED" || session.status === "VOICEMAIL") {
      const refundAmount = price - CONNECTION_FEE;

      if (refundAmount <= 0) {
        console.log(
          "⚠️ Refund amount is 0 or negative (Connection Fee consumed entire price). No refund sent.",
        );
        return;
      }

      console.log(
        `💸 REFUNDING ${refundAmount} USDC to Caller (${callerWallet})`,
      );
      await sendUSDC(callerWallet, refundAmount);
    }

    // SCENARIO B: SUCCESS (Payout)
    else if (session.status === "VERIFIED") {
      const platformFee = price * PLATFORM_FEE_PERCENT;
      const payoutAmount = price - platformFee;

      console.log(
        `🤑 PAYING ${payoutAmount} USDC to Callee (${callee.address})`,
      );
      await sendUSDC(callee.address, payoutAmount);

      console.log(`🏦 PLATFORM KEEPS ${platformFee} USDC`);
    }
  } catch (error) {
    console.error("❌ SETTLEMENT FAILED:", error);
    // In production, you would log this to a "FailedPayouts" DB table for manual review
  }
}

// Helper to execute the blockchain transaction
async function sendUSDC(to: string, amount: number) {
  // USDC has 6 decimals
  const amountWei = parseUnits(amount.toString(), 6);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to as `0x${string}`, amountWei],
  });

  const hash = await walletClient.sendTransaction({
    to: USDC_CONTRACT as `0x${string}`,
    data: data,
    // Gas estimation is handled automatically by Viem
  });

  console.log(`🔗 Tx Sent: ${hash}`);
  return hash;
}
