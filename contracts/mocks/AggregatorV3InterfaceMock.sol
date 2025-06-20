// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/*
 * @title AggregatorV3InterfaceMock
 * @notice Mock contract for the AggregatorV3Interface for local testing.
 * @dev This allows us to set and return a mock price/answer.
 */
contract AggregatorV3InterfaceMock is AggregatorV3Interface {
    uint8 public mockDecimals;
    int256 public mockAnswer;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        mockDecimals = _decimals;
        mockAnswer = _initialAnswer;
    }

    /*
     * @notice Sets a new mock answer for the oracle.
     * @param _newAnswer The new mock answer to set.
     */
    function updateAnswer(int256 _newAnswer) public {
        mockAnswer = _newAnswer;
    }

    // --- Overriding AggregatorV3Interface Functions ---

    function decimals() external view override returns (uint8) {
        return mockDecimals;
    }

    function description() external pure override returns (string memory) {
        return "Mock Aggregator";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 /* _roundId */)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, mockAnswer, block.timestamp, block.timestamp, 1);
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, mockAnswer, block.timestamp, block.timestamp, 1);
    }
}