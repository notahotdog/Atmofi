// src/contract.ts
import abi from './abis/Atmofi.json';

export const atmofiContract = {
  address: '0x88592a74EA11414cC58F0fdaD980a5088d446f80', // <-- PASTE YOUR SEPOLIA ADDRESS
  abi: abi.abi,
} as const;