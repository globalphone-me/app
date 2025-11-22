import { baseSepolia, mainnet, worldchain } from 'wagmi/chains';

// Configure the blockchain network
// Change this variable to switch to a different chain
export const CHAIN = baseSepolia;

// Mainnet is used for ENS name resolution
export const MAINNET = mainnet;

// World Chain - optimized for World App mini apps
export const WORLDCHAIN = worldchain;
