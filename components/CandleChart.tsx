// components/CandleChart.tsx
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
  days?: number;
  showSMA?: number[]; // 예: [20, 50]
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

    let stop = false;

    const makeSeriesSafely = async () => {
      // 1) 컨테이너 폭이 나올 때까지 대기 (최대 30번, 약 1초)
      let tries = 0;
      while (!stop && (ref.current?.clientWidth ?? 0) < 10 && tries < 30) {
        await new Promise((r) => requestAnimationFrame(r));
        tries++;
      }

      // 2) 그래도 작으면 최소폭 적용
      chart.applyOptions({ width: ensureWidth() });

      // 3) 시리즈 생성 (여기서야 addSeries 실행)
      let candle: ISeriesApi<"Candlestick">;
      if (hasAddCandle) {
        // v4
        // @ts-ignore
        candle = (chart as any).addCandlestickSeries();
      } else {
        // v5
        // @ts-ignore
        candle = (chart as any).addSeries({ type: "Candlestick" });
      }
      candle.applyOptions({
        upColor: "#16a34a",
        downColor: "#ef4444",
        borderUpColor: "#16a34a",
        borderDownColor: "#ef4444",
        wickUpColor: "#16a34a",
        wickDownColor: "#ef4444",
      });

      const maLines: ISeriesApi<"Line">[] = [];
      showSMA.forEach(() => {
        // v4/v5 호환
        // @ts-ignore
        const line = hasAddLine
          ? // @ts-ignore
            (chart as any).addLineSeries()
          : // @ts-ignore
            (chart as any).addSeries({ type: "Line" });
        line.applyOptions({ lineWidth: 2 });
        maLines.push(line);
      });

      // 4) 데이터 로드 후 setData
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${days}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const raw: [number, number, number, number, number][] = await res.json();

        if (stop) return;

        const data = raw.map(([ts, o, h, l, c]) => ({
          time: Math.floor(ts / 1000) as UTCTimestamp,
          open: o,
          high: h,
          low: l,
          close: c,
        }));

        candle.setData(data as unknown as CandlestickData<UTCTimestamp>[]);

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

    // 첫 페인트 뒤 한 번 더 보정
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
      className="w-full rounded-lg border border-brand-line/30 bg-brand-card/60"
      style={{ height }}
    />
  );
}