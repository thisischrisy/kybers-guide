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

    // ✅ 컨테이너 폭 확보(0px일 때 addSeries가 assertion 터질 수 있음)
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
      // ⚠️ v5에서 crosshair 모드 값이 바뀌면서 assertion을 유발할 수 있으니 제거
      // crosshair: { mode: 1 },
    });

    // v4/v5 호환: 시리즈 생성 (옵션은 나중에 applyOptions로)
    // @ts-ignore 런타임 체크
    const hasAddCandle = typeof (chart as any).addCandlestickSeries === "function";
    // @ts-ignore 런타임 체크
    const hasAddLine = typeof (chart as any).addLineSeries === "function";

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

    // 색상은 시리즈 생성 후 안전하게 적용
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
      // v4/v5 분기
      // @ts-ignore
      const line = hasAddLine
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

        const data = raw.map(([ts, o, h, l, c]) => ({
          time: Math.floor(ts / 1000) as UTCTimestamp, // ✅ v5는 UTCTimestamp 요구
          open: o,
          high: h,
          low: l,
          close: c,
        }));

        if (stop) return;

        candle.setData(data as unknown as CandlestickData<UTCTimestamp>[]);

        // SMA(종가 기준)
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
    })();

    const onResize = () => {
      chart.applyOptions({ width: ensureWidth() });
    };
    // 최초 렌더 직후 한 번 더 보장
    requestAnimationFrame(onResize);
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