import React, { useMemo, useEffect, useState } from "react";
import SimpleBarChart from "./SimpleBarChart";
import { getCurrentUserId, getAthleteProgress, getAthleteCoachNotes, deleteSession } from "../services/firestore";

function SummaryCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function MyProgress() {
  const [progress, setProgress] = useState(null);
  const [overallCoachNotes, setOverallCoachNotes] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      setLoading(true);
      try {
        const athleteId = getCurrentUserId();
        const [data, coachNotes] = await Promise.all([
          getAthleteProgress(athleteId),
          getAthleteCoachNotes(athleteId)
        ]);
        setProgress(data);
        setOverallCoachNotes(coachNotes);
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, []);

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this workout session? This cannot be undone.')) {
      return;
    }
    
    try {
      await deleteSession(sessionId);
      // Reload progress data
      const athleteId = getCurrentUserId();
      const data = await getAthleteProgress(athleteId);
      setProgress(data);
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  const totals = useMemo(() => {
    if (!progress) return { workouts: 0, totalReps: 0, avgScore: 0 };
    return {
      workouts: progress.totalSessions,
      totalReps: progress.totalReps,
      avgScore: Math.round(progress.avgFormScore * 100)
    };
  }, [progress]);

  const chartData = useMemo(() => {
    if (!progress || !progress.sessions) return [];
    return progress.sessions.map(s => s.totalReps);
  }, [progress]);

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString().split('T')[0];
  };

  if (loading) return <div className="view-container"><h2>My Progress</h2><div>Loading...</div></div>;

  return (
    <div className="view-container">
      <h2>My Progress</h2>
      <div className="stat-grid" style={{ marginTop: 12 }}>
        <SummaryCard label="Total Workouts" value={totals.workouts} />
        <SummaryCard label="Total Reps" value={totals.totalReps} />
        <SummaryCard label="Avg. Form Score" value={`${totals.avgScore}%`} />
      </div>

      {/* Overall Coach Feedback Card */}
      {overallCoachNotes && (
        <div style={{
          marginTop: 20,
          backgroundColor: 'var(--panel)',
          borderRadius: 12,
          padding: 20,
          border: '2px solid #3b82f6',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                Coach's Overall Feedback
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                General observations and goals from your coach
              </div>
            </div>
          </div>
          <div style={{
            padding: 16,
            backgroundColor: 'var(--bg)',
            borderRadius: 8,
            fontSize: '14px',
            color: 'var(--text)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap'
          }}>
            {overallCoachNotes}
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div className="panel-title">Reps Over Time</div>
        </div>
        <div className="panel-body">
          {chartData.length === 0 ? <div className="empty">No workout data yet</div> : <SimpleBarChart data={chartData} height={160} />}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 20 }}>
        <div className="panel-header">
          <div className="panel-title">Workout History</div>
        </div>
        <div className="panel-body">
          {!progress || progress.sessions.length === 0 ? (
            <div className="empty">No workouts recorded yet. Start a workout to see your history!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {progress.sessions.map((session) => {
                const isExpanded = expandedSession === session.id;
                const hasNotes = session.coachNotes && session.coachNotes.trim().length > 0;
                const formScorePercent = Math.round(session.formScore * 100);
                
                return (
                  <div
                    key={session.id}
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderRadius: 10,
                      padding: 16,
                      border: hasNotes ? '2px solid #3b82f6' : '1px solid var(--border)',
                      transition: 'all 0.2s ease',
                      boxShadow: hasNotes ? '0 2px 8px rgba(59, 130, 246, 0.1)' : 'none'
                    }}
                  >
                    {/* Main Session Info */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto auto auto',
                      gap: 16,
                      alignItems: 'center'
                    }}>
                      {/* Date */}
                      <div style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: 'var(--text)',
                        minWidth: 100
                      }}>
                        {formatDate(session.date)}
                      </div>

                      {/* Session Label */}
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)'
                      }}>
                        Workout Session
                      </div>

                      {/* Reps Badge */}
                      <div style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {session.totalReps} reps
                      </div>

                      {/* Form Score Badge */}
                      <div style={{
                        backgroundColor: formScorePercent >= 80 ? '#10b981' : formScorePercent >= 60 ? '#f59e0b' : '#ef4444',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {formScorePercent}% form
                      </div>

                      {/* Coach Feedback Indicator/Button */}
                      {hasNotes && (
                        <button
                          onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                          style={{
                            backgroundColor: isExpanded ? '#3b82f6' : 'transparent',
                            color: isExpanded ? 'white' : '#3b82f6',
                            border: `1px solid ${isExpanded ? '#3b82f6' : 'var(--border)'}`,
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isExpanded ? 'Hide Feedback' : 'Show Feedback'}
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: '1px solid var(--border)',
                          padding: '6px 10px',
                          borderRadius: 8,
                          fontSize: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          minWidth: 36,
                          minHeight: 32
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        title="Delete workout"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Coach Feedback Preview (when not expanded) */}
                    {hasNotes && !isExpanded && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        borderRadius: 6,
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedSession(session.id)}
                      >
                        <strong style={{ color: '#3b82f6', fontStyle: 'normal' }}>Coach: </strong>
                        {truncateText(session.coachNotes, 100)}
                      </div>
                    )}

                    {/* Expanded Coach Feedback */}
                    {isExpanded && hasNotes && (
                      <div style={{
                        marginTop: 12,
                        padding: 16,
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        borderRadius: 8,
                        borderLeft: '4px solid #3b82f6',
                        animation: 'slideDown 0.2s ease'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8
                        }}>
                          <strong style={{
                            color: '#3b82f6',
                            fontSize: '14px',
                            fontWeight: 600
                          }}>
                            Coach Feedback
                          </strong>
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--text)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {session.coachNotes}
                        </div>
                      </div>
                    )}

                    {/* No Feedback Message */}
                    {!hasNotes && (
                      <div style={{
                        marginTop: 12,
                        padding: 10,
                        backgroundColor: 'var(--panel)',
                        borderRadius: 6,
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        No coach feedback yet for this session
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyProgress;

