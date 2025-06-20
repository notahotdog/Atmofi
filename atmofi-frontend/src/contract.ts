// src/contract.ts
import abi from './abis/Atmofi.json';

export const atmofiContract = {
  address: '0x808585feAC7710A3E7bc06e3e52f061359F56E30', // <-- PASTE YOUR SEPOLIA ADDRESS
  abi: abi.abi,
} as const;