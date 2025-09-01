// /lib/signals.ts
export type Verdict = "매수" | "중립" | "매도";

export type ChangeBundle = {
  c24h?: number | null; // %
  c7d?: number | null;  // %
  c30d?: number | null; // %
  rsi?: number | null;  // 0~100 (선택)
};

export type SignalConfig = {
  // 임계값 (MVP 기본값)
  shortBuy: number;   // 24h 매수 임계
  shortSell: number;  // 24h 매도 임계
  midBuy: number;     // 7d 매수 임계
  midSell: number;    // 7d 매도 임계
  longBuy: number;    // 30d 매수 임계
  longSell: number;   // 30d 매도 임계
  // RSI 보정 (선택)
  rsiHot?: number;    // 과열 경계 (기본 70)
  rsiCold?: number;   // 과매도 경계 (기본 30)
};

export const defaultSignalConfig: SignalConfig = {
  shortBuy:  2,  shortSell: -2,
  midBuy:    3,  midSell:   -3,
  longBuy:   5,  longSell:  -5,
  rsiHot:   70,
  rsiCold:  30,
};

function num(x: any): number {
  return typeof x === "number" && isFinite(x) ? x : NaN;
}

export function judgeShort(c: ChangeBundle, cfg = defaultSignalConfig): Verdict {
  const v = num(c.c24h);
  if (!isFinite(v)) return "중립";
  if (v >= cfg.shortBuy) return "매수";
  if (v <= cfg.shortSell) return "매도";
  return "중립";
}

export function judgeMid(c: ChangeBundle, cfg = defaultSignalConfig): Verdict {
  const v = num(c.c7d);
  if (!isFinite(v)) return "중립";
  if (v >= cfg.midBuy) return "매수";
  if (v <= cfg.midSell) return "매도";
  return "중립";
}

export function judgeLong(c: ChangeBundle, cfg = defaultSignalConfig): Verdict {
  const v = num(c.c30d);
  if (!isFinite(v)) return "중립";
  if (v >= cfg.longBuy) return "매수";
  if (v <= cfg.longSell) return "매도";
  return "중립";
}

export function rsiHint(rsi?: number | null, cfg = defaultSignalConfig): "과열" | "중립" | "과매도" | "—" {
  const v = num(rsi);
  if (!isFinite(v)) return "—";
  if (v >= (cfg.rsiHot ?? 70)) return "과열";
  if (v <= (cfg.rsiCold ?? 30)) return "과매도";
  return "중립";
}

export function aggregateVerdict(shortV: Verdict, midV: Verdict, longV: Verdict): Verdict {
  const score = (v: Verdict) => (v === "매수" ? 1 : v === "매도" ? -1 : 0);
  const total = score(shortV) + score(midV) + score(longV);
  if (total >= 2) return "매수";
  if (total <= -2) return "매도";
  // 1, 0, -1는 “중립”로
  return "중립";
}

export function explainVerdict(c: ChangeBundle, shortV: Verdict, midV: Verdict, longV: Verdict) {
  const lines: string[] = [];
  lines.push(`단기(24h): ${shortV} (${isFinite(num(c.c24h)) ? num(c.c24h).toFixed(2)+'%' : '—'})`);
  lines.push(`중기(7d): ${midV} (${isFinite(num(c.c7d)) ? num(c.c7d).toFixed(2)+'%' : '—'})`);
  lines.push(`장기(30d): ${longV} (${isFinite(num(c.c30d)) ? num(c.c30d).toFixed(2)+'%' : '—'})`);
  if (isFinite(num(c.rsi))) {
    lines.push(`RSI(14): ${num(c.rsi).toFixed(0)} (${rsiHint(c.rsi)})`);
  }
  return lines.join(" · ");
}
// --- Backward-compat shims (기존 코드 호환용) ---
export type SignalTone = "buy" | "neutral" | "sell";

export const SIGNAL_EMOJI: Record<SignalTone, string> = {
  buy: "🟢",
  neutral: "🟡", // 중립은 노랑으로
  sell: "🔴",
};

export const SIGNAL_LABEL: Record<SignalTone, string> = {
  buy: "상승우세",
  neutral: "중립",
  sell: "하락우세",
};