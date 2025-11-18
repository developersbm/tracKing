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

function StatsPanel({ reps, stage, angle, fullBodyVisible, lastRepIsCorrect, isTracking, onStartWorkout, onEndWorkout }) {
  // Determine form status display
  const getFormStatus = () => {
    if (lastRepIsCorrect === null) return { text: "No reps yet", color: "#9ca3af" };
    return lastRepIsCorrect 
      ? { text: "Good form", color: "#10b981" } 
      : { text: "Needs work", color: "#ef4444" };
  };
  const formStatus = getFormStatus();

  return (
    <div className="stats-panel">
      <h3 className="panel-title">Athlete Dashboard</h3>
      
      {isTracking ? (
        <>
          <div className="stat-grid">
            <StatCard label="Reps" value={reps} accent="#10b981" />
            <StatCard label="Stage" value={stage || ""} accent="#f59e0b" />
            <StatCard label="Elbow Angle" value={angle !== null ? `${angle}°` : ""} accent="#3b82f6" />
            <StatCard label="Form" value={formStatus.text} accent={formStatus.color} />
          </div>
        </>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          <p style={{ marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>Ready to train?</p>
          <p>Click "Start Workout" to begin tracking your reps and form</p>
        </div>
      )}
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {!isTracking ? (
          <button 
            onClick={onStartWorkout}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Start Workout
          </button>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'white',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}></span>
              Recording
            </div>
            <button 
              onClick={onEndWorkout}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              End Workout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default StatsPanel;
