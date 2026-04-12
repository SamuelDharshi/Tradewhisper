import OpenAI from "openai";
import { z } from "zod";

const ParsedIntentSchema = z.object({
  intent: z.enum(["TRADE", "CANCEL", "STATUS", "UNKNOWN"]),
  tokenIn: z.enum(["USDC", "HSK"]).nullable(),
  amountIn: z.number().nullable(),
  tokenOut: z.enum(["USDC", "HSK"]).nullable(),
  minAmountOut: z.number().nullable(),
  userMessage: z.string(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable()
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

const OfferDecisionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string(),
  chatMessageToUser: z.string()
});

export type OfferDecision = z.infer<typeof OfferDecisionSchema>;

let groqIntentEnabled = true;
let groqEvaluatorEnabled = true;

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const status = (error as { status?: number }).status;
  return status === 403;
}

const SYSTEM_PROMPT = `You are the TradeWhisper intent parser for HashKey Chain OTC trading.
Return strict JSON with exactly these keys:
intent: TRADE|CANCEL|STATUS|UNKNOWN
tokenIn: USDC|HSK|null
amountIn: number|null
tokenOut: USDC|HSK|null
minAmountOut: number|null
userMessage: string
needsClarification: boolean
clarificationQuestion: string|null
Rules:
- If user asks to sell X USDC for HSK, tokenIn=USDC tokenOut=HSK amountIn=X.
- If user asks to buy X HSK with USDC, tokenIn=USDC tokenOut=HSK and amountIn should be null if unknown.
- If user asks to cancel, intent=CANCEL.
- If intent is unclear, needsClarification=true and ask one short question.
- Never output markdown or extra keys.`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

function numberFrom(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) {
        return n;
      }
    }
  }
  return null;
}

function fallbackParseIntent(userInput: string): ParsedIntent {
  const text = userInput.toLowerCase();

  if (/\bcancel\b/.test(text)) {
    return {
      intent: "CANCEL",
      tokenIn: null,
      amountIn: null,
      tokenOut: null,
      minAmountOut: null,
      userMessage: "Okay, I will cancel your active trade request if one exists.",
      needsClarification: false,
      clarificationQuestion: null
    };
  }

  if (/\bstatus\b/.test(text)) {
    return {
      intent: "STATUS",
      tokenIn: null,
      amountIn: null,
      tokenOut: null,
      minAmountOut: null,
      userMessage: "I can check your latest request and offer status.",
      needsClarification: false,
      clarificationQuestion: null
    };
  }

  const hasUsdc = /\busdc\b/.test(text);
  const hasHsk = /\bhsk\b|\bhashkey\b/.test(text);
  const amountIn = numberFrom(text, [
    /(?:sell|swap|exchange|trade|buy\s+hsk\s+with)\s+([0-9]+(?:\.[0-9]+)?)/,
    /([0-9]+(?:\.[0-9]+)?)\s*usdc/
  ]);
  const minAmountOut = numberFrom(text, [
    /at\s+least\s+([0-9]+(?:\.[0-9]+)?)/,
    /minimum\s+([0-9]+(?:\.[0-9]+)?)/,
    /min\s+([0-9]+(?:\.[0-9]+)?)/
  ]);

  const isTrade = /\b(sell|swap|exchange|trade|buy)\b/.test(text);
  if (isTrade && hasUsdc && hasHsk) {
    return {
      intent: "TRADE",
      tokenIn: "USDC",
      amountIn,
      tokenOut: "HSK",
      minAmountOut,
      userMessage: amountIn
        ? `Got it. I will request to swap ${amountIn} USDC for HSK${minAmountOut ? ` with minimum ${minAmountOut} HSK` : ""}.`
        : "I understood your trade direction (USDC -> HSK). Please confirm the input amount.",
      needsClarification: amountIn == null,
      clarificationQuestion: amountIn == null ? "How much USDC do you want to sell?" : null
    };
  }

  return {
    intent: "UNKNOWN",
    tokenIn: null,
    amountIn: null,
    tokenOut: null,
    minAmountOut: null,
    userMessage: "I could not fully parse your request yet.",
    needsClarification: true,
    clarificationQuestion: "Please specify the exact trade, for example: sell 10 USDC for HSK with at least 33 HSK."
  };
}

export async function parseIntent(client: OpenAI, userInput: string, model: string): Promise<ParsedIntent> {
  if (!groqIntentEnabled) {
    return fallbackParseIntent(userInput);
  }

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned empty content");
    }

    const parsed = JSON.parse(extractJson(content));
    return ParsedIntentSchema.parse(parsed);
  } catch (error) {
    if (isPermissionDenied(error)) {
      groqIntentEnabled = false;
      console.warn("[IntentParser] Groq returned 403. Switching to local fallback parser for this session.");
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[IntentParser] Groq unavailable, using local fallback parser: ${message}`);
    }
    return fallbackParseIntent(userInput);
  }
}

export async function evaluateOffer(
  client: OpenAI,
  model: string,
  input: {
    tokenIn: "USDC" | "HSK";
    amountIn: number;
    tokenOut: "USDC" | "HSK";
    targetMinOut: number;
    offeredAmountOut: number;
    offerExpiry: number;
    agentReputation: number;
    minAgentReputation: number;
  }
): Promise<OfferDecision> {
  if (!groqEvaluatorEnabled) {
    if (input.agentReputation < input.minAgentReputation) {
      return {
        decision: "REJECT",
        reason: `Agent reputation ${input.agentReputation} is below threshold ${input.minAgentReputation}`,
        chatMessageToUser: "I rejected the offer because the market agent reputation is too low."
      };
    }
    if (input.offeredAmountOut < input.targetMinOut) {
      return {
        decision: "REJECT",
        reason: `Offered amount ${input.offeredAmountOut} is below user minimum ${input.targetMinOut}`,
        chatMessageToUser: "I rejected the offer because it does not meet your minimum output."
      };
    }
    return {
      decision: "ACCEPT",
      reason: "Offer meets minimum output and agent reputation threshold",
      chatMessageToUser: "I accepted the offer automatically because it meets your configured trade constraints."
    };
  }

  const systemPrompt = `You are the TradeWhisper UserAgent, an autonomous fiduciary acting on behalf of the user.
Your job is to evaluate incoming TRADE_OFFERs from market makers and decide whether to execute the trade automatically.
RULES:
1. If offeredAmountOut >= targetMinOut, output decision ACCEPT.
2. If offeredAmountOut < targetMinOut, output decision REJECT.
3. If agentReputation is below minAgentReputation, output decision REJECT.
Always return strict JSON with keys: decision, reason, chatMessageToUser.`;

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(input) }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned empty evaluator content");
    }

    return OfferDecisionSchema.parse(JSON.parse(extractJson(content)));
  } catch (error) {
    if (isPermissionDenied(error)) {
      groqEvaluatorEnabled = false;
      console.warn("[Evaluator] Groq returned 403. Switching to local deterministic evaluator for this session.");
    } else {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Evaluator] Groq unavailable, using local deterministic evaluator: ${message}`);
    }
    if (input.agentReputation < input.minAgentReputation) {
      return {
        decision: "REJECT",
        reason: `Agent reputation ${input.agentReputation} is below threshold ${input.minAgentReputation}`,
        chatMessageToUser: "I rejected the offer because the market agent reputation is too low."
      };
    }
    if (input.offeredAmountOut < input.targetMinOut) {
      return {
        decision: "REJECT",
        reason: `Offered amount ${input.offeredAmountOut} is below user minimum ${input.targetMinOut}`,
        chatMessageToUser: "I rejected the offer because it does not meet your minimum output."
      };
    }
    return {
      decision: "ACCEPT",
      reason: "Offer meets minimum output and agent reputation threshold",
      chatMessageToUser: "I accepted the offer automatically because it meets your configured trade constraints."
    };
  }
}
