import React from "react";

function AccountView() {
  return (
    <div className="view-container">
      <h2>Account</h2>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-header"><div className="panel-title">Profile</div></div>
        <div className="panel-body">
          <div className="profile-row"><span className="profile-label">Name</span><span className="profile-value">Alex Runner</span></div>
          <div className="profile-row"><span className="profile-label">Role</span><span className="profile-value">Athlete</span></div>
          <div className="profile-row"><span className="profile-label">Team</span><span className="profile-value">Varsity Track</span></div>
          <div className="profile-row"><span className="profile-label">Email</span><span className="profile-value">alex.runner@example.com</span></div>
        </div>
      </div>
    </div>
  );
}

export default AccountView;

