import { Contract, JsonRpcProvider, formatUnits, getAddress, parseUnits } from "ethers";
import { config } from "./config";
import { erc20Abi, oracleAbi } from "./abi";

function toDecimalNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return Number(value);
}

export type QuoteInput = {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
};

export async function computeAmountOut(provider: JsonRpcProvider, input: QuoteInput): Promise<bigint> {
  const tokenIn = getAddress(input.tokenIn);
  const tokenOut = getAddress(input.tokenOut);

  const oracle = new Contract(config.oracleAddress, oracleAbi, provider);
  const [roundData, oracleDecimalsRaw]: [readonly [bigint, bigint, bigint, bigint, bigint], bigint] = await Promise.all([
    oracle.latestRoundData(),
    oracle.decimals()
  ]);
  const oracleDecimals = toDecimalNumber(oracleDecimalsRaw);

  const answer = roundData[1];
  if (answer <= 0n) {
    throw new Error("Oracle returned non-positive price");
  }

  const tokenInContract = new Contract(tokenIn, erc20Abi, provider);
  const tokenOutContract = new Contract(tokenOut, erc20Abi, provider);
  const [tokenInDecimalsRaw, tokenOutDecimalsRaw]: [bigint, bigint] = await Promise.all([
    tokenInContract.decimals(),
    tokenOutContract.decimals()
  ]);
  const tokenInDecimals = toDecimalNumber(tokenInDecimalsRaw);
  const tokenOutDecimals = toDecimalNumber(tokenOutDecimalsRaw);

  const amountInNorm = Number(formatUnits(input.amountIn, tokenInDecimals));
  const priceNorm = Number(formatUnits(answer, oracleDecimals));

  let rawOutNorm: number;
  const isUsdcToHsk = tokenIn === config.usdcAddress && tokenOut === config.hskTokenAddress;
  const isHskToUsdc = tokenIn === config.hskTokenAddress && tokenOut === config.usdcAddress;

  if (!isUsdcToHsk && !isHskToUsdc) {
    throw new Error("Unsupported pair. Only USDC<->HSK is allowed.");
  }

  if (config.oracleMode === "USDC_PER_HSK") {
    rawOutNorm = isUsdcToHsk ? amountInNorm / priceNorm : amountInNorm * priceNorm;
  } else {
    rawOutNorm = isUsdcToHsk ? amountInNorm * priceNorm : amountInNorm / priceNorm;
  }

  const spreadMultiplier = (10_000 - config.spreadBps) / 10_000;
  const offeredOutNorm = rawOutNorm * spreadMultiplier;

  if (!Number.isFinite(offeredOutNorm) || offeredOutNorm <= 0) {
    throw new Error("Invalid computed output amount");
  }

  return parseUnits(offeredOutNorm.toFixed(Math.min(tokenOutDecimals, 8)), tokenOutDecimals);
}
