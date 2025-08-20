"use client";

type Props = {
  points: number[];          // y값 배열 (예: 7d 가격)
  width?: number;            // 기본 120
  height?: number;           // 기본 36
  stroke?: string;           // 라인 색
  fill?: string;             // 밑면 색(선택)
};

export function Sparkline({
  points,
  width = 120,
  height = 36,
  stroke = "#F5C451",
  fill,
}: Props) {
  if (!Array.isArray(points) || points.length < 2) {
    return <div style={{ width, height }} className="opacity-50 text-xs">-</div>;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const dx = width / (points.length - 1);
  const norm = (v: number) => {
    if (max === min) return height / 2;
    return height - ((v - min) / (max - min)) * height;
  };

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${i * dx} ${norm(v)}`).join(" ");

  let area = "";
  if (fill) {
    area = `M 0 ${height} ` + points.map((v, i) => `L ${i * dx} ${norm(v)}`).join(" ") + ` L ${width} ${height} Z`;
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      {fill ? <path d={area} fill={fill} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}