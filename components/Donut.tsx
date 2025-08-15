// components/Donut.tsx
"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from "chart.js";

// ✅ 차트 타입/요소 등록 (중요)
Chart.register(ArcElement, Tooltip, Legend);

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
          // 색상은 지정하지 않으면 Chart.js 기본 팔레트 사용
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
    // labels/values 변경 시만 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels), JSON.stringify(values)]);

  return (
    <div style={{ height: 220 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}