"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
} from "lightweight-charts";
import { createChart } from "lightweight-charts";

type TF = "1h" | "4h" | "1d";
type Point = { time: number; close: number };

function sma(arr: number[], len: number): number[] {
  const out: number[] = Array(arr.length).fill(NaN);
  if (len <= 1) return arr.slice();
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) sum += v;
    if (i >= len) {
      const prev = arr[i - len];
      if (Number.isFinite(prev)) sum -= prev;
    }
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
}

function to4h(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 4) {
    const last = points[Math.min(points.length - 1, i + 3)];
    if (last && Number.isFinite(last.close)) out.push(last);
  }
  return out;
}

function toLineData(points: Point[], values?: number[]): LineData[] {
  if (!values) {
    return points
      .map((p): LineData => ({ time: p.time as Time, value: p.close }))
      .filter((d): d is LineData => Number.isFinite(d.value));
  }
  return points
    .map((p, i): LineData => ({ time: p.time as Time, value: values[i] }))
    .filter((d): d is LineData => Number.isFinite(d.value));
}

async function fetchDaily(days = 365): Promise<Point[]> {
  const r = await fetch(`/api/btc/daily?days=${days}`, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const raw: unknown[] = Array.isArray((j as any)?.prices)
    ? (j as any).prices
    : Array.isArray((j as any)?.가격)
    ? (j as any).가격
    : [];
  return raw
    .map((p): Point => {
      const arr = p as [number, number];
      return { time: Math.floor(Number(arr[0]) / 1000), close: Number(arr[1]) };
    })
    .filter((x: Point): x is Point => Number.isFinite(x.time) && Number.isFinite(x.close));
}

async function fetchHourly(days = 60): Promise<Point[]> {
  const r = await fetch(`/api/btc/hourly?days=${days}`, { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  const raw: unknown[] = Array.isArray((j as any)?.prices)
    ? (j as any).prices
    : Array.isArray((j as any)?.가격)
    ? (j as any).가격
    : [];
  return raw
    .map((p): Point => {
      const arr = p as [number, number];
      return { time: Math.floor(Number(arr[0]) / 1000), close: Number(arr[1]) };
    })
    .filter((x: Point): x is Point => Number.isFinite(x.time) && Number.isFinite(x.close));
}

// 안전한 라인 시리즈 추가 (버전 차이 흡수)
function addLine(chart: IChartApi): ISeriesApi<"Line"> {
  const anyChart = chart as any;
  if (typeof anyChart.addLineSeries === "function") {
    return anyChart.addLineSeries({}); // v3/v4 스타일
  }
  // v5 스타일 폴백
  const s = anyChart.addSeries({ type: "Line" });
  return s as ISeriesApi<"Line">;
}

type Props = { height?: number; initialTf?: TF };

export default function ChartLite({ height = 360, initialTf = "1d" }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [tf, setTf] = useState<TF>(initialTf);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  const [points, setPoints] = useState<Point[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);

  const lines = useMemo(() => {
    const closes = points.map((p) => p.close);
    const ma50 = sma(closes, 50);
    const ma200 = sma(closes, 200);
    const ma400 = sma(closes, 400);
    return {
      price: toLineData(points),
      ma50: toLineData(points, ma50),
      ma200: toLineData(points, ma200),
      ma400: toLineData(points, ma400),
    };
  }, [points]);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setErr("");
    (async () => {
      try {
        if (tf === "1d") {
          const d = await fetchDaily(365);
          if (aborted) return;
          setPoints(d);
          setLastPrice(d.at(-1)?.close ?? null);
        } else {
          const h = await fetchHourly(60);
          if (aborted) return;
          const src = tf === "1h" ? h : to4h(h);
          setPoints(src);
          setLastPrice(src.at(-1)?.close ?? null);
        }
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "load failed");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [tf]);

  useEffect(() => {
    if (!hostRef.current) return;

    if (!chartRef.current) {
      const chart = createChart(hostRef.current, {
        height,
        layout: { background: { color: "transparent" }, textColor: "#C8CCD0" },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        timeScale: { borderColor: "rgba(255,255,255,0.1)" },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;

      const price = addLine(chart);
      price.applyOptions({ lineWidth: 2, color: "#E5E7EB" });

      const ma50 = addLine(chart);
      ma50.applyOptions({ lineWidth: 2, color: "#4ADE80" });

      const ma200 = addLine(chart);
      ma200.applyOptions({ lineWidth: 2, color: "#60A5FA" });

      const ma400 = addLine(chart);
      ma400.applyOptions({ lineWidth: 2, color: "#F59E0B" });

      (chart as any).__series = { price, ma50, ma200, ma400 };
    }

    const chart = chartRef.current!;
    const s = (chart as any).__series as {
      price: ISeriesApi<"Line">;
      ma50: ISeriesApi<"Line">;
      ma200: ISeriesApi<"Line">;
      ma400: ISeriesApi<"Line">;
    };

    s.price.setData(lines.price);
    s.ma50.setData(lines.ma50);
    s.ma200.setData(lines.ma200);
    s.ma400.setData(lines.ma400);

    chart.timeScale().fitContent();
  }, [lines, height]);

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setTf("1h")}
          className={`text-xs px-2 py-1 rounded border ${
            tf === "1h" ? "border-brand-gold text-brand-gold" : "border-brand-line/40 text-brand-ink/70"
          }`}
          disabled={loading}
        >
          1h
        </button>
        <button
          onClick={() => setTf("4h")}
          className={`text-xs px-2 py-1 rounded border ${
            tf === "4h" ? "border-brand-gold text-brand-gold" : "border-brand-line/40 text-brand-ink/70"
          }`}
          disabled={loading}
        >
          4h
        </button>
        <button
          onClick={() => setTf("1d")}
          className={`text-xs px-2 py-1 rounded border ${
            tf === "1d" ? "border-brand-gold text-brand-gold" : "border-brand-line/40 text-brand-ink/70"
          }`}
          disabled={loading}
        >
          1d
        </button>
        <div className="text-xs ml-auto text-brand-ink/60">
          {loading ? "로딩…" : err ? `에러: ${err}` : lastPrice != null ? `현재가: $${Math.round(lastPrice).toLocaleString()}` : ""}
        </div>
      </div>
      <div ref={hostRef} style={{ height }} />
      <div className="mt-2 text-[11px] text-brand-ink/60">선형 차트 + MA(50/200/400)</div>
    </div>
  );
}