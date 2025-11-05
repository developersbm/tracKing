import React from "react";

const navItems = [
  { key: "live", label: "Dashboard / Live Workout" },
  { key: "progress", label: "My Progress" },
  { key: "coach", label: "Coach View" },
  { key: "account", label: "Account" },
];

function RightDrawer({ open, onClose, onNavigate, active }) {
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
          <div className="account-mini">
            <div className="name">Alex Runner</div>
            <div className="meta">Athlete • Varsity Track</div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default RightDrawer;

