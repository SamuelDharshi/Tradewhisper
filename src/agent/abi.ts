export const tradeRouterAbi = [
  "event TradeRequested(bytes32 indexed requestId,address indexed requester,address indexed tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 nonce)",
  "event TradeOffered(bytes32 indexed requestId,address indexed agent,uint256 amountOut,uint256 offerDeadline,bytes signature)",
  "event TradeOfferSubmitted(bytes32 indexed requestId,address indexed agent,uint256 amountOut,uint256 offerDeadline,bytes signature)",
  "function submitOffer(bytes32 requestId,uint256 amountOut,uint256 offerDeadline,bytes signature) external",
  "function getRequest(bytes32 requestId) external view returns (tuple(address requester,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 requestDeadline,uint256 createdAt,uint256 nonce,bool active))"
] as const;

export const atomicSwapAbi = [
  "function executeTradeFor(bytes32 requestId,address requester,uint256 amountOut,uint256 offerDeadline,address agent,bytes signature) external",
  "function trustedRelayer() external view returns (address)"
] as const;

export const reputationRegistryAbi = [
  "function score(address agent) external view returns (uint256)"
] as const;

export const oracleAbi = [
  "function latestRoundData() external view returns (uint80,int256,uint256,uint256,uint80)",
  "function decimals() external view returns (uint8)"
] as const;

export const erc20Abi = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function allowance(address owner,address spender) external view returns (uint256)"
] as const;
