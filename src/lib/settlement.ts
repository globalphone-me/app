import { CHAIN, WORLDCHAIN, USDC_TOKEN_ADDRESS } from "./config";
import { walletClient, worldChainWalletClient } from "./wallet";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { db, CallSession } from "./db";
import { monitor } from "./monitor";

// USDC Contract Addresses
const USDC_ADDRESS = {
  [CHAIN.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [WORLDCHAIN.id]: USDC_TOKEN_ADDRESS,
};

// Configuration
const CONNECTION_FEE = 0.1; // 10 cents Spam Tax
const PLATFORM_FEE_PERCENT = 0.1; // 10%

export async function settleCall(session: CallSession) {
  try {
    const price = parseFloat(session.price);
    const callerWallet = session.callerAddress; // Make sure your purchase route saves this!
    const chainId = session.chainId || CHAIN.id; // Default to Base if not specified

    // We need to look up the Callee's wallet using their phoneId
    // (Or you can store calleeWallet directly on the session to save a lookup)
    const callee = await db.getByPhoneId(session.calleePhoneId);
    if (!callee) throw new Error("Callee not found for settlement");

    // Context: Set the user for this Sentry scope so the event is attributed to them
    monitor.setUser(callerWallet);

    console.log(
      `💰 SETTLING Session ${session.id} | Status: ${session.status} | Price: ${price} USDC | Chain: ${chainId}`,
    );

    // SCENARIO A: CALL FAILED / VOICEMAIL (Refund)
    if (session.status === "FAILED" || session.status === "VOICEMAIL") {
      const refundAmount = price - CONNECTION_FEE;

      if (refundAmount <= 0) {
        monitor.message(
          "⚠️ Refund amount is 0 or negative (Connection Fee consumed entire price). No refund sent.",
          { session }
        );
        return;
      }

      monitor.message(
        `💸 REFUNDING ${refundAmount} USDC to Caller (${callerWallet})`,
        { session, amount: refundAmount }
      );
      await sendUSDC(callerWallet, refundAmount, chainId);
    }

    // SCENARIO B: SUCCESS (Payout)
    else if (session.status === "VERIFIED") {
      const platformFee = price * PLATFORM_FEE_PERCENT;
      const payoutAmount = price - platformFee;

      monitor.message(
        `🤑 PAYING ${payoutAmount} USDC to Callee (${callee.address})`,
        { session, amount: payoutAmount, platformFee }
      );
      await sendUSDC(callee.address, payoutAmount, chainId);
    }
  } catch (error) {
    monitor.error("❌ SETTLEMENT FAILED:", { error, session });
    // In production, you would log this to a "FailedPayouts" DB table for manual review
  }
}

// Helper to execute the blockchain transaction
async function sendUSDC(to: string, amount: number, chainId: number) {
  // USDC has 6 decimals
  const amountWei = parseUnits(amount.toString(), 6);
  const usdcContract = USDC_ADDRESS[chainId as keyof typeof USDC_ADDRESS];

  if (!usdcContract) {
    throw new Error(`No USDC contract address for chain ${chainId}`);
  }

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to as `0x${string}`, amountWei],
  });

  if (chainId === WORLDCHAIN.id) {
    const hash = await worldChainWalletClient.sendTransaction({
      to: usdcContract as `0x${string}`,
      data: data,
      chain: null,
    });
    monitor.log(`🔗 Tx Sent: ${hash} on Chain ${chainId}`, { hash, chainId });
    return hash;
  } else {
    const hash = await walletClient.sendTransaction({
      to: usdcContract as `0x${string}`,
      data: data,
      chain: null,
    });
    monitor.log(`🔗 Tx Sent: ${hash} on Chain ${chainId}`, { hash, chainId });
    return hash;
  }
}
