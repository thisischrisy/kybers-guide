"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  symbol?: "bitcoin" | "ethereum";
  interval?: "15" | "30" | "60" | "120" | "240" | "D";
  height?: number;
};

declare global {
  interface Window {
    TradingView?: any;
    __tvScriptAppended?: boolean;
  }
}

export function TvChart({
  symbol = "bitcoin",
  interval = "240",
  height = 420,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // 고유 id 생성 (문자열)
  const containerId = useId().replace(/[:]/g, "-");

  useEffect(() => {
    if (!hostRef.current) return;

    // 호스트 비우고, 고유 id 가진 컨테이너 div를 만듭니다.
    hostRef.current.innerHTML = "";
    const container = document.createElement("div");
    container.id = containerId;
    container.style.width = "100%";
    container.style.height = "100%";
    hostRef.current.appendChild(container);

    // TradingView 위젯 생성 함수
    const createWidget = () => {
      if (!window.TradingView) return; // 아직 로드 전
      const tvSymbol = symbol === "bitcoin" ? "BINANCE:BTCUSDT" : "BINANCE:ETHUSDT";
      try {
        // container_id는 문자열 id 여야 합니다!
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
          container_id: containerId,
        });
      } catch (e) {
        console.warn("TradingView init failed:", e);
      }
    };

    // tv.js가 이미 로드됐는지 확인
    if (window.TradingView) {
      createWidget();
    } else {
      // 중복 로드 방지
      if (!window.__tvScriptAppended) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.onload = () => {
          createWidget();
        };
        document.body.appendChild(s);
        window.__tvScriptAppended = true;
      } else {
        // 이미 다른 컴포넌트가 로드 중이면, 약간 기다렸다가 시도
        const t = setInterval(() => {
          if (window.TradingView) {
            clearInterval(t);
            createWidget();
          }
        }, 100);
      }
    }

    // 언마운트 시 정리
    return () => {
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {}
    };
  }, [symbol, interval, containerId]);

  return (
    <div
      ref={hostRef}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    />
  );
}