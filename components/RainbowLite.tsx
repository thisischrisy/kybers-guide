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
  Plugin,
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
  labels: string[];   // 날짜 라벨
  closes: number[];   // 종가
  bands: number[];    // 분위 경계값(오름차순)
  lastPrice: number;  // 현재가
};

export function RainbowLite({ labels, closes, bands, lastPrice }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;

    // 1) 배경 밴드 플러그인 (캔버스 배경에 색 띠)
    const rainbowBandsPlugin: Plugin<"line"> = {
      id: "rainbow-bands",
      beforeDraw: (chart) => {
        const { chartArea, scales } = chart;
        if (!chartArea) return;
        const { top, bottom, left, right } = chartArea;
        const y = scales.y;

        const colors = [
          "rgba(239, 68, 68, 0.15)",
          "rgba(245, 158, 11, 0.15)",
          "rgba(234, 179, 8, 0.15)",
          "rgba(16, 185, 129, 0.15)",
          "rgba(5, 150, 105, 0.15)",
          "rgba(3, 105, 161, 0.15)",
          "rgba(99, 102, 241, 0.15)",
          "rgba(168, 85, 247, 0.15)",
        ];

        for (let i = bands.length - 1, ci = 0; i > 0; i--, ci++) {
          const yTop = y.getPixelForValue(bands[i]);
          const yBot = y.getPixelForValue(bands[i - 1]);
          ctx.save();
          ctx.fillStyle = colors[ci % colors.length];
          ctx.fillRect(left, Math.min(yTop, yBot), right - left, Math.abs(yTop - yBot));
          ctx.restore();
        }
      },
    };

    // 2) 현재가 가이드라인 플러그인
    const currentPriceGuidePlugin: Plugin<"line"> = {
      id: "current-price-guide",
      afterDatasetsDraw: (chart) => {
        const { chartArea, scales } = chart;
        if (!chartArea) return;
        const { left, right } = chartArea;
        const yPix = scales.y.getPixelForValue(lastPrice);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(left, yPix);
        ctx.lineTo(right, yPix);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.stroke();
        ctx.restore();
      },
    };

    const data: ChartData<"line", number[], string> = {
      labels,
      datasets: [
        {
          data: closes,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: false,
        },
      ],
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: false },
        y: { display: true, ticks: { callback: (v) => `$${Number(v).toLocaleString()}` } },
      },
    };

    const chart = new Chart(ctx, {
      type: "line",
      data,
      options,
      plugins: [rainbowBandsPlugin, currentPriceGuidePlugin],
    });

    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels), JSON.stringify(closes), JSON.stringify(bands), lastPrice]);

  return (
    <div style={{ height: 260 }}>
      <canvas ref={ref} />
    </div>
  );
}