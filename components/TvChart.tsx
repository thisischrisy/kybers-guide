"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeries,   // ✅ v5: 시리즈 정의 상수
  Time,
} from "lightweight-charts";

type TF = "1h" | "4h" | "1d";

type Props = {
  /** 기본 1d */
  interval?: TF;
  height?: number;
  /** 표시할 MA 길이들 */
  maInputs?: number[];
};

// ---- 유틸 ----
function sma(vals: number[], len: number): number[] {
  const out: number[] = Array(vals.length).fill(NaN);
  if (len <= 1) return vals.slice();
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (Number.isFinite(v)) sum += v;
    if (i >= len) {
      const prev = vals[i - len];
      if (Number.isFinite(prev)) sum -= prev;
    }
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
}

/** hourly -> 4h (4개씩 묶어 마지막 캔들 close 사용) */
function to4hCloses(hourly: { time: number; close: number }[]) {
  const out: { time: number; close: number }[] = [];
  for (let i = 0; i < hourly.length; i += 4) {
    const chunk = hourly.slice(i, i + 4);
    const last = chunk.at(-1);
    if (last && Number.isFinite(last.close)) out.push(last);
  }
  return out;
}

/** 내부 API → 일봉 closes */
async function fetchDaily(days = 365): Promise<{ time: number; close: number }[]> {
  const r = await fetch(`/api/btc/daily?days=${days}`, { cache: "no-store" });
  if (!r.ok) return [];
  const j: unknown = await r.json();
  const raw = (j as any)?.prices ?? (j as any)?.가격 ?? [];
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((p: unknown): { time: number; close: number } => {
      if (Array.isArray(p) && p.length >= 2) {
        const t = Math.floor(Number((p as [unknown, unknown])[0]) / 1000);
        const c = Number((p as [unknown, unknown])[1]);
        return { time: t, close: c };
      }
      return { time: NaN, close: NaN };
    })
    .filter((x: { time: number; close: number }) => Number.isFinite(x.time) && Number.isFinite(x.close));
}

/** 내부 API → 시간봉 closes */
async function fetchHourly(days = 60): Promise<{ time: number; close: number }[]> {
  const r = await fetch(`/api/btc/hourly?days=${days}`, { cache: "no-store" });
  if (!r.ok) return [];
  const j: unknown = await r.json();
  const raw = (j as any)?.prices ?? (j as any)?.가격 ?? [];
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((p: unknown): { time: number; close: number } => {
      if (Array.isArray(p) && p.length >= 2) {
        const t = Math.floor(Number((p as [unknown, unknown])[0]) / 1000);
        const c = Number((p as [unknown, unknown])[1]);
        return { time: t, close: c };
      }
      return { time: NaN, close: NaN };
    })
    .filter((x: { time: number; close: number }) => Number.isFinite(x.time) && Number.isFinite(x.close));
}

export function TvChart({
  interval = "1d",
  height = 420,
  maInputs = [50, 200, 400],
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [data, setData] = useState<{ time: number; close: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // 데이터 로드
  useEffect(() => {
    let aborted = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        if (interval === "1d") {
          const d = await fetchDaily(365);
          if (!aborted) setData(d);
        } else if (interval === "1h") {
          const h = await fetchHourly(60);
          if (!aborted) setData(h);
        } else {
          const h = await fetchHourly(60);
          const h4 = to4hCloses(h);
          if (!aborted) setData(h4);
        }
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "load failed");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [interval]);

  // 라인 데이터 생성
  const seriesLines = useMemo(() => {
    const closes = data.map((d) => d.close);
    const times = data.map((d) => d.time as number);

    const toLineData = (arr: number[]): LineData[] =>
      arr
        .map((v, i) => ({ time: times[i] as Time, value: Number.isFinite(v) ? v : NaN }))
        .filter((p: LineData) => Number.isFinite(p.value as number));

    const out: Record<string, LineData[]> = { price: toLineData(closes) };
    for (const len of maInputs) out[`ma${len}`] = toLineData(sma(closes, len));
    return out;
  }, [data, maInputs]);

  // 차트 생성/업데이트 (v5: addSeries(LineSeries, options))
  useEffect(() => {
    if (!hostRef.current) return;

    if (!chartRef.current) {
      const chart = createChart(hostRef.current, {
        height,
        layout: { background: { color: "transparent" }, textColor: "#C8CCD0" },
        grid: { vertLines: { color: "rgba(255,255,255,0.06)" }, horzLines: { color: "rgba(255,255,255,0.06)" } },
        timeScale: { borderColor: "rgba(255,255,255,0.1)" },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;

      // 메인 가격선
      const price = chart.addSeries(LineSeries, { lineWidth: 2, color: "#E5E7EB" }) as ISeriesApi<"Line">;

      // MA 시리즈
      const palette = ["#4ADE80", "#60A5FA", "#F59E0B", "#F472B6", "#A78BFA"];
      const maSeries: Record<string, ISeriesApi<"Line">> = {};
      maInputs.forEach((len, idx) => {
        const s = chart.addSeries(LineSeries, {
          lineWidth: 2,
          color: palette[idx % palette.length],
        }) as ISeriesApi<"Line">;
        maSeries[`ma${len}`] = s;
      });

      (chart as any).__series = { price, ...maSeries };
    }

    const chart = chartRef.current!;
    const s = (chart as any).__series as Record<string, ISeriesApi<"Line">>;

    if (s.price && seriesLines.price) s.price.setData(seriesLines.price);
    for (const len of maInputs) {
      const key = `ma${len}`;
      if (s[key] && seriesLines[key]) s[key].setData(seriesLines[key]);
    }

    chart.timeScale().fitContent();
    chart.applyOptions({ height });

    return () => {};
  }, [seriesLines, height, maInputs]);

  return (
    <div className="rounded-xl border border-brand-line/30 bg-brand-card/60 p-3">
      <div className="text-xs mb-2 text-brand-ink/60">
        {loading ? "차트 로딩 중…" : err ? `에러: ${err}` : `MA ${maInputs.join("/")} 표시`}
      </div>
      <div ref={hostRef} style={{ height }} />
      <div className="mt-2 text-[11px] text-brand-ink/60">
        Lightweight Charts v5 + MA(50/200/400)
      </div>
    </div>
  );
}