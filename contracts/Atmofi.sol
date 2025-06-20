// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Atmofi {
    // Enum to manage the state of each derivative
    enum DerivativeState {
        Pending, // Waiting for funds
        Funded,  // Active and waiting for settlement period
        Settled  // Completed
    }

    // Struct to hold the data for each derivative contract
    struct Derivative {
        address insurer;
        address beverageCompany;
        uint256 premiumAmount;
        uint256 payoutAmount;
        int256 strikeTemperature; // Temperature can be negative
        uint256 startTimestamp;
        uint256 endTimestamp;
        DerivativeState state;
        bool insurerFunded;
        bool beverageCompanyFunded;
    }

    // Mapping to store multiple derivative contracts, identified by an ID
    mapping(uint256 => Derivative) public derivatives;
    uint256 public nextDerivativeId;

    // Chainlink Data Feed address (this is for SOL/USD on Sepolia Testnet, as a stand-in)
    AggregatorV3Interface internal priceFeed;

    event DerivativeCreated(uint256 indexed derivativeId, address indexed insurer, address indexed beverageCompany);
    event ContractFunded(uint256 indexed derivativeId);
    event ContractSettled(uint256 indexed derivativeId, int256 settledTemperature, address winner);

    // Set the Chainlink feed address when the contract is deployed
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    // Function to create a new derivative contract
    function initialize(
        address beverageCompany,
        uint256 payoutAmount,
        int256 strikeTemperature,
        uint256 durationSeconds
    ) external payable {
        // The premium is sent with the transaction (msg.value)
        require(msg.value > 0, "Premium must be greater than zero");

        uint256 derivativeId = nextDerivativeId;
        derivatives[derivativeId] = Derivative({
            insurer: msg.sender, // The creator is the insurer
            beverageCompany: beverageCompany,
            premiumAmount: msg.value,
            payoutAmount: payoutAmount,
            strikeTemperature: strikeTemperature,
            startTimestamp: block.timestamp,
            endTimestamp: block.timestamp + durationSeconds,
            state: DerivativeState.Pending,
            insurerFunded: false, // Insurer funds by depositing collateral
            beverageCompanyFunded: true // Beverage company funds by paying the premium
        });

        nextDerivativeId++;
        emit DerivativeCreated(derivativeId, msg.sender, beverageCompany);
    }

    // Function for the insurer to deposit the collateral
    function fundInsurer(uint256 derivativeId) external payable {
        Derivative storage derivative = derivatives[derivativeId];

        require(msg.sender == derivative.insurer, "Only the insurer can fund");
        require(derivative.state == DerivativeState.Pending, "Contract not pending");
        require(!derivative.insurerFunded, "Insurer already funded");
        require(msg.value == derivative.payoutAmount, "Incorrect payout amount sent");

        derivative.insurerFunded = true;
        // Since the beverage company funded on creation, the contract is now fully funded
        derivative.state = DerivativeState.Funded;
        
        emit ContractFunded(derivativeId);
    }

    // Function to settle the contract after the period ends
    function settleContract(uint256 derivativeId) external {
        Derivative storage derivative = derivatives[derivativeId];

        require(derivative.state == DerivativeState.Funded, "Contract not funded");
        require(block.timestamp > derivative.endTimestamp, "Contract period not yet ended");

        // Get the latest price from the Chainlink Data Feed
        (, int256 price, , , ) = priceFeed.latestRoundData();
        // We'll treat the price as our "temperature" for this example
        int256 settledTemperature = price / 10**8; // Adjust for decimals

        derivative.state = DerivativeState.Settled;
        address winner;

        if (settledTemperature < derivative.strikeTemperature) {
            // Beverage Company wins: receives premium + payout
            winner = derivative.beverageCompany;
            payable(derivative.beverageCompany).transfer(address(this).balance);
        } else {
            // Insurer wins: receives premium + payout
            winner = derivative.insurer;
            payable(derivative.insurer).transfer(address(this).balance);
        }

        emit ContractSettled(derivativeId, settledTemperature, winner);
    }
}