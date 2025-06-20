// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract Atmofi is VRFConsumerBaseV2 {
    
    enum DerivativeState { Pending, Funded, Settled }

    struct Derivative {
        address insurer;
        address beverageCompany;
        uint256 premiumAmount;
        uint256 payoutAmount;
        uint256 strikeTemperature;
        uint256 startTimestamp;
        uint256 endTimestamp;
        DerivativeState state;
        bool insurerFunded;
        bool beverageCompanyFunded;
        uint256 settledTemperature;
    }

    mapping(uint256 => Derivative) public derivatives;
    uint256 public nextDerivativeId;
    uint256[] public settledDerivativeIds;
    uint256[] public allDerivativeIds;

    AggregatorV3Interface public priceFeed;
    address public immutable priceFeedContractAddress;
    
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId; // CORRECTED BACK TO uint64
    
    uint32 private constant CALLBACK_GAS_LIMIT = 100000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    mapping(uint256 => uint256) public vrfRequestToDerivativeId;
    mapping(uint256 => bool) public derivativeSettlementInitiated;

    event DerivativeCreated(uint256 indexed derivativeId, address indexed insurer, address indexed beverageCompany, uint256 strikeTemperature);
    event ContractFunded(uint256 indexed derivativeId);
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed derivativeId);
    event ContractSettled(uint256 indexed derivativeId, address indexed winner, uint256 settledTemperature);

    constructor(address _priceFeedAddress, uint64 _vrfSubscriptionId) // CORRECTED BACK TO uint64
        VRFConsumerBaseV2(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625)
    {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        priceFeedContractAddress = _priceFeedAddress;
        
        i_vrfCoordinator = VRFCoordinatorV2Interface(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625);
        i_keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
        i_subscriptionId = _vrfSubscriptionId;
    }

    function initialize(address beverageCompany, uint256 payoutAmount, uint256 strikeTemperature, uint256 durationSeconds) external payable {
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
            beverageCompanyFunded: true,
            settledTemperature: 0
        });
        nextDerivativeId++;
        allDerivativeIds.push(derivativeId);
        emit DerivativeCreated(derivativeId, msg.sender, beverageCompany, strikeTemperature);
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
        require(derivative.state == DerivativeState.Funded, "Derivative not active");
        require(block.timestamp > derivative.endTimestamp, "Contract period not yet ended");
        require(!derivativeSettlementInitiated[derivativeId], "Settlement already initiated");
        derivativeSettlementInitiated[derivativeId] = true;
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, i_subscriptionId, // This call now works because i_subscriptionId is a uint64
            REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, NUM_WORDS
        );
        vrfRequestToDerivativeId[requestId] = derivativeId;
        emit RandomnessRequested(requestId, derivativeId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        uint256 derivativeId = vrfRequestToDerivativeId[requestId];
        Derivative storage derivative = derivatives[derivativeId];
        require(derivative.state == DerivativeState.Funded, "Derivative not active for settlement");
        
        (, int256 price, , , ) = priceFeed.latestRoundData();
        uint256 fetchedPrice = uint256(price) / (10**8);
        uint256 randomMultiplier = 90 + (randomWords[0] % 21);
        uint256 finalTemperature = (fetchedPrice * randomMultiplier) / 100;

        derivative.settledTemperature = finalTemperature;
        derivative.state = DerivativeState.Settled;
        settledDerivativeIds.push(derivativeId);

        address winner;
        if (finalTemperature < derivative.strikeTemperature) {
            winner = derivative.beverageCompany;
        } else {
            winner = derivative.insurer;
        }
        (bool success, ) = winner.call{value: address(this).balance}("");
        require(success, "Failed to send funds to winner");
        emit ContractSettled(derivativeId, winner, finalTemperature);
    }

    function getDerivativeHistory(uint256 limit) external view returns (Derivative[] memory) {
        uint256 count = allDerivativeIds.length;
        if (count == 0) {
            return new Derivative[](0);
        }
        if (limit > count || limit == 0) {
            limit = count;
        }
        Derivative[] memory history = new Derivative[](limit);
        for (uint256 i = 0; i < limit; i++) {
            history[i] = derivatives[allDerivativeIds[count - 1 - i]];
        }
        return history;
    }
}