// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const priceFeedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  
  // Use the giant number from your screenshot, as a string
  const vrfSubscriptionId = "101309947740119598071184277880655775489433378597868310659622962938729374925091"; 

  // --- Step 1: Deploy the contract ---
  console.log("Deploying Atmofi contract...");
  const atmofi = await ethers.deployContract("Atmofi", [priceFeedAddress]);
  await atmofi.waitForDeployment();
  const contractAddress = await atmofi.getAddress();
  console.log(`\n✅ Atmofi contract deployed to: ${contractAddress}`);

  // --- Step 2: Call the `setSubscriptionId` function ---
  console.log(`\nSetting VRF Subscription ID...`);
  const tx = await atmofi.setSubscriptionId(vrfSubscriptionId);
  await tx.wait();
  console.log("✅ Subscription ID has been set successfully!");
  console.log("Reminder: Add this new contract address as a consumer on your VRF Subscription page.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});