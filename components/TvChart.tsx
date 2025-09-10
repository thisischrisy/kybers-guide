"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** 간편 심볼 (fallback) */
  symbol?: "bitcoin" | "ethereum";
  /** TV 심볼(우선) 예: "BINANCE:BTCUSDT" */
  tvSymbol?: string;
  /** 시간 간격 */
  interval?: "15" | "30" | "60" | "120" | "240" | "D";
  /** 높이 */
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
  tvSymbol,
  interval = "240",
  height = 420,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[:]/g, "-");
  const [note, setNote] = useState<string>("");

  // 기본 매핑
  const map: Record<string, string> = {
    bitcoin: "BINANCE:BTCUSDT",
    ethereum: "BINANCE:ETHUSDT",
  };
  const finalSymbol = tvSymbol || map[symbol] || "BINANCE:BTCUSDT";

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
      try {
        if (!window.TradingView || !window.TradingView.widget) {
          setNote("TradingView 위젯 로딩 대기 중…");
          return;
        }
        // 공개 위젯: onChartReady/Study 호출 없이 기본 차트만
        new window.TradingView.widget({
          autosize: true,
          symbol: finalSymbol,
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
        setNote(""); // 성공
      } catch (e) {
        console.warn("[TvChart] widget create failed:", e);
        setNote("차트 초기화 실패. 애드블록/CSP를 확인해 주세요.");
      }
    };

    const attachScript = () => {
      if (window.TradingView) {
        createWidget();
        return;
      }
      if (!window.__tvScriptAppended) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.onload = () => {
          setNote(""); // 로드 성공
          createWidget();
        };
        s.onerror = () => {
          setNote("tv.js 로딩 실패(애드블록/CSP 가능성). 차트가 표시되지 않을 수 있습니다.");
        };
        document.body.appendChild(s);
        window.__tvScriptAppended = true;
      } else {
        // 이미 로드 중이면 폴링
        const t = setInterval(() => {
          if (window.TradingView) {
            clearInterval(t);
            createWidget();
          }
        }, 120);
        return () => clearInterval(t);
      }
    };

    attachScript();

    return () => {
      try {
        if (hostRef.current) hostRef.current.innerHTML = "";
      } catch {}
    };
  }, [finalSymbol, interval, containerId]);

  return (
    <div
      ref={hostRef}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    >
      {note && (
        <div className="absolute bottom-2 left-2 text-[11px] text-brand-ink/60 bg-black/30 px-2 py-1 rounded">
          {note}
        </div>
      )}
    </div>
  );
}