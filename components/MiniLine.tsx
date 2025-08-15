// components/MiniLine.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";

// ✅ 라인 차트에 필요한 것들 등록
Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
  Legend
);

export function MiniLine({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const data: ChartData<"line", number[], string> = {
      labels,
      datasets: [
        {
          data: values,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
        },
      ],
    };

    const options: ChartOptions<"line"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    };

    const chart = new Chart(ctx, { type: "line", data, options });

    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels), JSON.stringify(values)]);

  return (
    <div style={{ height: 120 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}