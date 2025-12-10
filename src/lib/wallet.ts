import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN, WORLDCHAIN } from "./config";

// Ensure the private key exists
if (!process.env.PLATFORM_PRIVATE_KEY) {
  throw new Error("PLATFORM_PRIVATE_KEY is missing in .env");
}

const account = privateKeyToAccount(
  process.env.PLATFORM_PRIVATE_KEY as `0x${string}`,
);

export const walletClient = createWalletClient({
  account,
  chain: CHAIN,
  transport: http(),
}).extend(publicActions);

export const worldChainWalletClient = createWalletClient({
  account,
  chain: WORLDCHAIN,
  transport: http(),
}).extend(publicActions);
