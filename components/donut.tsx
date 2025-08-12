"use client";
import { useEffect, useRef } from "react";
import { Chart, ArcElement, Tooltip } from "chart.js";
Chart.register(ArcElement, Tooltip);

export function Donut({ labels, values }: { labels: string[]; values: number[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            // 색상은 지정하지 말기(디폴트 사용) — 필요시 추후 테마화
          }
        ]
      },
      options: {
        cutout: "60%",
        plugins: { tooltip: { enabled: true }, legend: { display: false } }
      }
    });

    return () => chart.destroy();
  }, [labels, values]);

  return <canvas ref={ref} style={{ width: "100%", height: 220 }} />;
}
