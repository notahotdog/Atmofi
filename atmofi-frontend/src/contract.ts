// src/contract.ts
import abi from './abis/Atmofi.json';

export const atmofiContract = {
  address: '0xCFAF56A61A2E892069FfDa71df2ed9F74eaA72aF', // <-- PASTE YOUR SEPOLIA ADDRESS
  abi: abi.abi,
} as const;