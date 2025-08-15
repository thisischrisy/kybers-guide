"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineController,
  ChartOptions,
  ChartData,
  Filler,
} from "chart.js";

Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineController,
  Filler
);

type Props = {
  labels: string[];         // 날짜 라벨 (간단 문자열)
  closes: number[];         // 종가 (동일 길이)
  bands: number[];          // 분위 경계값들 (오름차순, 예: [q0,q12.5,...,q100])
  lastPrice: number;        // 현재가
};

export function RainbowLite({ labels, closes, bands, lastPrice }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;

    // 밴드 영역을 배경으로 칠하기 (플러그인)
    const plugin = {
      id: "rainbow-bands",
      beforeDraw: (c: Chart) => {
        const { chartArea, scales } = c;
        const { top, bottom, left, right } = chartArea;
        const y = scales.y;

        // 상단(고평가) -> 하단(저평가) 순으로 색상
        const colors = [
          "rgba(239, 68, 68, 0.15)",   // 붉은색 계열
          "rgba(245, 158, 11, 0.15)",  // 주황
          "rgba(234, 179, 8, 0.15)",   // 노랑
          "rgba(16, 185, 129, 0.15)",  // 초록
          "rgba(5, 150, 105, 0.15)",   // 진초록
          "rgba(3, 105, 161, 0.15)",   // 청록/파랑
          "rgba(99, 102, 241, 0.15)",  // 보라
          "rgba(168, 85, 247, 0.15)"   // 보라2
        ];

        // bands가 n개면 영역은 n-1개
        for (let i = bands.length - 1, ci = 0; i > 0; i--, ci++) {
          const yTop = y.getPixelForValue(bands[i]);
          const yBot = y.getPixelForValue(bands[i - 1]);
          ctx.save();
          ctx.fillStyle = colors[ci % colors.length];
          ctx.fillRect(left, Math.min(yTop, yBot), right - left, Math.abs(yTop - yBot));
          ctx.restore();
        }
      }
    };

    const data: ChartData<"line", number[], string> = {
      labels,
      datasets: [
        {
          data: closes,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: false
        }
      ]
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: false },
        y: { display: true, ticks: { callback: v => `$${Number(v).toLocaleString()}` } }
      }
    };

    const chart = new Chart(ctx, { type: "line", data, options, plugins: [plugin] });

    // 현재가 가이드 라인
    const drawGuide = () => {
      const yPix = chart.scales.y.getPixelForValue(lastPrice);
      const { left, right } = chart.chartArea;
      const g = ctx;
      g.save();
      g.beginPath();
      g.moveTo(left, yPix);
      g.lineTo(right, yPix);
      g.lineWidth = 1.5;
      g.setLineDash([6, 6]);
      g.strokeStyle = "rgba(255, 255, 255, 0.6)";
      g.stroke();
      g.restore();
    };

    // 최초/업데이트마다 그리기 훅
    const unsub = chart.$plugins?._plugins?.push?.({
      afterDatasetsDraw: drawGuide
    });

    return () => {
      chart.destroy();
      if (typeof unsub === "number") {
        // noop (Chart.js 내부 구조상 제거 불필요)
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels), JSON.stringify(closes), JSON.stringify(bands), lastPrice]);

  return (
    <div style={{ height: 260 }}>
      <canvas ref={ref} />
    </div>
  );
}