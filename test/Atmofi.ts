import { expect } from "chai";
import { ethers } from "hardhat";
import { Atmofi } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Atmofi Contract", function () {
  // We define variables that will be used across our tests
  let atmofi: Atmofi;
  let insurer: HardhatEthersSigner;
  let beverageCompany: HardhatEthersSigner;
  let chainlinkAggregatorMock: any;
  const derivativeId = 0;

  // Contract terms
  const premiumAmount = ethers.parseEther("1.0"); // 1 ETH premium
  const payoutAmount = ethers.parseEther("10.0"); // 10 ETH payout
  const strikeTemperature = 27; // Strike at 27 degrees
  const durationSeconds = 60 * 60; // 1 hour

  // This `beforeEach` block runs before each "it" test block
  beforeEach(async function () {
    // Get signers (wallets) for our parties
    [insurer, beverageCompany] = await ethers.getSigners();

    // Deploy a mock Chainlink Aggregator contract for testing
    // This allows us to control the "temperature" in our tests
    const AggregatorMock = await ethers.getContractFactory("AggregatorV3InterfaceMock");
    // Let's say the current SOL/USD price is $30.12345678
    chainlinkAggregatorMock = await AggregatorMock.deploy(8, 3012345678);

    // Deploy our Atmofi contract, passing the mock's address to the constructor
    const Atmofi = await ethers.getContractFactory("Atmofi");
    atmofi = await Atmofi.deploy(await chainlinkAggregatorMock.getAddress());
  });

  it("Should initialize a new derivative contract correctly", async function () {
    // The insurer creates the contract by calling initialize and sending the premium
    await atmofi.connect(insurer).initialize(
      await beverageCompany.getAddress(),
      payoutAmount,
      strikeTemperature,
      durationSeconds,
      { value: premiumAmount }
    );

    const derivative = await atmofi.derivatives(derivativeId);

    expect(derivative.insurer).to.equal(await insurer.getAddress());
    expect(derivative.beverageCompany).to.equal(await beverageCompany.getAddress());
    expect(derivative.premiumAmount).to.equal(premiumAmount);
    expect(derivative.payoutAmount).to.equal(payoutAmount);
    expect(derivative.state).to.equal(0); // Enum Pending is 0
    expect(derivative.beverageCompanyFunded).to.be.true; // Funded on creation
  });

  it("Should allow the insurer to fund the contract and make it active", async function () {
    // First, initialize the contract
    await atmofi.connect(insurer).initialize(
      await beverageCompany.getAddress(),
      payoutAmount,
      strikeTemperature,
      durationSeconds,
      { value: premiumAmount }
    );

    // Now, have the insurer deposit the collateral
    await atmofi.connect(insurer).fundInsurer(derivativeId, { value: payoutAmount });

    const derivative = await atmofi.derivatives(derivativeId);
    expect(derivative.insurerFunded).to.be.true;
    expect(derivative.state).to.equal(1); // Enum Funded is 1

    // Check that the contract balance is correct (premium + payout)
    const contractBalance = await ethers.provider.getBalance(await atmofi.getAddress());
    expect(contractBalance).to.equal(premiumAmount + payoutAmount);
  });

  it("Should settle correctly with the Beverage Company as the winner", async function () {
    // --- Setup: Initialize and Fund the contract ---
    await atmofi.connect(insurer).initialize(
      await beverageCompany.getAddress(),
      payoutAmount,
      strikeTemperature,
      durationSeconds,
      { value: premiumAmount }
    );
    await atmofi.connect(insurer).fundInsurer(derivativeId, { value: payoutAmount });

    // --- Test Logic ---
    // Fast-forward time to after the contract's end date
    await ethers.provider.send("evm_increaseTime", [durationSeconds + 1]);
    await ethers.provider.send("evm_mine", []);

    // Set the mock oracle price to be BELOW the strike price (e.g., 25 degrees)
    await chainlinkAggregatorMock.updateAnswer(2500000000); // 25 with 8 decimals

    // Settle the contract and check that the beverage company's balance increases
    await expect(atmofi.settleContract(derivativeId)).to.changeEtherBalance(
      beverageCompany,
      premiumAmount + payoutAmount // The winner gets the whole pot
    );

    const derivative = await atmofi.derivatives(derivativeId);
    expect(derivative.state).to.equal(2); // Enum Settled is 2
  });

  it("Should settle correctly with the Insurer as the winner", async function () {
    // --- Setup: Initialize and Fund the contract ---
    await atmofi.connect(insurer).initialize(
      await beverageCompany.getAddress(),
      payoutAmount,
      strikeTemperature,
      durationSeconds,
      { value: premiumAmount }
    );
    await atmofi.connect(insurer).fundInsurer(derivativeId, { value: payoutAmount });

    // --- Test Logic ---
    // Fast-forward time
    await ethers.provider.send("evm_increaseTime", [durationSeconds + 1]);
    await ethers.provider.send("evm_mine", []);

    // Set the mock oracle price to be ABOVE the strike price (e.g., 30 degrees)
    await chainlinkAggregatorMock.updateAnswer(3000000000); // 30 with 8 decimals

    // Settle the contract and check that the insurer's balance increases
    await expect(atmofi.settleContract(derivativeId)).to.changeEtherBalance(
      insurer,
      premiumAmount + payoutAmount
    );

    const derivative = await atmofi.derivatives(derivativeId);
    expect(derivative.state).to.equal(2); // Enum Settled is 2
  });

  // A mock contract is needed to test Chainlink locally
  // Add this to your `contracts` folder as `Mock.sol`
  // You might need to create this file: contracts/mocks/AggregatorV3InterfaceMock.sol
  // and paste the mock contract code there.
  // For now, let's assume you've added the mock contract.

});