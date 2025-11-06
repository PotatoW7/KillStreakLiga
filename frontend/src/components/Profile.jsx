import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { sendEmailVerification } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";

function Profile() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) setProfileImage(docSnap.data().profileImage || null);
      }
    });

    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      unsubscribe();
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const updateProfileImage = async (newImage) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      profileImage: newImage,
      profileImageUpdated: newImage ? new Date() : null,
    });
    setProfileImage(newImage);
  };

  const verifyEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      alert("Verification email sent! Check your inbox.");
    } catch (error) {
      alert("Error sending verification: " + error.message);
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return alert("No file selected");

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) return alert("Invalid file type (JPEG, PNG, GIF, WebP)");
    if (file.size > 1 * 1024 * 1024) return alert("Max 1MB allowed");

    setUploading(true);
    setShowContextMenu(false);

    try {
      const base64 = await fileToBase64(file);
      await updateProfileImage(base64);
      alert("Profile image updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Error updating profile image");
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
    setShowContextMenu(false);
  };

  const removeProfileImage = async () => {
    setShowContextMenu(false);
    try {
      await updateProfileImage(null);
      alert("Profile image removed!");
    } catch (err) {
      console.error(err);
      alert("Error removing profile image");
    }
  };

  if (!user) return <div className="loading">Loading user info...</div>;

  const joinedDate = new Date(user.metadata.creationTime);
  const accountAgeDays = Math.floor((Date.now() - joinedDate) / 86400000);
  const currentProfileImage =
    profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png";

  return (
    <div className="profile-page">
      <div className="profile-container">
        <h2 className="profile-title">Your Profile</h2>

        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-icon-container">
              <img
                src={currentProfileImage}
                alt="Profile"
                className="profile-avatar"
                onContextMenu={handleRightClick}
                style={{ cursor: "pointer" }}
              />

              {showContextMenu && (
                <div
                  ref={contextMenuRef}
                  className="context-menu"
                  style={{ position: "fixed", left: contextMenuPosition.x, top: contextMenuPosition.y, zIndex: 1000 }}
                >
                  <button onClick={triggerFileInput} disabled={uploading} className="context-menu-btn">
                    {uploading ? "⏳ Uploading..." : "📁 Upload Image"}
                  </button>
                  {profileImage && (
                    <button onClick={removeProfileImage} className="context-menu-btn delete-btn">
                      🗑️ Delete Image
                    </button>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*"
                style={{ display: "none" }}
              />
            </div>

            <div className="profile-info">
              <h3 className="profile-display-name">{user.displayName || "Anonymous Summoner"}</h3>
              <div className="profile-details">
                <div className="profile-detail">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email || "No email"}</span>
                </div>
                <div className="profile-detail">
                  <span className="detail-label">Verified:</span>
                  <span className={`detail-value ${user.emailVerified ? "verified" : "not-verified"}`}>
                    {user.emailVerified ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
                {!user.emailVerified && (
                  <button onClick={verifyEmail} className="verify-button">
                    Verify Email
                  </button>
                )}
                <div className="profile-detail">
                  <span className="detail-label">Joined:</span>
                  <span className="detail-value">
                    {joinedDate.toLocaleDateString()} ({accountAgeDays} days ago)
                  </span>
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
