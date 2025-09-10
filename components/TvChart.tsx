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
  /** 오버레이: 이동평균선 길이 배열 (예: [50,200,400]) */
  maInputs?: number[];
  /** RSI 표시 여부 */
  showRsi?: boolean;
  /** RSI 길이 */
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
  maInputs = [],
  showRsi = false,
  rsiLength = 14,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const containerId = useId().replace(/[:]/g, "-");
  const [overlayNote, setOverlayNote] = useState<string>("");

  // 기본 매핑
  const map: Record<string, string> = {
    bitcoin: "BINANCE:BTCUSDT",
    ethereum: "BINANCE:ETHUSDT",
  };
  const finalSymbol = tvSymbol || map[symbol] || "BINANCE:BTCUSDT";

  useEffect(() => {
    if (!hostRef.current) return;

    // 컨테이너 비우고 div 준비
    hostRef.current.innerHTML = "";
    const container = document.createElement("div");
    container.id = containerId;
    container.style.width = "100%";
    container.style.height = "100%";
    hostRef.current.appendChild(container);

    const init = () => {
      if (!window.TradingView || !window.TradingView.widget) return;

      try {
        // 안전한 onready → widget 생성 → onChartReady
        window.TradingView.onready(() => {
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

          // 특성 검사: onChartReady 지원 시에만 오버레이 시도
          if (widget && typeof widget.onChartReady === "function") {
            widget.onChartReady(() => {
              const chart =
                (typeof widget.chart === "function" && widget.chart()) ||
                (typeof widget.activeChart === "function" && widget.activeChart());

              if (!chart || typeof chart.createStudy !== "function") {
                setOverlayNote("오버레이 엔진 미지원(무료 위젯 제한) — 기본 차트만 표시됩니다.");
                return;
              }

              try {
                // MA들 추가 (색상은 지정 안함 — 기본 테마 사용)
                maInputs.forEach((len, idx) => {
                  if (typeof len === "number" && isFinite(len) && len > 0) {
                    chart.createStudy("Moving Average", false, false, [len, "close"]);
                  }
                });

                // RSI 추가
                if (showRsi) {
                  chart.createStudy("Relative Strength Index", false, false, [rsiLength]);
                }
              } catch (e) {
                console.warn("[TvChart] studies attach failed:", e);
                setOverlayNote("오버레이 추가 실패 — 기본 차트만 표시됩니다.");
              }
            });
          } else {
            // onChartReady 자체가 없다면 조용히 폴백
            setOverlayNote("오버레이 엔진 미지원 — 기본 차트만 표시됩니다.");
          }
        });
      } catch (e) {
        console.warn("[TvChart] init failed:", e);
        setOverlayNote("차트 초기화 실패.");
      }
    };

    // tv.js 로딩
    if (window.TradingView) {
      init();
    } else {
      if (!window.__tvScriptAppended) {
        const s = document.createElement("script");
        s.src = "https://s3.tradingview.com/tv.js";
        s.async = true;
        s.onload = () => init();
        document.body.appendChild(s);
        window.__tvScriptAppended = true;
      } else {
        // 이미 다른 곳에서 로드 중이면 폴링
        const t = setInterval(() => {
          if (window.TradingView) {
            clearInterval(t);
            init();
          }
        }, 100);
        // 클린업
        return () => clearInterval(t);
      }
    }

    // 언마운트 클린업
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
    >
      {overlayNote && (
        <div className="absolute bottom-2 left-2 text-[11px] text-brand-ink/60 bg-black/30 px-2 py-1 rounded">
          {overlayNote}
        </div>
      )}
    </div>
  );
}