// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationRegistry is Ownable {
    mapping(address => uint256) public score;
    address public atomicSwap;

    event AtomicSwapSet(address indexed atomicSwapAddress);
    event ReputationIncremented(address indexed agent, uint256 newScore);

    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }

    function setAtomicSwap(address atomicSwapAddress) external onlyOwner {
        require(atomicSwapAddress != address(0), "invalid atomic swap");
        atomicSwap = atomicSwapAddress;
        emit AtomicSwapSet(atomicSwapAddress);
    }

    function increment(address agent) external {
        require(msg.sender == atomicSwap, "only atomic swap");
        score[agent] += 1;
        emit ReputationIncremented(agent, score[agent]);
    }
}
