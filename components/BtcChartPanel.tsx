"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// TradingView 차트는 클라이언트 전용
const TvChart = dynamic(() => import("@/components/TvChart").then(m => m.TvChart), { ssr: false });

type Interval = "15" | "30" | "60" | "120" | "240" | "D";

const BTN = ({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={[
      "px-2.5 py-1 rounded-md border text-xs transition",
      active
        ? "bg-brand-accent/20 border-brand-accent/50 text-brand-accent"
        : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
    ].join(" ")}
  >
    {children}
  </button>
);

export function BtcChartPanel() {
  const [interval, setInterval] = useState<Interval>("240"); // 기본 4h

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-brand-ink/80">BTC/USDT — TradingView 차트</div>
        <div className="flex gap-1.5">
          <BTN active={interval === "30"} onClick={() => setInterval("30")}>30분</BTN>
          <BTN active={interval === "240"} onClick={() => setInterval("240")}>4시간</BTN>
          <BTN active={interval === "D"} onClick={() => setInterval("D")}>1일</BTN>
        </div>
      </div>

      <TvChart symbol="bitcoin" interval={interval} height={420} />

      <div className="mt-2 text-xs text-brand-ink/60">
        인디케이터는 차트 우측 상단 톱니/지표 메뉴에서 직접 켤 수 있어요. (RSI, MACD 등)
      </div>
    </div>
  );
}