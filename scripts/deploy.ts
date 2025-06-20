// scripts/deploy.ts

import { ethers as hreEthers } from "hardhat";

async function main() {
  const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  // --- THIS IS THE FIX ---
  // Keep the giant ID from the UI, but store it as a string
  const vrfSubscriptionId = "101309947740119598071184277880655775489433378597868310659622962938729374925091"; 

  console.log("Deploying Atmofi contract with the following parameters:");
  console.log(`- Price Feed Address: ${priceFeedAddress}`);
  console.log(`- VRF Subscription ID: ${vrfSubscriptionId}`);
  
  const atmofi = await hreEthers.deployContract("Atmofi", [priceFeedAddress, vrfSubscriptionId]);

  await atmofi.waitForDeployment();

  console.log(`\n✅ Atmofi contract deployed to: ${await atmofi.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});