// src/contract.ts
import abi from './abis/Atmofi.json';

export const atmofiContract = {
  address: '0x48f9029ea6AB5202eA95B0b191a524f473487382', // <-- PASTE YOUR SEPOLIA ADDRESS
  abi: abi.abi,
} as const;