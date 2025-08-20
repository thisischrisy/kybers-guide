"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  tvSymbol: string;      // "BINANCE:BTCUSDT" 같은 식별자
  title?: string;        // 카드 상단 제목
  dateRange?: "1D" | "5D" | "1M" | "3M" | "6M" | "12M" | "YTD" | "ALL";
  height?: number;
};

// TradingView 미니 심볼 오버뷰 위젯
// 스펙 문서: https://www.tradingview.com/widget/mini-symbol-overview/
export function TvMini({
  tvSymbol,
  title,
  dateRange = "1M",
  height = 180,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useId().replace(/[:]/g, "-");

  useEffect(() => {
    if (!hostRef.current) return;

    hostRef.current.innerHTML = "";

    // TradingView는 이 위젯을 script 태그에 JSON을 innerHTML로 넣는 방식으로 초기화함
    const container = document.createElement("div");
    container.className = "tradingview-widget-container";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.id = widgetId;
    container.appendChild(widget);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;

    const config = {
      symbol: tvSymbol,
      width: "100%",
      height: height,
      locale: "en",
      dateRange: dateRange,
      colorTheme: "dark",
      trendLineColor: "#F5C451", // 골드 톤
      underLineColor: "rgba(245,196,81,0.15)",
      isTransparent: true,
      autosize: true,
      largeChartUrl: "", // 클릭 시 큰 차트 링크 없앰
      noTimeScale: false,
    };

    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
    hostRef.current.appendChild(container);

    return () => {
      try { hostRef.current && (hostRef.current.innerHTML = ""); } catch {}
    };
  }, [tvSymbol, dateRange, height, widgetId]);

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/50 p-4">
      {title ? <div className="text-sm mb-2 text-brand-ink/80">{title}</div> : null}
      <div ref={hostRef} style={{ height }} />
    </div>
  );
}