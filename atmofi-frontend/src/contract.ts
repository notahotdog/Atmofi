// src/contract.ts
import abi from './abis/Atmofi.json';

export const atmofiContract = {
  address: '0x304B7558492Df1288674E910c7354ea9d61DedD5', // <-- PASTE YOUR SEPOLIA ADDRESS
  abi: abi.abi,
} as const;