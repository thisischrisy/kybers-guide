// lib/signals.ts
import { sma, rsi } from "@/lib/indicators";

export type Timeframe = "1h" | "4h" | "1d";
export type Tone = "buy" | "neutral" | "sell";

export type EvalResult = {
  tf: Timeframe;
  tone: Tone;
  status: "강한 상승" | "약한 상승" | "약한 하락" | "강한 하락";
  rsi: number | null;
  rsiWarn: "탐욕 과열" | "공포 과도" | "정상";
  cross50400: "golden" | "dead" | "none";
  ma50?: number | null;
  ma200?: number | null;
  ma400?: number | null;
  price?: number | null;
  recommendation: string;
  _fallback?: boolean; // 400MA 미충족 시 50/200만으로 판단했음을 표시
};

// ---- 유틸 ----
export function to4hCloses(hourlyCloses: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < hourlyCloses.length; i += 4) {
    out.push(hourlyCloses[Math.min(i + 3, hourlyCloses.length - 1)]);
  }
  return out;
}

function last<T>(arr: T[]): T | undefined {
  return arr.length ? arr[arr.length - 1] : undefined;
}

function statusFromMA(m50: number, m200: number, m400?: number | null): EvalResult["status"] {
  const has400 = typeof m400 === "number" && isFinite(m400);
  if (has400) {
    if (m50 > m200 && m200 > m400!) return "강한 상승";
    if (m50 > m200 && m200 < m400!) return "약한 상승";
    if (m50 < m200 && m200 > m400!) return "약한 하락";
    return "강한 하락";
  }
  // 400이 없으면 50/200만으로 단순화
  if (m50 > m200) return "약한 상승";
  if (m50 < m200) return "약한 하락";
  return "약한 하락";
}

function rsiWarnFrom(v: number | null): EvalResult["rsiWarn"] {
  if (typeof v !== "number" || !isFinite(v)) return "정상";
  if (v >= 70) return "탐욕 과열";
  if (v <= 30) return "공포 과도";
  return "정상";
}

function cross50400(m50Arr: number[], m400Arr: number[]): EvalResult["cross50400"] {
  if (m50Arr.length < 2 || m400Arr.length < 2) return "none";
  const prevDiff = m50Arr[m50Arr.length - 2] - m400Arr[m400Arr.length - 2];
  const currDiff = m50Arr[m50Arr.length - 1] - m400Arr[m400Arr.length - 1];
  if (prevDiff <= 0 && currDiff > 0) return "golden";
  if (prevDiff >= 0 && currDiff < 0) return "dead";
  return "none";
}

// ---- 핵심 판단 ----
export function decideSignalForSeries(tf: Timeframe, priceArr: number[]): EvalResult {
  // 최소 요구치: 400MA의 2포인트 비교를 위해 401개 필요
  const needFor400 = 401;
  const enoughFor400 = Array.isArray(priceArr) && priceArr.length >= needFor400;
  const enoughFor200 = Array.isArray(priceArr) && priceArr.length >= 201;

  if (!Array.isArray(priceArr) || priceArr.length < 120) {
    // 정말 데이터가 너무 적으면 일단 보수적으로
    return {
      tf, tone: "neutral", status: "약한 하락",
      rsi: null, rsiWarn: "정상", cross50400: "none",
      recommendation: "데이터 수집 중 — 보수적 유지",
      _fallback: true,
    };
  }

  // 공통 지표
  const m50Arr  = enoughFor200 ? sma(priceArr, 50)  : [];
  const m200Arr = enoughFor200 ? sma(priceArr, 200) : [];
  const m400Arr = enoughFor400 ? sma(priceArr, 400) : [];
  const rsiArr  = rsi(priceArr, 14);

  const m50  = m50Arr.length  ? last(m50Arr)!  : NaN;
  const m200 = m200Arr.length ? last(m200Arr)! : NaN;
  const m400 = m400Arr.length ? last(m400Arr)! : NaN;
  const p    = last(priceArr) ?? NaN;
  const r    = last(rsiArr) ?? NaN;

  const has400 = enoughFor400 && m400Arr.length >= 2;
  const st     = statusFromMA(m50, m200, has400 ? m400 : undefined);
  const warn   = rsiWarnFrom(r);
  const cross  = has400 ? cross50400(m50Arr, m400Arr) : "none";

  // 50/400 교차 최우선
  if (cross === "golden") {
    return {
      tf, tone: "buy", status: st, rsi: isFinite(r) ? r : null, rsiWarn: warn,
      cross50400: "golden", ma50: m50, ma200: m200, ma400: m400, price: p,
      recommendation: "강력 매수 권고 (50/400 골든크로스)",
      _fallback: !has400,
    };
  }
  if (cross === "dead") {
    return {
      tf, tone: "sell", status: st, rsi: isFinite(r) ? r : null, rsiWarn: warn,
      cross50400: "dead", ma50: m50, ma200: m200, ma400: m400, price: p,
      recommendation: "강력 매도 권고 (50/400 데드크로스)",
      _fallback: !has400,
    };
  }

  // 표에 따른 기본 규칙
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
    cross50400: "none", ma50: m50, ma200: m200, ma400: has400 ? m400 : null, price: p,
    recommendation: rec,
    _fallback: !has400,
  };
}

// 세 타임프레임 종합 (다수결, 동률 시 장기 우선)
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