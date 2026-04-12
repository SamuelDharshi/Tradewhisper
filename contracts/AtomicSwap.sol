// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ITradeRouter {
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

    function getRequest(bytes32 requestId) external view returns (TradeRequest memory);
    function markExecuted(bytes32 requestId, address agent, uint256 amountOut) external;
}

interface IReputationRegistry {
    function increment(address agent) external;
}

contract AtomicSwap is EIP712, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public constant OFFER_TYPEHASH = keccak256(
        "Offer(bytes32 requestId,address requester,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 amountOut,uint256 offerDeadline)"
    );

    ITradeRouter public immutable tradeRouter;
    IReputationRegistry public immutable reputationRegistry;
    address public trustedRelayer;

    event TradeSettled(
        bytes32 indexed requestId,
        address indexed requester,
        address indexed agent,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    event RelayerUpdated(address indexed relayer);

    constructor(address routerAddress, address reputationAddress, address initialOwner, address relayerAddress)
        EIP712("TradeWhisperAtomicSwap", "1")
        Ownable()
    {
        require(routerAddress != address(0), "invalid router");
        require(reputationAddress != address(0), "invalid reputation");
        require(initialOwner != address(0), "invalid owner");
        tradeRouter = ITradeRouter(routerAddress);
        reputationRegistry = IReputationRegistry(reputationAddress);
        trustedRelayer = relayerAddress;
        _transferOwnership(initialOwner);
    }

    function setTrustedRelayer(address relayerAddress) external onlyOwner {
        trustedRelayer = relayerAddress;
        emit RelayerUpdated(relayerAddress);
    }

    function executeTrade(
        bytes32 requestId,
        uint256 amountOut,
        uint256 offerDeadline,
        address agent,
        bytes calldata signature
    ) external nonReentrant {
        _executeTrade(requestId, msg.sender, amountOut, offerDeadline, agent, signature);
    }

    function executeTradeFor(
        bytes32 requestId,
        address requester,
        uint256 amountOut,
        uint256 offerDeadline,
        address agent,
        bytes calldata signature
    ) external nonReentrant {
        require(msg.sender == trustedRelayer, "only relayer");
        require(requester != address(0), "invalid requester");
        _executeTrade(requestId, requester, amountOut, offerDeadline, agent, signature);
    }

    function _executeTrade(
        bytes32 requestId,
        address requester,
        uint256 amountOut,
        uint256 offerDeadline,
        address agent,
        bytes calldata signature
    ) internal {
        require(agent != address(0), "invalid agent");
        require(block.timestamp <= offerDeadline, "offer expired");

        ITradeRouter.TradeRequest memory req = tradeRouter.getRequest(requestId);
        require(req.active, "request inactive");
        require(req.requester == requester, "requester mismatch");
        require(block.timestamp <= req.requestDeadline, "request expired");
        require(amountOut >= req.minAmountOut, "below min amount out");

        bytes32 structHash = keccak256(
            abi.encode(
                OFFER_TYPEHASH,
                requestId,
                req.requester,
                req.tokenIn,
                req.tokenOut,
                req.amountIn,
                req.minAmountOut,
                amountOut,
                offerDeadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == agent, "invalid offer signature");

        IERC20(req.tokenIn).safeTransferFrom(req.requester, agent, req.amountIn);
        IERC20(req.tokenOut).safeTransferFrom(agent, req.requester, amountOut);

        tradeRouter.markExecuted(requestId, agent, amountOut);
        reputationRegistry.increment(agent);

        emit TradeSettled(requestId, req.requester, agent, req.tokenIn, req.tokenOut, req.amountIn, amountOut);
    }
}
