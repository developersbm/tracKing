import React, { useMemo, useState, useEffect } from "react";
import { 
  getCurrentUserId, 
  getCoachOverview, 
  getSessions,
  getCoachAthleteLink,
  updateCoachAthleteNotes,
  updateSessionNotes
} from "../services/firestore";

function CoachView() {
  const [athletes, setAthletes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [athleteSessions, setAthleteSessions] = useState([]);
  const [overallNote, setOverallNote] = useState("");
  const [sessionNotes, setSessionNotes] = useState({}); // { sessionId: noteText }
  const [expandedSession, setExpandedSession] = useState(null); // Track which session notes are expanded
  const [savingSession, setSavingSession] = useState(null); // Track which session is being saved
  const [savingOverall, setSavingOverall] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCoachData = async () => {
      setLoading(true);
      try {
        const coachId = getCurrentUserId();
        const overview = await getCoachOverview(coachId);
        setAthletes(overview);
      } catch (error) {
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCoachData();
  }, []);

  useEffect(() => {
    const loadAthleteData = async () => {
      if (!selected) {
        setAthleteSessions([]);
        setOverallNote("");
        setSessionNotes({});
        return;
      }
      try {
        const coachId = getCurrentUserId();
        
        // Load sessions
        const sessions = await getSessions(selected);
        setAthleteSessions(sessions);
        
        // Load overall coach notes
        const link = await getCoachAthleteLink(coachId, selected);
        setOverallNote(link?.overallCoachNotes || "");
        
        // Load session notes into state
        const notes = {};
        sessions.forEach(s => {
          if (s.coachNotes) notes[s.id] = s.coachNotes;
        });
        setSessionNotes(notes);
      } catch (error) {
        console.error('Error loading athlete data:', error);
      }
    };
    loadAthleteData();
  }, [selected]);

  const athlete = useMemo(
    () => athletes.find((a) => a.athlete.id === selected) || null,
    [athletes, selected]
  );

  const saveOverallNotes = async () => {
    if (!selected || savingOverall) return;
    setSavingOverall(true);
    try {
      const coachId = getCurrentUserId();
      await updateCoachAthleteNotes(coachId, selected, overallNote);
      setToast("✓ Overall notes saved");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('Error saving overall notes:', error);
      setToast("✗ Failed to save notes");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSavingOverall(false);
    }
  };

  const saveSessionNote = async (sessionId) => {
    if (savingSession) return;
    setSavingSession(sessionId);
    try {
      const noteText = sessionNotes[sessionId] || "";
      await updateSessionNotes(sessionId, noteText);
      
      // Update local state to reflect saved note
      setAthleteSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, coachNotes: noteText } : s
      ));
      
      setToast("✓ Session note saved");
      setTimeout(() => setToast(null), 2000);
    } catch (error) {
      console.error('Error saving session note:', error);
      setToast("✗ Failed to save note");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSavingSession(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="view-container">
      <h2>Coach View</h2>
      {loading && <div>Loading athletes...</div>}
      {!loading && (
        <div className="coach-layout">
          <div className="coach-list panel">
            <div className="panel-header"><div className="panel-title">Athletes</div></div>
            <div className="panel-body">
              {athletes.length === 0 && <div className="empty">No athletes linked yet.</div>}
              <ul className="athlete-list">
                {athletes.map((a) => (
                  <li
                    key={a.athlete.id}
                    className={`athlete-row ${selected === a.athlete.id ? "active" : ""}`}
                    onClick={() => setSelected(a.athlete.id)}
                  >
                    <div className="athlete-name">{a.athlete.name}</div>
                    <div className="athlete-meta">
                      Sessions: {a.totalSessions} • Reps: {a.totalReps} • Form: {Math.round(a.avgFormScore)}%
                    </div>
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
                    <div className="name">{athlete.athlete.name}</div>
                    <div className="meta">
                      Total Sessions: {athlete.totalSessions} • Total Reps: {athlete.totalReps} • Avg Form: {Math.round(athlete.avgFormScore)}%
                    </div>
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {athleteSessions.length === 0 && <div className="empty">No session history yet.</div>}
                    {athleteSessions.map((session) => {
                      const isExpanded = expandedSession === session.id;
                      const isSaving = savingSession === session.id;
                      const hasNotes = sessionNotes[session.id] || session.coachNotes;
                      
                      return (
                        <div 
                          key={session.id}
                          style={{
                            backgroundColor: 'var(--panel)',
                            borderRadius: 8,
                            padding: 16,
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Session Info Row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                                {formatDate(session.startTime)}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                {session.totalReps || 0} reps
                              </div>
                              <div 
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: session.formScoreAvg >= 0.8 ? '#10b981' : '#ef4444'
                                }}
                              >
                                {session.formScoreAvg ? `${Math.round(session.formScoreAvg * 100)}% form` : 'N/A'}
                              </div>
                              {hasNotes && !isExpanded && (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#3b82f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}>
                                  Has notes
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                backgroundColor: isExpanded ? 'var(--accent)' : 'transparent',
                                color: isExpanded ? 'white' : 'var(--accent)',
                                border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 500,
                                transition: 'all 0.2s'
                              }}
                            >
                              {isExpanded ? '▼ Hide Notes' : '▶ Add/Edit Notes'}
                            </button>
                          </div>

                          {/* Expandable Notes Section */}
                          {isExpanded && (
                            <div style={{
                              borderTop: '1px solid var(--border)',
                              paddingTop: 12,
                              animation: 'slideDown 0.2s ease'
                            }}>
                              <textarea
                                placeholder="Add notes about this session (form issues, progress, recommendations, etc.)..."
                                rows={4}
                                value={sessionNotes[session.id] || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setSessionNotes(prev => ({ ...prev, [session.id]: value }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: 12,
                                  fontSize: '14px',
                                  borderRadius: 6,
                                  border: '1px solid var(--border)',
                                  backgroundColor: 'var(--bg)',
                                  color: 'var(--text)',
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                  lineHeight: 1.5
                                }}
                              />
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    onClick={() => {
                                      setSessionNotes(prev => ({ ...prev, [session.id]: session.coachNotes || "" }));
                                      setExpandedSession(null);
                                    }}
                                    style={{
                                      padding: '8px 16px',
                                      fontSize: '13px',
                                      backgroundColor: 'transparent',
                                      color: 'var(--text-muted)',
                                      border: '1px solid var(--border)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      fontWeight: 500
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveSessionNote(session.id)}
                                    disabled={isSaving}
                                    style={{
                                      padding: '8px 20px',
                                      fontSize: '13px',
                                      backgroundColor: isSaving ? '#6b7280' : '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 6,
                                      cursor: isSaving ? 'not-allowed' : 'pointer',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6
                                    }}
                                  >
                                    {isSaving ? '⏳ Saving...' : '✓ Save Notes'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Athlete Notes Section */}
                  <div style={{
                    marginTop: 24,
                    backgroundColor: 'var(--panel)',
                    borderRadius: 8,
                    padding: 20,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      marginBottom: 12,
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      Overall Athlete Notes
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
                      General observations, goals, or long-term feedback for {athlete.athlete.name}
                    </div>
                    <textarea
                      rows={5}
                      placeholder="Example: Great progress on form. Focus on keeping elbows stable during the down phase. Goal: reach 20 reps with 90%+ form score..."
                      value={overallNote}
                      onChange={(e) => setOverallNote(e.target.value)}
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: '14px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg)',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: 1.5
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        These notes are visible to the athlete
                      </div>
                      <button
                        onClick={saveOverallNotes}
                        disabled={savingOverall}
                        style={{
                          padding: '10px 24px',
                          fontSize: '14px',
                          backgroundColor: savingOverall ? '#6b7280' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: savingOverall ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {savingOverall ? 'Saving...' : 'Save Overall Notes'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: toast.startsWith('✓') ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

export default CoachView;

