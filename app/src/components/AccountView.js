import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../services/firestore";

function AccountView() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) return <div className="view-container"><h2>Account</h2><div>Loading...</div></div>;

  return (
    <div className="view-container">
      <h2>Account</h2>
      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-header"><div className="panel-title">Profile</div></div>
        <div className="panel-body">
          {user && (
            <>
              <div className="profile-row"><span className="profile-label">Name</span><span className="profile-value">{user.name}</span></div>
              <div className="profile-row"><span className="profile-label">Role</span><span className="profile-value">{user.role === 'COACH' ? 'Coach' : 'Athlete'}</span></div>
              <div className="profile-row"><span className="profile-label">Email</span><span className="profile-value">{user.email}</span></div>
              <div className="profile-row"><span className="profile-label">User ID</span><span className="profile-value">{user.id}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountView;

