"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";

// 간단 SMA
function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = +(sum / period).toFixed(2);
  }
  return out;
}

type Props = {
  symbol?: "bitcoin" | "ethereum";
  days?: number;       // 1/7/14/30/90/180/365
  showSMA?: number[];  // [20, 50] 등
  height?: number;
};

// TradingView 폴백
function renderTVFallback(el: HTMLDivElement, symbol: "bitcoin" | "ethereum") {
  // 기존 내용 클리어
  el.innerHTML = "";
  el.style.background = "transparent";
  el.style.position = "relative";

  const container = document.createElement("div");
  container.className = "tradingview-widget-container";
  const widget = document.createElement("div");
  widget.className = "tradingview-widget-container__widget";
  container.appendChild(widget);
  el.appendChild(container);

  const s = document.createElement("script");
  s.src = "https://s3.tradingview.com/tv.js";
  s.async = true;
  s.onload = () => {
    // @ts-ignore
    if (window.TradingView) {
      // 심볼 매핑
      const tvSymbol = symbol === "bitcoin" ? "BINANCE:BTCUSDT" : "BINANCE:ETHUSDT";
      // @ts-ignore
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: "240", // 4h 기본
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

  // 좌하단 안내
  const note = document.createElement("div");
  note.style.position = "absolute";
  note.style.left = "8px";
  note.style.bottom = "8px";
  note.style.fontSize = "11px";
  note.style.opacity = "0.6";
  note.textContent = "Fallback: TradingView widget";
  el.appendChild(note);
}

export function CandleChart({
  symbol = "bitcoin",
  days = 180,
  showSMA = [20, 50],
  height = 360,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let stop = false;
    if (!ref.current) return;

    const ensureWidth = () => Math.max(ref.current?.clientWidth || 0, 320);

    // 차트 생성
    const chart = createChart(ref.current, {
      width: ensureWidth(),
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.08)" },
        horzLines: { color: "rgba(255,255,255,0.08)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.15)" },
      timeScale: { borderColor: "rgba(255,255,255,0.15)" },
    });

    const hasAddCandle = typeof (chart as any).addCandlestickSeries === "function";
    const hasAddLine = typeof (chart as any).addLineSeries === "function";

    const makeSeriesSafely = async () => {
      // 폭 안정될 때까지 대기
      let tries = 0;
      while (!stop && (ref.current?.clientWidth ?? 0) < 10 && tries < 30) {
        await new Promise((r) => requestAnimationFrame(r));
        tries++;
      }
      chart.applyOptions({ width: ensureWidth() });

      let candle: ISeriesApi<"Candlestick">;
      const maLines: ISeriesApi<"Line">[] = [];

      try {
        // 시리즈 생성 (여기서 assertion이 날 수 있음)
        if (hasAddCandle) {
          // @ts-ignore
          candle = (chart as any).addCandlestickSeries();
        } else {
          // @ts-ignore
          candle = (chart as any).addSeries({ type: "Candlestick" });
        }
        candle.applyOptions({
          upColor: "#16a34a", downColor: "#ef4444",
          borderUpColor: "#16a34a", borderDownColor: "#ef4444",
          wickUpColor: "#16a34a", wickDownColor: "#ef4444",
        });

        showSMA.forEach(() => {
          // @ts-ignore
          const line = hasAddLine
            ? // @ts-ignore
              (chart as any).addLineSeries()
            : // @ts-ignore
              (chart as any).addSeries({ type: "Line" });
        // @ts-ignore
          line.applyOptions({ lineWidth: 2 });
          maLines.push(line);
        });
      } catch (err) {
        console.warn("addSeries assertion, fallback to TradingView", err);
        chart.remove();
        if (ref.current) renderTVFallback(ref.current, symbol);
        return;
      }

      // 데이터 로드
      try {
        const url = `/api/ohlc?symbol=${symbol}&days=${days}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const payload: { data?: [number, number, number, number, number][] } = await res.json();
        const raw = payload.data ?? [];

        if (stop) return;

        if (!Array.isArray(raw) || raw.length === 0) {
          console.warn("OHLC empty:", { symbol, days });
          // TV 폴백으로 전환 (원하면 유지해도 됨)
          chart.remove();
          if (ref.current) renderTVFallback(ref.current, symbol);
          return;
        }

        const data = raw.map(([ts, o, h, l, c]) => ({
          time: Math.floor(ts / 1000) as UTCTimestamp,
          open: o, high: h, low: l, close: c,
        }));

        candle.setData(data as unknown as CandlestickData<UTCTimestamp>[]);
        chart.timeScale().fitContent();

        const closes = data.map((d) => d.close);
        const times = data.map((d) => d.time);
        showSMA.forEach((p, idx) => {
          const s = sma(closes, p)
            .map((v, i) => (v == null ? null : { time: times[i], value: v }))
            .filter(Boolean) as { time: UTCTimestamp; value: number }[];
          maLines[idx].setData(s as unknown as LineData<UTCTimestamp>[]);
        });

        // 데이터 개수 배지(디버그용)
        const badge = document.createElement("div");
        badge.style.position = "absolute";
        badge.style.right = "8px";
        badge.style.bottom = "8px";
        badge.style.fontSize = "11px";
        badge.style.opacity = "0.6";
        badge.textContent = `${raw.length} bars`;
        ref.current?.appendChild(badge);
      } catch (err) {
        console.warn("fetch/parse error, fallback to TradingView", err);
        chart.remove();
        if (ref.current) renderTVFallback(ref.current, symbol);
        return;
      }
    };

    makeSeriesSafely();

    const onResize = () => chart.applyOptions({ width: ensureWidth() });
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);

    return () => {
      stop = true;
      window.removeEventListener("resize", onResize);
      try { chart.remove(); } catch {}
    };
  }, [symbol, days, showSMA.join(","), height]);

  return (
    <div
      ref={ref}
      className="relative w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    />
  );
}