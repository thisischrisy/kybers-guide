"use client";

import { useEffect, useId, useRef } from "react";

type MiniDateRange =
  | "4H" // ✅ 추가
  | "1D"
  | "5D"
  | "1M"
  | "3M"
  | "6M"
  | "12M"
  | "YTD"
  | "ALL";

type Props = {
  tvSymbol: string;     // 예: "BINANCE:BTCUSDT"
  title?: string;
  dateRange?: MiniDateRange;
  height?: number;
};

declare global {
  interface Window {
    TradingView?: any;
    __tvScriptAppended?: boolean;
  }
}

/**
 * TvMini
 * - 일반 범위(1D, 5D, …)는 Mini 스타일로 렌더
 * - "4H" 요청 시 Mini가 지원하지 않으므로 Full 위젯을 interval=240(4시간봉)으로 렌더하되
 *   툴바/레전드 숨겨 "미니처럼" 보이게 처리
 */
export function TvMini({
  tvSymbol,
  title,
  dateRange = "1D",
  height = 180,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[:]/g, "-");

  useEffect(() => {
    if (!hostRef.current) return;

    // 컨테이너 초기화
    hostRef.current.innerHTML = "";
    const container = document.createElement("div");
    container.id = containerId;
    container.style.width = "100%";
    container.style.height = "100%";
    hostRef.current.appendChild(container);

    const createWidget = () => {
      if (!window.TradingView) return;

      // 4H → Full 위젯 + interval=240
      if (dateRange === "4H") {
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: tvSymbol,
            interval: "240", // 4시간 봉
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            hide_top_toolbar: true,
            hide_legend: true,
            allow_symbol_change: false,
            // 미니 느낌 최대화
            withdateranges: false,
            studies: [],
            toolbar_bg: "rgba(0,0,0,0)",
            container_id: containerId,
          });
        } catch (e) {
          console.warn("TradingView 4H widget init failed:", e);
        }
        return;
      }

      // 그 외(1D, 5D, 1M…): Mini 스타일(간결)
      try {
        // 일부 배포환경에서 MiniWidget/미니 개체명이 다를 수 있어 widget로 통일
        // dateRange를 직접 반영하기 위해 main widget 사용 + 레이아웃 단순화
        const interval =
          dateRange === "1D" ? "D" :
          dateRange === "5D" ? "60" : // 5D 미니 느낌 (1시간봉)
          dateRange === "1M" ? "120" :
          dateRange === "3M" ? "240" :
          dateRange === "6M" ? "D" :
          dateRange === "12M" ? "D" :
          dateRange === "YTD" ? "D" :
          dateRange === "ALL" ? "D" :
          "D";

        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          hide_top_toolbar: true,
          hide_legend: true,
          allow_symbol_change: false,
          withdateranges: false,
          studies: [],
          toolbar_bg: "rgba(0,0,0,0)",
          container_id: containerId,
        });
      } catch (e) {
        console.warn("TradingView mini-like widget init failed:", e);
      }
    };

    // 스크립트 로딩
    if (window.TradingView) {
      createWidget();
    } else {
      if (!window.__tvScriptAppended) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.onload = () => createWidget();
        document.body.appendChild(s);
        window.__tvScriptAppended = true;
      } else {
        const t = setInterval(() => {
          if (window.TradingView) {
            clearInterval(t);
            createWidget();
          }
        }, 100);
      }
    }

    return () => {
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {}
    };
  }, [tvSymbol, dateRange, containerId]);

  return (
    <div
      ref={hostRef}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
      aria-label={title || "mini-chart"}
    />
  );
}