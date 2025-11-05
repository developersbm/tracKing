import React from "react";

function StatCard({ label, value, accent = "#4f46e5" }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent }}>
        {value !== undefined && value !== null ? value : "–"}
      </div>
    </div>
  );
}

function StatsPanel({ reps, stage, angle, fullBodyVisible }) {
  return (
    <div className="stats-panel">
      <h3 className="panel-title">Athlete Dashboard</h3>
      <div className="stat-grid">
        <StatCard label="Reps" value={reps} accent="#10b981" />
        <StatCard label="Stage" value={stage || ""} accent="#f59e0b" />
        <StatCard label="Elbow Angle" value={angle !== null ? `${angle}°` : ""} accent="#3b82f6" />
        <StatCard label="Body" value={fullBodyVisible ? "Visible" : "Adjust camera"} accent={fullBodyVisible ? "#10b981" : "#ef4444"} />
      </div>
    </div>
  );
}

export default StatsPanel;
