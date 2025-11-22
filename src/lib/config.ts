import { baseSepolia, mainnet, worldchain } from 'wagmi/chains';

// Configure the blockchain network
// Change this variable to switch to a different chain
export const CHAIN = baseSepolia;

// Mainnet is used for ENS name resolution
export const MAINNET = mainnet;

// World Chain - optimized for World App mini apps
export const WORLDCHAIN = worldchain;

// Payment recipient address (whitelisted in World Developer Portal)
export const PAYMENT_RECIPIENT_ADDRESS = '0xbf906ef7c6020d0ed813d578524ed8c09d3311df';

// USDC token address on Worldchain
export const USDC_TOKEN_ADDRESS = '0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88';
