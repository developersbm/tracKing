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

  const [theme, setTheme] = useState(getInitialTheme);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState("live"); // 'live' | 'progress' | 'coach' | 'account'

  // Session stats lifted for dashboard cards
  const [sessionStats, setSessionStats] = useState({
    reps: 0,
    stage: null,
    angle: null,
    fullBodyVisible: true,
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
        <div className="brand">TracKing</div>
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
        {activeView === "live" && (
          <div className="dashboard">
            <div className="live-area">
              <LiveView onUpdateStats={onUpdateStats} />
            </div>
            <div className="stats-area">
              <StatsPanel
                reps={sessionStats.reps}
                stage={sessionStats.stage}
                angle={sessionStats.angle}
                fullBodyVisible={sessionStats.fullBodyVisible}
              />
            </div>
          </div>
        )}

        {activeView === "progress" && <MyProgress />}
        {activeView === "coach" && <CoachView />}
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

