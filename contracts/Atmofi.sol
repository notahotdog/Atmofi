// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract Atmofi is VRFConsumerBaseV2, AutomationCompatibleInterface, Ownable {
    
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
    uint256 public s_subscriptionId;
    
    uint32 private constant CALLBACK_GAS_LIMIT = 200000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    mapping(uint256 => uint256) public vrfRequestToDerivativeId;
    mapping(uint256 => bool) public derivativeSettlementInitiated;

    event DerivativeCreated(uint256 indexed derivativeId, address indexed insurer, address indexed beverageCompany, uint256 strikeTemperature);
    event ContractFunded(uint256 indexed derivativeId);
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed derivativeId);
    event ContractSettled(uint256 indexed derivativeId, address indexed winner, uint256 settledTemperature);

    constructor(address _priceFeedAddress) 
        VRFConsumerBaseV2(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625)
        Ownable(msg.sender)
    {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
        priceFeedContractAddress = _priceFeedAddress;
        i_vrfCoordinator = VRFCoordinatorV2Interface(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625);
        i_keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    }

    function setSubscriptionId(uint256 _subId) external onlyOwner {
        s_subscriptionId = _subId;
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

    function settleContract(uint256 derivativeId) public {
        Derivative storage derivative = derivatives[derivativeId];
        require(derivative.state == DerivativeState.Funded, "Derivative not active");
        require(block.timestamp > derivative.endTimestamp, "Contract period not yet ended");
        require(!derivativeSettlementInitiated[derivativeId], "Settlement already initiated");
        require(s_subscriptionId != 0, "Subscription ID not set");
        derivativeSettlementInitiated[derivativeId] = true;
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, 
            uint64(s_subscriptionId), // Explicitly cast to uint64 for the function call
            REQUEST_CONFIRMATIONS, 
            CALLBACK_GAS_LIMIT, 
            NUM_WORDS
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

    function checkUpkeep(bytes calldata _checkData) external view override returns (bool upkeepNeeded, bytes memory performData) {
        for (uint i = 0; i < allDerivativeIds.length; i++) {
            uint256 derivativeId = allDerivativeIds[i];
            Derivative memory derivative = derivatives[derivativeId];
            if (derivative.state == DerivativeState.Funded && block.timestamp > derivative.endTimestamp && !derivativeSettlementInitiated[derivativeId]) {
                upkeepNeeded = true;
                performData = abi.encode(derivativeId);
                break;
            }
        }
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 derivativeId = abi.decode(performData, (uint256));
        settleContract(derivativeId);
    }

    function getDerivativeHistory(uint256 limit) external view returns (Derivative[] memory) {
        uint256 count = allDerivativeIds.length;
        if (count == 0) { return new Derivative[](0); }
        if (limit > count || limit == 0) { limit = count; }
        Derivative[] memory history = new Derivative[](limit);
        for (uint256 i = 0; i < limit; i++) {
            history[i] = derivatives[allDerivativeIds[count - 1 - i]];
        }
        return history;
    }
}