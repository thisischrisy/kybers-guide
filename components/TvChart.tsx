"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  /** 간편심볼: 미지정 시 BINANCE:BTCUSDT 로 매핑 */
  symbol?: "bitcoin" | "ethereum";
  /** TV 심볼 직접 지정 (예: "BINANCE:SOLUSDT") */
  tvSymbol?: string;
  /** TV 위젯 간격 */
  interval?: "15" | "30" | "60" | "120" | "240" | "D";
  height?: number;

  /** 추가: MA 오버레이 길이들(순서대로 그려짐). 기본 [50,200,400] */
  maInputs?: number[];
  /** 추가: RSI 표시 여부 (기본 true) */
  showRsi?: boolean;
  /** 추가: RSI 기간(기본 14) */
  rsiLength?: number;
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
  maInputs = [50, 200, 400],
  showRsi = true,
  rsiLength = 14,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[:]/g, "-");

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
      if (!window.TradingView) return;

      try {
        const widget = new window.TradingView.widget({
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

        // 지표 오버레이는 차트 준비 후 추가
        widget.onChartReady(() => {
          const chart = widget.chart();

          // 이동평균(단순) 오버레이: MA 50 / 200 / 400
          // 이름은 TradingView 기본 스터디 명칭을 사용
          maInputs.forEach((len) => {
            try {
              chart.createStudy("Moving Average", false, false, [len]);
            } catch (e) {
              console.warn("MA overlay failed:", e);
            }
          });

          // RSI 오버레이
          if (showRsi) {
            try {
              chart.createStudy("Relative Strength Index", false, false, [rsiLength]);
            } catch (e) {
              console.warn("RSI overlay failed:", e);
            }
          }
        });
      } catch (e) {
        console.warn("TradingView init failed:", e);
      }
    };

    // tv.js 로드/준비
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
  }, [finalSymbol, interval, containerId, maInputs, showRsi, rsiLength]);

  return (
    <div
      ref={hostRef}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    />
  );
}