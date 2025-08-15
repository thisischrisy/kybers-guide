"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,   // ✅ 컨트롤러 추가
  ChartOptions,
  ChartData,
} from "chart.js";

// ✅ 반드시 컨트롤러까지 등록해야 함
Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

export function Donut({
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

    const data: ChartData<"doughnut", number[], string> = {
      labels,
      datasets: [
        {
          data: values,
          borderWidth: 0,
        },
      ],
    };

    const options: ChartOptions<"doughnut"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { enabled: true },
      },
      cutout: "60%",
    };

    const chart = new Chart(ctx, { type: "doughnut", data, options });

    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels), JSON.stringify(values)]);

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}