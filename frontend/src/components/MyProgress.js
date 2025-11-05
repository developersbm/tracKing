import React, { useMemo } from "react";
import SimpleBarChart from "./SimpleBarChart";

const DUMMY_HISTORY = [
  { date: "2025-10-01", exercise: "Bicep Curls", reps: 42, form: "Good", score: 86 },
  { date: "2025-10-04", exercise: "Bicep Curls", reps: 35, form: "Needs Work", score: 68 },
  { date: "2025-10-08", exercise: "Bicep Curls", reps: 48, form: "Good", score: 90 },
  { date: "2025-10-12", exercise: "Bicep Curls", reps: 52, form: "Good", score: 88 },
  { date: "2025-10-16", exercise: "Bicep Curls", reps: 38, form: "Needs Work", score: 70 },
  { date: "2025-10-20", exercise: "Bicep Curls", reps: 55, form: "Good", score: 92 },
];

function SummaryCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function MyProgress() {
  const totals = useMemo(() => {
    const workouts = DUMMY_HISTORY.length;
    const totalReps = DUMMY_HISTORY.reduce((sum, d) => sum + d.reps, 0);
    const avgScore = Math.round(
      DUMMY_HISTORY.reduce((sum, d) => sum + d.score, 0) / workouts
    );
    return { workouts, totalReps, avgScore };
  }, []);

  const chartData = DUMMY_HISTORY.map((d) => d.reps);

  return (
    <div className="view-container">
      <h2>My Progress</h2>
      <div className="stat-grid" style={{ marginTop: 12 }}>
        <SummaryCard label="Total Workouts" value={totals.workouts} />
        <SummaryCard label="Total Reps" value={totals.totalReps} />
        <SummaryCard label="Avg. Form Score" value={`${totals.avgScore}%`} />
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div className="panel-title">Reps Over Time</div>
        </div>
        <div className="panel-body">
          <SimpleBarChart data={chartData} height={160} />
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div className="panel-title">Workout History</div>
        </div>
        <div className="panel-body">
          <ul className="history-list">
            {DUMMY_HISTORY.map((item, idx) => (
              <li key={idx} className="history-row">
                <div className="history-date">{item.date}</div>
                <div className="history-ex">{item.exercise}</div>
                <div className="history-reps">{item.reps} reps</div>
                <div className={`history-form ${item.form === "Good" ? "good" : "bad"}`}>
                  {item.form}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default MyProgress;

