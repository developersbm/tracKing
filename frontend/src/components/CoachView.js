import React, { useMemo, useState } from "react";

const DUMMY_ATHLETES = [
  {
    id: "a1",
    name: "Casey Sprint",
    last: "2025-10-20",
    totalReps: 520,
    avgForm: 88,
    history: [
      { date: "2025-10-20", exercise: "Bicep Curls", reps: 55, form: "Good", score: 92 },
      { date: "2025-10-16", exercise: "Bicep Curls", reps: 38, form: "Needs Work", score: 70 },
      { date: "2025-10-12", exercise: "Bicep Curls", reps: 52, form: "Good", score: 88 },
    ],
  },
  {
    id: "a2",
    name: "Jordan Hurdle",
    last: "2025-10-19",
    totalReps: 440,
    avgForm: 81,
    history: [
      { date: "2025-10-19", exercise: "Bicep Curls", reps: 47, form: "Good", score: 85 },
      { date: "2025-10-14", exercise: "Bicep Curls", reps: 41, form: "Needs Work", score: 72 },
      { date: "2025-10-10", exercise: "Bicep Curls", reps: 50, form: "Good", score: 90 },
    ],
  },
  {
    id: "a3",
    name: "Riley Relay",
    last: "2025-10-18",
    totalReps: 390,
    avgForm: 76,
    history: [
      { date: "2025-10-18", exercise: "Bicep Curls", reps: 36, form: "Needs Work", score: 66 },
      { date: "2025-10-15", exercise: "Bicep Curls", reps: 42, form: "Good", score: 84 },
      { date: "2025-10-11", exercise: "Bicep Curls", reps: 40, form: "Good", score: 80 },
    ],
  },
];

function CoachView() {
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState(null);

  const athlete = useMemo(
    () => DUMMY_ATHLETES.find((a) => a.id === selected) || null,
    [selected]
  );

  const sendFeedback = () => {
    // fake send
    setToast("Feedback sent");
    setTimeout(() => setToast(null), 1600);
    setNote("");
  };

  return (
    <div className="view-container">
      <h2>Coach View</h2>
      <div className="coach-layout">
        <div className="coach-list panel">
          <div className="panel-header"><div className="panel-title">Athletes</div></div>
          <div className="panel-body">
            <ul className="athlete-list">
              {DUMMY_ATHLETES.map((a) => (
                <li
                  key={a.id}
                  className={`athlete-row ${selected === a.id ? "active" : ""}`}
                  onClick={() => setSelected(a.id)}
                >
                  <div className="athlete-name">{a.name}</div>
                  <div className="athlete-meta">Last: {a.last} • Reps: {a.totalReps} • Form: {a.avgForm}%</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="coach-detail panel">
          <div className="panel-header"><div className="panel-title">Details</div></div>
          <div className="panel-body">
            {!athlete && <div className="empty">Select an athlete to view history.</div>}
            {athlete && (
              <>
                <div className="athlete-header">
                  <div className="name">{athlete.name}</div>
                  <div className="meta">Total Reps: {athlete.totalReps} • Avg Form: {athlete.avgForm}%</div>
                </div>
                <ul className="history-list" style={{ marginTop: 8 }}>
                  {athlete.history.map((h, idx) => (
                    <li key={idx} className="history-row">
                      <div className="history-date">{h.date}</div>
                      <div className="history-ex">{h.exercise}</div>
                      <div className="history-reps">{h.reps} reps</div>
                      <div className={`history-form ${h.form === "Good" ? "good" : "bad"}`}>{h.form}</div>
                    </li>
                  ))}
                </ul>

                <div className="panel" style={{ marginTop: 16 }}>
                  <div className="panel-header"><div className="panel-title">Coach Notes</div></div>
                  <div className="panel-body">
                    <textarea
                      className="coach-notes"
                      rows={4}
                      placeholder="Write feedback..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div style={{ textAlign: "right", marginTop: 8 }}>
                      <button className="btn" onClick={sendFeedback} disabled={!note.trim()}>
                        Send Feedback
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default CoachView;

