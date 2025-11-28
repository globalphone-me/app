import { base, baseSepolia, mainnet, worldchain } from "wagmi/chains";

// Configure the blockchain network
// Change this variable to switch to a different chain
export const CHAIN = base;

// Mainnet is used for ENS name resolution
export const MAINNET = mainnet;

// World Chain - optimized for World App mini apps
export const WORLDCHAIN = worldchain;

// Payment recipient address (whitelisted in World Developer Portal)
export const PAYMENT_RECIPIENT_ADDRESS =
  "0xbEef6020C17Ea181A117E9504923358619594aA6";

// USDC token address on Worldchain
// export const USDC_TOKEN_ADDRESS = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88";
export const USDC_TOKEN_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1";
