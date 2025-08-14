"use client";

import { useEffect, useState } from "react";

// 비트코인 반감기: 210,000 블록마다. 2024년 반감기 높이: 840,000 → 다음은 1,050,000
const NEXT_HALVING_HEIGHT = 1050000;
const AVG_BLOCK_MIN = 10; // 평균 블록 시간 10분 가정

async function fetchTipHeight(): Promise<number | null> {
  try {
    // 무료 공개 엔드포인트(서버/클라 둘 다 OK). 막히면 다른 엔드포인트로 교체 가능.
    const res = await fetch("https://mempool.space/api/blocks/tip/height");
    if (!res.ok) return null;
    const h = await res.text(); // 숫자 형태 문자열
    return Number(h);
  } catch {
    return null;
  }
}

export function HalvingCountdown() {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      const h = await fetchTipHeight();
      if (!stop) setHeight(Number.isFinite(h as number) ? (h as number) : null);
    })();
    // 5분마다 한 번 갱신(너무 자주 할 필요 없음)
    const t = setInterval(async () => {
      const h = await fetchTipHeight();
      if (!stop) setHeight(Number.isFinite(h as number) ? (h as number) : null);
    }, 5 * 60 * 1000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const blocksLeft = height != null ? Math.max(NEXT_HALVING_HEIGHT - height, 0) : null;
  const minutesLeft = blocksLeft != null ? blocksLeft * AVG_BLOCK_MIN : null;
  const daysLeft = minutesLeft != null ? Math.round(minutesLeft / (60 * 24)) : null;

  // 매우 러프한 날짜 추정(10분/블록 가정)
  const eta = minutesLeft != null
    ? new Date(Date.now() + minutesLeft * 60 * 1000)
    : null;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="inline-flex items-center px-2 py-1 rounded-md border border-brand-line/40 bg-brand-card/60">
        ⏳ 다음 반감기까지{" "}
        <strong className="mx-1 text-brand-gold">
          {daysLeft != null ? `${daysLeft}일` : "계산 중"}
        </strong>
        남음
      </span>
      <span className="text-xs text-brand-ink/70">
        (추정일: {eta ? eta.toLocaleDateString() : "—"} · 블록 {height ?? "…"} → {NEXT_HALVING_HEIGHT})
      </span>
    </div>
  );
}