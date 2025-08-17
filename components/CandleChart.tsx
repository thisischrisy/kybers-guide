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
  days?: number;       // CoinGecko OHLC는 1,7,14,30,90,180,365만 지원
  showSMA?: number[];  // [20,50] 등
  height?: number;
};

export function CandleChart({
  symbol = "bitcoin",
  days = 180,
  showSMA = [20, 50],
  height = 360,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ensureWidth = () => Math.max(ref.current?.clientWidth || 0, 320);

    const chart = createChart(ref.current, {
      width: ensureWidth(),
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#d1d5db" },
      grid: { vertLines: { color: "rgba(255,255,255,0.08)" }, horzLines: { color: "rgba(255,255,255,0.08)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.15)" },
      timeScale: { borderColor: "rgba(255,255,255,0.15)" },
    });

    // v4/v5 호환
    // @ts-ignore
    const hasAddCandle = typeof (chart as any).addCandlestickSeries === "function";
    // @ts-ignore
    const hasAddLine = typeof (chart as any).addLineSeries === "function";

    let stop = false;

    const makeSeriesSafely = async () => {
      // 폭 안정될 때까지 짧게 대기
      let tries = 0;
      while (!stop && (ref.current?.clientWidth ?? 0) < 10 && tries < 30) {
        await new Promise((r) => requestAnimationFrame(r));
        tries++;
      }
      chart.applyOptions({ width: ensureWidth() });

      // 시리즈 생성
      let candle: ISeriesApi<"Candlestick">;
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

      const maLines: ISeriesApi<"Line">[] = [];
      showSMA.forEach(() => {
        // @ts-ignore
        const line = hasAddLine
          ? // @ts-ignore
            (chart as any).addLineSeries()
          : // @ts-ignore
            (chart as any).addSeries({ type: "Line" });
        line.applyOptions({ lineWidth: 2 });
        maLines.push(line);
      });

      try {
        // 기존
        // const url = `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${days}`;
        // const res = await fetch(url);
        // if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        // const raw: [number, number, number, number, number][] = await res.json();

        // 교체:
        const url = `/api/ohlc?symbol=${symbol}&days=${days}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const payload: { data?: [number, number, number, number, number][] } = await res.json();
        const raw = payload.data ?? [];

        if (stop) return;

        if (!Array.isArray(raw) || raw.length === 0) {
          console.warn("OHLC empty:", { symbol, days });
          // 데이터 없음 표시(임시 라벨)
          const empty = ref.current?.querySelector(".lw-empty");
          if (!empty) {
            const label = document.createElement("div");
            label.className = "lw-empty";
            label.style.position = "absolute";
            label.style.inset = "0";
            label.style.display = "flex";
            label.style.alignItems = "center";
            label.style.justifyContent = "center";
            label.style.fontSize = "12px";
            label.style.color = "rgba(255,255,255,0.6)";
            label.textContent = "데이터 수집 중… (잠시 후 자동 갱신)";
            ref.current?.appendChild(label);
          }
          return;
        }

        const data = raw.map(([ts, o, h, l, c]) => ({
          time: Math.floor(ts / 1000) as UTCTimestamp,
          open: o, high: h, low: l, close: c,
        }));

        candle.setData(data as unknown as CandlestickData<UTCTimestamp>[]);
        const badge = document.createElement("div");
            badge.style.position = "absolute";
            badge.style.right = "8px";
            badge.style.bottom = "8px";
            badge.style.fontSize = "11px";
            badge.style.opacity = "0.6";
            badge.textContent = `${raw.length} bars`;
            ref.current?.appendChild(badge);

        chart.timeScale().fitContent(); // ✅ 뷰포트 보정

        // SMA
        const closes = data.map((d) => d.close);
        const times = data.map((d) => d.time);
        showSMA.forEach((p, idx) => {
          const s = sma(closes, p)
            .map((v, i) => (v == null ? null : { time: times[i], value: v }))
            .filter(Boolean) as { time: UTCTimestamp; value: number }[];
          maLines[idx].setData(s as unknown as LineData<UTCTimestamp>[]);
        });
      } catch (e) {
        console.warn("CandleChart error", e);
      }
    };

    makeSeriesSafely();

    const onResize = () => chart.applyOptions({ width: ensureWidth() });
    window.addEventListener("resize", onResize);
    requestAnimationFrame(onResize);

    return () => {
      stop = true;
      window.removeEventListener("resize", onResize);
      chart.remove();
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