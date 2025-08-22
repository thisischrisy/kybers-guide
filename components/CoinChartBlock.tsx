"use client";

import { useMemo, useState } from "react";
import { TvChart } from "@/components/TvChart";

type Props = {
  sym: string;       // 대문자 심볼 (BTC/ETH/SOL…)
  height?: number;
};

export function CoinChartBlock({ sym, height = 460 }: Props) {
  // 초보 친화: 거래소 선택 + 기간 선택
  const [exchange, setExchange] = useState<"BINANCE" | "OKX">("BINANCE");
  const [interval, setInterval] = useState<"60" | "240" | "D">("240");

  // TV 심볼 조합 (예: BINANCE:BTCUSDT)
  const tvSymbol = useMemo(() => `${exchange}:${sym}USDT`, [exchange, sym]);

  return (
    <div className="space-y-3">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="text-brand-ink/70 mr-1">거래소:</div>
        <div className="flex gap-1">
          {(["BINANCE", "OKX"] as const).map((ex) => (
            <button
              key={ex}
              onClick={() => setExchange(ex)}
              className={[
                "px-2 py-1 rounded-md border transition",
                exchange === ex
                  ? "bg-brand-accent/20 border-brand-accent/60 text-brand-accent"
                  : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
              ].join(" ")}
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="text-brand-ink/70 ml-4 mr-1">기간:</div>
        <div className="flex gap-1">
          {(["60", "240", "D"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={[
                "px-2 py-1 rounded-md border transition",
                interval === iv
                  ? "bg-brand-accent/20 border-brand-accent/60 text-brand-accent"
                  : "bg-brand-card/60 border-brand-line/40 text-brand-ink/80 hover:border-brand-line",
              ].join(" ")}
            >
              {iv === "60" ? "1H" : iv === "240" ? "4H" : "1D"}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <TvChart tvSymbol={tvSymbol} interval={interval} height={height} />
    </div>
  );
}