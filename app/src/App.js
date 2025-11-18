import React, { useEffect, useState } from "react";
import "./App.css";
import LiveView from "./components/LiveView";
import StatsPanel from "./components/StatsPanel";
import RightDrawer from "./components/RightDrawer";
import MyProgress from "./components/MyProgress";
import CoachView from "./components/CoachView";
import AccountView from "./components/AccountView";


function App() {
  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'dark'; // default to dark to preserve current look
  };

  // Determine initial view based on URL path
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path.includes('/coach')) return 'coach';
    if (path.includes('/athlete')) return 'live'; // athlete sees live workout view
    return 'live'; // default
  };

  // Determine user role from URL
  const getUserRole = () => {
    const path = window.location.pathname;
    return path.includes('/coach') ? 'COACH' : 'ATHLETE';
  };

  const [theme, setTheme] = useState(getInitialTheme);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState(getInitialView); // 'live' | 'progress' | 'coach' | 'account'
  const userRole = getUserRole();

  // Session stats lifted for dashboard cards
  const [sessionStats, setSessionStats] = useState({
    reps: 0,
    stage: null,
    angle: null,
    fullBodyVisible: true,
    lastRepIsCorrect: null,
  });

  // Workout tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [workoutHandlers, setWorkoutHandlers] = useState({
    onStartWorkout: null,
    onEndWorkout: null
  });

  const handleNavigate = (viewKey) => {
    setActiveView(viewKey);
    setDrawerOpen(false);
  };

  const onUpdateStats = (stats) => {
    setSessionStats((prev) => ({ ...prev, ...stats }));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="brand">
          TracKing
          {window.location.pathname.includes('/coach') && <span style={{marginLeft: 8, opacity: 0.7, fontSize: '0.9em'}}>(Brandon - Coach)</span>}
          {window.location.pathname.includes('/athlete') && <span style={{marginLeft: 8, opacity: 0.7, fontSize: '0.9em'}}>(Sebastian - Athlete)</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn"
            aria-label="Toggle theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            className="hamburger"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className="content">
        {activeView === "live" && userRole === "ATHLETE" && (
          <div className="dashboard">
            <div className="live-area">
              <LiveView 
                onUpdateStats={onUpdateStats}
                setIsTracking={setIsTracking}
                setWorkoutHandlers={setWorkoutHandlers}
              />
            </div>
            <div className="stats-area">
              <StatsPanel
                reps={sessionStats.reps}
                stage={sessionStats.stage}
                angle={sessionStats.angle}
                fullBodyVisible={sessionStats.fullBodyVisible}
                lastRepIsCorrect={sessionStats.lastRepIsCorrect}
                isTracking={isTracking}
                onStartWorkout={workoutHandlers.onStartWorkout}
                onEndWorkout={workoutHandlers.onEndWorkout}
              />
            </div>
          </div>
        )}

        {activeView === "progress" && userRole === "ATHLETE" && <MyProgress />}
        {activeView === "coach" && userRole === "COACH" && <CoachView />}
        {activeView === "account" && <AccountView />}
      </div>

      <RightDrawer
        open={drawerOpen}
        active={activeView}
        onClose={() => setDrawerOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export default App;

