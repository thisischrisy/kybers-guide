// lib/signals.ts
import { sma, rsi } from "@/lib/indicators";

export type Timeframe = "1h" | "4h" | "1d";
export type Tone = "buy" | "neutral" | "sell";

export type EvalResult = {
  tf: Timeframe;
  tone: Tone; // 매수/중립/매도
  status: "강한 상승" | "약한 상승" | "약한 하락" | "강한 하락";
  rsi: number | null;
  rsiWarn: "탐욕 과열" | "공포 과도" | "정상";
  cross50400: "golden" | "dead" | "none";
  ma50?: number | null;
  ma200?: number | null;
  ma400?: number | null;
  price?: number | null;
  recommendation: string;
};

// ───────────────────────────────────
// 유틸
// ───────────────────────────────────
export function to4hCloses(hourlyCloses: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < hourlyCloses.length; i += 4) {
    const lastOfBucket = hourlyCloses[Math.min(i + 3, hourlyCloses.length - 1)];
    out.push(lastOfBucket);
  }
  return out;
}

function last<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

function statusFromMA(m50: number, m200: number, m400: number): EvalResult["status"] {
  if (m50 > m200 && m200 > m400) return "강한 상승";
  if (m50 > m200 && m200 < m400) return "약한 상승";
  if (m50 < m200 && m200 > m400) return "약한 하락";
  return "강한 하락";
}

function rsiWarnFrom(v: number | null): EvalResult["rsiWarn"] {
  if (typeof v !== "number" || !isFinite(v)) return "정상";
  if (v >= 70) return "탐욕 과열";
  if (v <= 30) return "공포 과도";
  return "정상";
}

function cross50400(m50Arr: number[], m400Arr: number[]): EvalResult["cross50400"] {
  if (m50Arr.length < 2 || m400Arr.length < 2) return "none";
  const prevUp = m50Arr[m50Arr.length - 2] - m400Arr[m400Arr.length - 2];
  const currUp = m50Arr[m50Arr.length - 1] - m400Arr[m400Arr.length - 1];
  if (prevUp <= 0 && currUp > 0) return "golden";
  if (prevUp >= 0 && currUp < 0) return "dead";
  return "none";
}

// ───────────────────────────────────
// 핵심: 시계열 하나(특정 타임프레임)의 신호 판단
// (입력: 종가 배열, 출력: EvalResult)
// ───────────────────────────────────
export function decideSignalForSeries(tf: Timeframe, priceArr: number[]): EvalResult {
  // SMA(400) 계산을 위해 여유 있게 필요
  if (!Array.isArray(priceArr) || priceArr.length < 410) {
    return {
      tf, tone: "neutral", status: "약한 하락",
      rsi: null, rsiWarn: "정상", cross50400: "none",
      recommendation: "데이터 수집 중 — 보수적 유지",
    };
  }

  const m50Arr  = sma(priceArr, 50);
  const m200Arr = sma(priceArr, 200);
  const m400Arr = sma(priceArr, 400);
  const rsiArr  = rsi(priceArr, 14);

  const m50  = last(m50Arr)  ?? NaN;
  const m200 = last(m200Arr) ?? NaN;
  const m400 = last(m400Arr) ?? NaN;
  const p    = last(priceArr) ?? NaN;
  const r    = last(rsiArr) ?? NaN;

  const c50400 = cross50400(m50Arr, m400Arr);
  const st     = statusFromMA(m50, m200, m400);
  const warn   = rsiWarnFrom(r);

  // 50/400 교차 최우선
  if (c50400 === "golden") {
    return {
      tf, tone: "buy", status: st, rsi: isFinite(r) ? r : null, rsiWarn: warn,
      cross50400: "golden", ma50: m50, ma200: m200, ma400: m400, price: p,
      recommendation: "강력 매수 권고 (50/400 골든크로스)",
    };
  }
  if (c50400 === "dead") {
    return {
      tf, tone: "sell", status: st, rsi: isFinite(r) ? r : null, rsiWarn: warn,
      cross50400: "dead", ma50: m50, ma200: m200, ma400: m400, price: p,
      recommendation: "강력 매도 권고 (50/400 데드크로스)",
    };
  }

  // 기본 규칙(요청표 반영)
  let tone: Tone = "neutral";
  let rec = "투자 지양 권고";

  if (st === "강한 하락") {
    if (warn === "탐욕 과열") { tone = "sell"; rec = "강력 매도 권고"; }
    else if (warn === "공포 과도") { tone = "neutral"; rec = "단기 매수 권고"; }
    else { tone = "sell"; rec = "매도 권고"; }
  } else if (st === "약한 하락") {
    if (warn === "탐욕 과열") { tone = "neutral"; rec = "단기 매도 권고"; }
    else if (warn === "공포 과도") { tone = "neutral"; rec = "단기 매수 권고"; }
    else { tone = "neutral"; rec = "투자 지양 권고"; }
  } else if (st === "약한 상승") {
    if (warn === "탐욕 과열") { tone = "neutral"; rec = "단기 매도 권고"; }
    else if (warn === "공포 과도") { tone = "neutral"; rec = "단기 매수 권고"; }
    else { tone = "neutral"; rec = "투자 지양 권고"; }
  } else { // 강한 상승
    if (warn === "탐욕 과열") { tone = "buy"; rec = "매수 주의"; }
    else if (warn === "공포 과도") { tone = "buy"; rec = "강력 매수 권고"; }
    else { tone = "buy"; rec = "매수 권고"; }
  }

  return {
    tf, tone, status: st, rsi: isFinite(r) ? r : null, rsiWarn: warn,
    cross50400: "none", ma50: m50, ma200: m200, ma400: m400, price: p,
    recommendation: rec,
  };
}

// 세 타임프레임 종합: 다수결, 동률 시 장기(1d) 우선
export function aggregateMaster(a: EvalResult, b: EvalResult, c: EvalResult) {
  const arr = [a.tone, b.tone, c.tone] as Tone[];
  const count = (t: Tone) => arr.filter(x => x === t).length;
  const buy = count("buy"), sell = count("sell"), neu = count("neutral");

  let tone: Tone = "neutral";
  if (buy > sell && buy > neu) tone = "buy";
  else if (sell > buy && sell > neu) tone = "sell";
  else tone = c.tone; // 장기 우선

  const label =
    tone === "buy" ? (c.tone === "buy" ? "강력 매수 권고" : "매수 권고")
    : tone === "sell" ? (c.tone === "sell" ? "강력 매도 권고" : "매도 권고")
    : "투자 지양 권고";

  return { tone, label };
}