// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Atmofi {
    enum DerivativeState { Pending, Funded, Settled }

    struct Derivative {
        address insurer;
        address beverageCompany;
        uint256 premiumAmount;
        uint256 payoutAmount;
        int256 strikeTemperature;
        uint256 startTimestamp;
        uint256 endTimestamp;
        DerivativeState state;
        bool insurerFunded;
        bool beverageCompanyFunded;
    }

    mapping(uint256 => Derivative) public derivatives;
    uint256 public nextDerivativeId;
    uint256[] public settledDerivativeIds;
    uint256[] public allDerivativeIds;

    // --- CORRECTED SECTION ---
    AggregatorV3Interface internal immutable i_priceFeed;
    // This public variable has a unique name to avoid conflicts.
    address public immutable priceFeedContractAddress;

    event DerivativeCreated(uint256 indexed derivativeId, address indexed insurer, address indexed beverageCompany);
    event ContractFunded(uint256 indexed derivativeId);
    event ContractSettled(uint256 indexed derivativeId, int256 settledTemperature, address winner);

    constructor(address _priceFeedAddress) {
        i_priceFeed = AggregatorV3Interface(_priceFeedAddress);
        priceFeedContractAddress = _priceFeedAddress;
    }

    function initialize(
        address beverageCompany,
        uint256 payoutAmount,
        int256 strikeTemperature,
        uint256 durationSeconds
    ) external payable {
        require(msg.value > 0, "Premium must be greater than zero");
        uint256 derivativeId = nextDerivativeId;
        derivatives[derivativeId] = Derivative({
            insurer: msg.sender,
            beverageCompany: beverageCompany,
            premiumAmount: msg.value,
            payoutAmount: payoutAmount,
            strikeTemperature: strikeTemperature,
            startTimestamp: block.timestamp,
            endTimestamp: block.timestamp + durationSeconds,
            state: DerivativeState.Pending,
            insurerFunded: false,
            beverageCompanyFunded: true
        });
        nextDerivativeId++;
        allDerivativeIds.push(derivativeId);
        emit DerivativeCreated(derivativeId, msg.sender, beverageCompany);
    }

    function fundInsurer(uint256 derivativeId) external payable {
        Derivative storage derivative = derivatives[derivativeId];
        require(msg.sender == derivative.insurer, "Only the insurer can fund");
        require(derivative.state == DerivativeState.Pending, "Contract not pending");
        require(!derivative.insurerFunded, "Insurer already funded");
        require(msg.value == derivative.payoutAmount, "Incorrect payout amount sent");
        derivative.insurerFunded = true;
        derivative.state = DerivativeState.Funded;
        emit ContractFunded(derivativeId);
    }

    function settleContract(uint256 derivativeId) external {
        Derivative storage derivative = derivatives[derivativeId];
        require(derivative.state == DerivativeState.Funded, "Contract not funded");
        require(block.timestamp > derivative.endTimestamp, "Contract period not yet ended");

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        int256 settledTemperature = price / 10**8;

        derivative.state = DerivativeState.Settled;
        settledDerivativeIds.push(derivativeId);
        address winner;

        if (settledTemperature < derivative.strikeTemperature) {
            winner = derivative.beverageCompany;
            payable(winner).transfer(address(this).balance);
        } else {
            winner = derivative.insurer;
            payable(winner).transfer(address(this).balance);
        }
        emit ContractSettled(derivativeId, settledTemperature, winner);
    }

    function getDerivativeHistory(uint256 limit) external view returns (Derivative[] memory) {
    uint256 count = allDerivativeIds.length;

    // --- THIS IS THE FIX ---
    // If there are no derivatives, return an empty array immediately.
    if (count == 0) {
        return new Derivative[](0);
    }
    // --- END FIX ---

    if (limit > count || limit == 0) {
        limit = count;
    }
    Derivative[] memory history = new Derivative[](limit);
    for (uint256 i = 0; i < limit; i++) {
        history[i] = derivatives[allDerivativeIds[count - 1 - i]];
    }
    return history;
    }

    function getHistory(uint256 limit) external view returns (Derivative[] memory) {
    uint256 count = settledDerivativeIds.length;
    if (limit > count) {
        limit = count;
    }
    Derivative[] memory history = new Derivative[](limit);
    for (uint256 i = 0; i < limit; i++) {
        history[i] = derivatives[settledDerivativeIds[count - 1 - i]];
    }
    return history;
    }
}