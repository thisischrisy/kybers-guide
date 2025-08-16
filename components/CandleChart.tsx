"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";

// 간단 SMA 유틸
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

type OHLC = { time: UTCTimestamp; open: number; high: number; low: number; close: number };

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

    const chart = createChart(ref.current, {
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
      crosshair: { mode: 1 },
    });

    // v4/v5 호환: 캔들 시리즈 만들기
    let candle: ISeriesApi<"Candlestick">;
    // @ts-ignore - 런타임에서 존재 여부 체크
    if (typeof (chart as any).addCandlestickSeries === "function") {
      // v4 방식
      // @ts-ignore
      candle = (chart as any).addCandlestickSeries({
        upColor: "#16a34a",
        downColor: "#ef4444",
        borderUpColor: "#16a34a",
        borderDownColor: "#ef4444",
        wickUpColor: "#16a34a",
        wickDownColor: "#ef4444",
      });
    } else {
      // v5 방식
      // @ts-ignore
      candle = (chart as any).addSeries({
        type: "Candlestick",
        upColor: "#16a34a",
        downColor: "#ef4444",
        borderUpColor: "#16a34a",
        borderDownColor: "#ef4444",
        wickUpColor: "#16a34a",
        wickDownColor: "#ef4444",
      });
    }

    // v4/v5 호환: 라인 시리즈(SMA들)
    const maLines: ISeriesApi<"Line">[] = [];
    showSMA.forEach(() => {
      // @ts-ignore
      const line =
        // @ts-ignore
        typeof (chart as any).addLineSeries === "function"
          ? // v4
            // @ts-ignore
            (chart as any).addLineSeries({ lineWidth: 2 })
          : // v5
            // @ts-ignore
            (chart as any).addSeries({ type: "Line", lineWidth: 2 });
      maLines.push(line);
    });

    let stop = false;

    (async () => {
      try {
        // CoinGecko OHLC: [timestamp(ms), open, high, low, close]
        const url = `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${days}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fetch failed");
        const raw: [number, number, number, number, number][] = await res.json();

        const data: OHLC[] = raw.map(([ts, o, h, l, c]) => ({
          time: Math.floor(ts / 1000) as UTCTimestamp, // ✅ UTCTimestamp 요구
          open: o,
          high: h,
          low: l,
          close: c,
        }));

        if (stop) return;

        // 캔들 데이터 타입 명시
        candle.setData(data as unknown as CandlestickData<UTCTimestamp>[]);

        // SMA 계산(종가 기준)
        const closes = data.map((d) => d.close);
        const times = data.map((d) => d.time);
        showSMA.forEach((p, idx) => {
          const series = maLines[idx];
          const s = sma(closes, p)
            .map((v, i) => (v == null ? null : { time: times[i], value: v }))
            .filter(Boolean) as { time: UTCTimestamp; value: number }[];

          // 타입이 까다로워서 명시적으로 단언
          series.setData(s as unknown as LineData<UTCTimestamp>[]);
        });
      } catch (e) {
        console.warn("CandleChart error", e);
      }
    })();

    const onResize = () =>
      chart.applyOptions({ width: ref.current?.clientWidth || 600 });
    onResize();
    window.addEventListener("resize", onResize);

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