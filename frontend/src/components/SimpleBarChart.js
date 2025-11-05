import React from "react";

function SimpleBarChart({ data = [], width = 480, height = 160, color = "#3b82f6" }) {
  const padding = 24;
  const w = width;
  const h = height;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  const max = Math.max(1, ...data);
  const barW = innerW / (data.length || 1);

  return (
    <svg width={w} height={h} role="img" aria-label="Bar chart">
      <rect x="0" y="0" width={w} height={h} fill="#0f172a" rx="8" />
      {data.map((v, i) => {
        const barH = (v / max) * innerH;
        const x = padding + i * barW + 4;
        const y = padding + innerH - barH;
        return <rect key={i} x={x} y={y} width={barW - 8} height={barH} fill={color} rx="4" />;
      })}
    </svg>
  );
}

export default SimpleBarChart;

