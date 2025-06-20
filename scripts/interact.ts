// scripts/interact.ts

import { ethers } from "hardhat";

async function main() {
  // --- CONFIGURATION ---
  const atmofiContractAddress = "0x304B7558492Df1288674E910c7354ea9d61DedD5"; // <-- PASTE YOUR ADDRESS HERE
  const [deployer] = await ethers.getSigners(); // This will be our "insurer"

  // We'll create a new random wallet to act as the "beverage company"
  const beverageCompany = ethers.Wallet.createRandom();
  console.log(`Using Insurer address: ${deployer.address}`);
  console.log(`Using Beverage Company address: ${beverageCompany.address}`);

  // Contract Terms
  const premiumAmount = ethers.parseEther("0.001"); // 0.001 Sepolia ETH
  const payoutAmount = ethers.parseEther("0.005"); // 0.005 Sepolia ETH
  const durationSeconds = 120; // 2 minutes for a quick test

  // --- SCRIPT LOGIC ---

  // 1. Connect to the already deployed Atmofi contract
  console.log(`\nConnecting to Atmofi contract at ${atmofiContractAddress}...`);
  const atmofi = await ethers.getContractAt("Atmofi", atmofiContractAddress);
  console.log("Successfully connected!");

  // 2. Initialize a new derivative contract
  // To determine a strike price, let's first check the current oracle price
  const feedAddress = await atmofi.priceFeedContractAddress();
  const priceFeed = await ethers.getContractAt("AggregatorV3Interface", feedAddress);
  const latestRound = await priceFeed.latestRoundData();
  const currentPrice = Number(latestRound.answer) / 10**8;
  console.log(`\nCurrent live ETH/USD price from Chainlink: $${currentPrice.toFixed(2)}`);

  // Let's set a strike price $10 below the current price to test a "Beverage Company wins" scenario
  const strikeTemperature = Math.floor(currentPrice - 10);
  console.log(`Initializing a new derivative with a strike price of $${strikeTemperature}...`);

  const tx1 = await atmofi.initialize(
    beverageCompany.address,
    payoutAmount,
    strikeTemperature,
    durationSeconds,
    { value: premiumAmount }
  );
  await tx1.wait(); // Wait for the transaction to be mined
  const derivativeId = await atmofi.nextDerivativeId() - 1n;
  console.log(`Derivative #${derivativeId} created! Transaction hash: ${tx1.hash}`);

  // 3. Fund the contract as the insurer
  console.log(`\nFunding contract #${derivativeId} with ${ethers.formatEther(payoutAmount)} ETH as collateral...`);
  const tx2 = await atmofi.fundInsurer(derivativeId, { value: payoutAmount });
  await tx2.wait();
  console.log(`Contract #${derivativeId} is now fully funded and active! Transaction hash: ${tx2.hash}`);

  // 4. Settle the contract
  console.log(`\nWaiting ${durationSeconds} seconds for the contract period to end...`);
  await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));
  
  console.log("Contract period has ended. Attempting to settle...");
  const tx3 = await atmofi.settleContract(derivativeId);
  await tx3.wait();
  console.log(`Contract #${derivativeId} has been settled! Transaction hash: ${tx3.hash}`);
  
  // You can verify the outcome on the Sepolia Etherscan block explorer
  console.log(`\nCheck Etherscan for contract ${atmofiContractAddress} to see internal transactions.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});