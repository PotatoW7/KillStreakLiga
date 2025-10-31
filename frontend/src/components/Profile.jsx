import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { sendEmailVerification } from "firebase/auth";

function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const verifyEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      alert("Verification email sent! Check your inbox.");
    } catch (error) {
      alert("Error sending verification: " + error.message);
    }
  };

  if (!user) return (
    <div className="loading">Loading user info...</div>
  );

  const joinedDate = new Date(user.metadata.creationTime);
  const accountAgeDays = Math.floor((Date.now() - joinedDate) / (86400000));

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-title">Your Profile</h2>
        
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-icon-container">
              <img 
                src="https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png" 
                alt="Profile" 
                className="profile-avatar"
              />
            </div>
            <div className="profile-info">
              <h3 className="profile-display-name">
                {user.displayName || "Anonymous Summoner"}
              </h3>
              <div className="profile-details">
                <div className="profile-detail">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email || "No email"}</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">Verified:</span>
                  <span className={`detail-value ${user.emailVerified ? 'verified' : 'not-verified'}`}>
                    {user.emailVerified ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                
                {!user.emailVerified && (
                  <button 
                    onClick={verifyEmail}
                    className="verify-button"
                  >
                    Verify Email
                  </button>
                )}
                
                <div className="profile-detail">
                  <span className="detail-label">Joined:</span>
                  <span className="detail-value">{joinedDate.toLocaleDateString()} ({accountAgeDays} days ago)</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">{new Date(user.metadata.lastSignInTime).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;