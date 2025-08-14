// lib/signal.ts
export const SIGNAL_EMOJI = {
  buy: "🟢",
  sell: "🔴",
  neutral: "🟡", // ← 중립을 노랑으로 통일
} as const;

export type SignalTone = keyof typeof SIGNAL_EMOJI; // "buy" | "sell" | "neutral"