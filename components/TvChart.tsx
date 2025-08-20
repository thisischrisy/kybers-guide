"use client";

import { useEffect, useRef } from "react";

type Props = {
  symbol?: "bitcoin" | "ethereum";
  interval?: "15" | "30" | "60" | "120" | "240" | "D";
  height?: number;
};

export function TvChart({ symbol = "bitcoin", interval = "240", height = 420 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // 컨테이너 비우기
    ref.current.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    container.appendChild(widget);
    ref.current.appendChild(container);

    // 스크립트 삽입
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        const tvSymbol = symbol === "bitcoin" ? "BINANCE:BTCUSDT" : "BINANCE:ETHUSDT";
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "rgba(0,0,0,0)",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: false,
          container_id: widget,
        });
      }
    };
    container.appendChild(s);

    // 높이 지정
    (ref.current as HTMLDivElement).style.height = `${height}px`;

    return () => {
      try {
        ref.current && (ref.current.innerHTML = "");
      } catch {}
    };
  }, [symbol, interval, height]);

  return (
    <div
      ref={ref}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    />
  );
}