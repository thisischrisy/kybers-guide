"use client";
import { useEffect, useRef } from "react";
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from "chart.js";
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

export function MiniLine({ labels, values }: { labels: string[]; values: number[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d");
    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{ data: values, tension: 0.2 }]
      },
      options: {
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });

    return () => chart.destroy();
  }, [labels, values]);

  return <canvas ref={ref} style={{ width: "100%", height: 160 }} />;
}
