import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../services/firestore";

function RightDrawer({ open, onClose, onNavigate, active }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  // Role-based navigation items
  const getNavItems = () => {
    if (!currentUser) return [];
    
    if (currentUser.role === 'COACH') {
      return [
        { key: "coach", label: "Coach View" },
        { key: "account", label: "Account" },
      ];
    } else {
      return [
        { key: "live", label: "Dashboard / Live Workout" },
        { key: "progress", label: "My Progress" },
        { key: "account", label: "Account" },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      <div className={`drawer-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="drawer-header">
          <div className="drawer-title">Menu</div>
          <button className="drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <nav className="drawer-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`drawer-link ${active === item.key ? "active" : ""}`}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="drawer-footer">
          {currentUser && (
            <div className="account-mini">
              <div className="name">{currentUser.name}</div>
              <div className="meta">{currentUser.role === 'COACH' ? 'Coach' : 'Athlete'}</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default RightDrawer;

