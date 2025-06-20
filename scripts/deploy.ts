// scripts/deploy.ts

import { ethers } from "hardhat";

async function main() {
  // The live address of the SOL/USD price feed on the Sepolia testnet
  const chainlinkFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  console.log("Deploying Atmofi contract...");

  const atmofi = await ethers.deployContract("Atmofi", [chainlinkFeedAddress]);

  await atmofi.waitForDeployment();

  console.log(`Atmofi contract deployed to: ${await atmofi.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
