// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TradeRouter is Ownable {
    struct TradeRequest {
        address requester;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 requestDeadline;
        uint256 createdAt;
        uint256 nonce;
        bool active;
    }

    mapping(bytes32 => TradeRequest) private requests;
    address public atomicSwap;

    event AtomicSwapSet(address indexed atomicSwapAddress);
    event TradeRequested(
        bytes32 indexed requestId,
        address indexed requester,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 requestDeadline,
        uint256 nonce
    );
    event TradeRequestEncrypted(bytes32 indexed requestId, bytes32 indexed encryptedPayloadHash);
    event TradeOffered(
        bytes32 indexed requestId,
        address indexed agent,
        uint256 amountOut,
        uint256 offerDeadline,
        bytes signature
    );
    event TradeOfferSubmitted(
        bytes32 indexed requestId,
        address indexed agent,
        uint256 amountOut,
        uint256 offerDeadline,
        bytes signature
    );
    event TradeCancelled(bytes32 indexed requestId, address indexed requester);
    event TradeExecuted(bytes32 indexed requestId, address indexed requester, address indexed agent, uint256 amountIn, uint256 amountOut);

    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }

    function setAtomicSwap(address atomicSwapAddress) external onlyOwner {
        require(atomicSwapAddress != address(0), "invalid atomic swap");
        atomicSwap = atomicSwapAddress;
        emit AtomicSwapSet(atomicSwapAddress);
    }

    function requestTrade(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 requestDeadline,
        uint256 nonce
    ) external returns (bytes32 requestId) {
        requestId = _requestTrade(msg.sender, tokenIn, tokenOut, amountIn, minAmountOut, requestDeadline, nonce);
    }

    function _requestTrade(
        address requester,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 requestDeadline,
        uint256 nonce
    ) internal returns (bytes32 requestId) {
        require(tokenIn != address(0) && tokenOut != address(0), "invalid token");
        require(tokenIn != tokenOut, "identical tokens");
        require(amountIn > 0, "amount zero");
        require(requestDeadline > block.timestamp, "request expired");

        requestId = keccak256(
            abi.encode(
                requester,
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                requestDeadline,
                nonce,
                block.chainid,
                address(this)
            )
        );

        require(requests[requestId].requester == address(0), "duplicate request");

        requests[requestId] = TradeRequest({
            requester: requester,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            requestDeadline: requestDeadline,
            createdAt: block.timestamp,
            nonce: nonce,
            active: true
        });

        emit TradeRequested(requestId, requester, tokenIn, tokenOut, amountIn, minAmountOut, requestDeadline, nonce);
    }

    function requestTradeWithEncryptedPayload(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 requestDeadline,
        uint256 nonce,
        bytes32 encryptedPayloadHash
    ) external returns (bytes32 requestId) {
        requestId = _requestTrade(msg.sender, tokenIn, tokenOut, amountIn, minAmountOut, requestDeadline, nonce);
        emit TradeRequestEncrypted(requestId, encryptedPayloadHash);
    }

    function submitOffer(bytes32 requestId, uint256 amountOut, uint256 offerDeadline, bytes calldata signature) external {
        TradeRequest memory req = requests[requestId];
        require(req.active, "request inactive");
        require(block.timestamp <= req.requestDeadline, "request expired");
        require(offerDeadline > block.timestamp, "offer expired");
        require(amountOut > 0, "amount out zero");

        emit TradeOffered(requestId, msg.sender, amountOut, offerDeadline, signature);
        emit TradeOfferSubmitted(requestId, msg.sender, amountOut, offerDeadline, signature);
    }

    function cancelTrade(bytes32 requestId) external {
        TradeRequest storage req = requests[requestId];
        require(req.active, "request inactive");
        require(req.requester == msg.sender, "not requester");
        req.active = false;
        emit TradeCancelled(requestId, msg.sender);
    }

    function markExecuted(bytes32 requestId, address agent, uint256 amountOut) external {
        require(msg.sender == atomicSwap, "only atomic swap");
        TradeRequest storage req = requests[requestId];
        require(req.active, "request inactive");
        req.active = false;
        emit TradeExecuted(requestId, req.requester, agent, req.amountIn, amountOut);
    }

    function getRequest(bytes32 requestId) external view returns (TradeRequest memory) {
        return requests[requestId];
    }
}
