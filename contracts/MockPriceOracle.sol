// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockPriceOracle is Ownable {
    int256 private _answer;
    uint8 private immutable _decimals;
    uint256 private _updatedAt;
    uint80 private _roundId;

    event PriceUpdated(int256 answer, uint256 updatedAt, uint80 roundId);

    constructor(uint8 decimals_, int256 initialAnswer) {
        require(initialAnswer > 0, "invalid initial price");
        _decimals = decimals_;
        _answer = initialAnswer;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    function setPrice(int256 newAnswer) external onlyOwner {
        require(newAnswer > 0, "invalid price");
        _answer = newAnswer;
        _updatedAt = block.timestamp;
        _roundId += 1;
        emit PriceUpdated(newAnswer, _updatedAt, _roundId);
    }
}
