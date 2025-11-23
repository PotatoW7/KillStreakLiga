import React, { useEffect, useState, useRef } from "react";
import { auth, db } from "../firebase";
import { 
  sendEmailVerification, 
  deleteUser, 
  reauthenticateWithCredential,
  EmailAuthProvider 
} from "firebase/auth";
import { doc, updateDoc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { fetchDDragon } from "../utils/fetchDDragon"; 

function Profile() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [rankedData, setRankedData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState("");
  const [reauthError, setReauthError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [latestVersion, setLatestVersion] = useState("25.12"); 
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [terminationButtonActive, setTerminationButtonActive] = useState(false);
  const [ripple, setRipple] = useState(false);

  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const regions = [
    { value: "na1", label: "NA" },
    { value: "euw1", label: "EUW" },
    { value: "eun1", label: "EUNE"},
    { value: "kr", label: "KR" },
    { value: "br1", label: "BR" },
    { value: "la1", label: "LAN" },
    { value: "la2", label: "LAS" },
    { value: "oc1", label: "OCE" },
    { value: "ru", label: "RU" },
    { value: "tr1", label: "TR" },
    { value: "jp1", label: "JP" },
    { value: "ph2", label: "PH" },
    { value: "sg2", label: "SG" },
    { value: "th2", label: "TH" },
    { value: "tw2", label: "TW" },
    { value: "vn2", label: "VN" }
  ];

  useEffect(() => {
    const loadLatestVersion = async () => {
      try {
        const ddragonData = await fetchDDragon();
        setLatestVersion(ddragonData.latestVersion);
      } catch (error) {
        console.error("Failed to load latest version:", error);
      }
    };

    loadLatestVersion();

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfileImage(userData.profileImage || null);
          setLinkedAccount(userData.riotAccount || null);
          setEmailVerificationSent(userData.emailVerificationSent || false);
          
          if (userData.riotAccount) {
            fetchRankedData(userData.riotAccount);
          }
        }
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

  const getProfileIconUrl = (profileIconId) => {
    return `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${profileIconId}.png`;
  };

  const fetchRankedData = async (account) => {
    try {
      const response = await fetch(`http://localhost:3000/summoner-info/${account.region}/${encodeURIComponent(account.gameName)}/${encodeURIComponent(account.tagLine)}`);
      
      if (response.ok) {
        const summonerData = await response.json();
        setRankedData(summonerData.ranked || []);
      }
    } catch (error) {
      console.error("Error fetching ranked data:", error);
    }
  };

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
      setVerificationLoading(true);
      
      await sendEmailVerification(user);
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        emailVerificationSent: true,
        lastVerificationSent: new Date()
      });
      
      setEmailVerificationSent(true);
      alert("Verification email sent! Please check your inbox and spam folder.");
    } catch (error) {
      console.error("Error sending verification:", error);
      
      let errorMessage = "Error sending verification email. Please try again.";
      if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many verification requests. Please wait a few minutes before trying again.";
      }
      
      alert(errorMessage);
    } finally {
      setVerificationLoading(false);
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

  const validateRiotId = async (riotId, region) => {
    const parts = riotId.split('#');
    if (parts.length !== 2) {
      throw new Error('Invalid Riot ID format. Use: name#tag');
    }

    const [gameName, tagLine] = parts;
    
    if (!gameName.trim() || !tagLine.trim()) {
      throw new Error('Both name and tag are required');
    }

    if (tagLine.length > 5) {
      throw new Error('Tag line cannot be longer than 5 characters');
    }

    if (gameName.length < 3) {
      throw new Error('Game name must be at least 3 characters long');
    }

    if (gameName.length > 16) {
      throw new Error('Game name cannot be longer than 16 characters');
    }

    try {
      const response = await fetch(`http://localhost:3000/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      
      if (!response.ok) {
        let errorMessage = 'Summoner not found';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const summonerData = await response.json();
      return {
        gameName,
        tagLine,
        region,
        puuid: summonerData.puuid,
        summonerLevel: summonerData.summonerLevel,
        profileIconId: summonerData.profileIconId,
        verified: true
      };
    } catch (error) {
      if (error.message.includes('Summoner not found') || error.message.includes('404')) {
        throw new Error('Riot account not found. Please check the Riot ID and region.');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        throw new Error('Cannot connect to server. Please make sure the backend is running on port 3000.');
      }
      throw new Error('Failed to validate Riot account. Please try again.');
    }
  };

  const handleRiotAccountLink = async (e) => {
    e.preventDefault();
    setLinkError("");
    setLinkSuccess("");
    
    if (!riotId.trim()) {
      setLinkError("Please enter your Riot ID (name#tag)");
      return;
    }

    if (!riotId.includes('#')) {
      setLinkError("Invalid format. Use: name#tag");
      return;
    }

    setLinkingAccount(true);

    try {
      const validatedAccount = await validateRiotId(riotId, region);

      const userRef = doc(db, "users", user.uid);
      const accountData = {
        ...validatedAccount,
        linkedAt: new Date()
      };

      await updateDoc(userRef, {
        riotAccount: accountData
      });

      setLinkedAccount(accountData);
      setLinkSuccess(`Riot account ${validatedAccount.gameName}#${validatedAccount.tagLine} linked successfully!`);
      
      fetchRankedData(accountData);
      
      setRiotId("");
      setRegion("na1");
      
    } catch (error) {
      console.error("Error linking Riot account:", error);
      setLinkError(error.message);
    } finally {
      setLinkingAccount(false);
    }
  };

  const unlinkRiotAccount = async () => {
    if (!window.confirm("Are you sure you want to unlink your Riot account?")) {
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        riotAccount: null
      });
      
      setLinkedAccount(null);
      setRankedData(null);
      setLinkSuccess("Riot account unlinked successfully!");
    } catch (error) {
      console.error("Error unlinking Riot account:", error);
      setLinkError("Failed to unlink Riot account. Please try again.");
    }
  };

  const handleTerminationClick = () => {
    setTerminationButtonActive(true);
    setRipple(true);
    setShowDeleteConfirm(true);
    
    // Remove active state after animation completes
    setTimeout(() => {
      setTerminationButtonActive(false);
    }, 300);
    
    setTimeout(() => {
      setRipple(false);
    }, 600);
  };

  const handleReauthentication = async () => {
    if (!user || !user.email) {
      setReauthError("No user email found");
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      setShowReauthModal(false);
      setPassword("");
      setReauthError("");
      await performAccountDeletion();
    } catch (error) {
      console.error("Reauthentication error:", error);
      if (error.code === 'auth/wrong-password') {
        setReauthError("Incorrect password. Please try again.");
      } else if (error.code === 'auth/invalid-credential') {
        setReauthError("Invalid credentials. Please check your password.");
      } else {
        setReauthError("Reauthentication failed. Please try again.");
      }
    }
  };

  const performAccountDeletion = async () => {
    setDeletingAccount(true);
    try {
      const userId = user.uid;
      
      console.log("Starting account deletion for user:", userId);

      try {
        const queueResponse = await fetch('http://localhost:3000/api/queue/leave', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId
          })
        });
        if (queueResponse.ok) {
          console.log("Removed user from queue system");
        }
      } catch (queueError) {
        console.log("Could not remove from queue system, continuing...");
      }

      const allUsersQuery = query(collection(db, "users"));
      const allUsersSnapshot = await getDocs(allUsersQuery);
      const updatePromises = [];
      
      allUsersSnapshot.forEach(otherUserDoc => {
        if (otherUserDoc.id !== userId) {
          const otherUserData = otherUserDoc.data();
          const updates = {};
          
          if (otherUserData.friends?.some(friend => friend.id === userId)) {
            updates.friends = otherUserData.friends.filter(friend => friend.id !== userId);
          }
          
          if (otherUserData.pendingRequests?.some(req => req.from === userId)) {
            updates.pendingRequests = otherUserData.pendingRequests.filter(req => req.from !== userId);
          }
          
          if (Object.keys(updates).length > 0) {
            updatePromises.push(
              updateDoc(doc(db, "users", otherUserDoc.id), updates)
            );
          }
        }
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      console.log("Finished updating friend lists");

      try {
        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", userId)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const chatDeletionPromises = chatsSnapshot.docs.map(chatDoc => 
          deleteDoc(doc(db, "chats", chatDoc.id))
        );

        if (chatDeletionPromises.length > 0) {
          await Promise.all(chatDeletionPromises);
          console.log("Deleted chat documents");
        }
      } catch (chatError) {
        console.log("Could not delete chat documents (may not have permission), continuing...");
      }
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);
      console.log("Deleted user document");

      await deleteUser(user);
      
      alert("Account terminated successfully! Your profile has been deleted. Goodbye!");
      window.location.href = "/";
    } catch (error) {
      console.error("Error during account deletion:", error);
      
      if (error.code === 'permission-denied') {
        alert("Permission denied. This might be because chat deletion failed. Your profile was still deleted.");
      } else if (error.code === 'unavailable') {
        alert("Network error. Please check your connection and try again.");
      } else {
        alert("Error terminating account. Please try again.");
      }
      
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const initiateAccountDeletion = () => {
    setShowDeleteConfirm(false);
    setShowReauthModal(true);
  };

  const RankedInfo = ({ rankedData }) => {
    const getRankIcon = (tier) => tier ? `/rank-icons/Rank=${tier.charAt(0).toUpperCase()+tier.slice(1).toLowerCase()}.png` : null;

    const getQueueData = (queueType) => {
      return rankedData?.find(queue => queue.queueType === queueType);
    };

    const rankedSolo = getQueueData('RANKED_SOLO_5x5');
    const rankedFlex = getQueueData('RANKED_FLEX_SR');

    const renderRankCard = (queue, queueName) => {
      if (!queue) return (
        <div className="rank-card">
          <div className="queue-name">{queueName}</div>
          <div className="unranked">Unranked</div>
        </div>
      );
      const totalGames = queue.wins + queue.losses;
      const winRate = totalGames > 0 ? Math.round((queue.wins/totalGames)*100) : 0;
      return (
        <div className="rank-card">
          <div className="rank-info">
            {getRankIcon(queue.tier) && <img src={getRankIcon(queue.tier)} alt={`${queue.tier} icon`} className="rank-icon"/>}
            <div className="rank-details">
              <div className="tier">{queue.tier} {queue.rank}</div>
              <div className="queue-label">{queueName}</div>
              <div className="stats">
                <div className="lp">{queue.leaguePoints} LP</div>
                <div className="winrate">{winRate}% WR</div>
                <div className="games">{totalGames}G</div>
              </div>
              <div className="record">{queue.wins}W {queue.losses}L</div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="ranked-container">
        {renderRankCard(rankedSolo, "Solo/Duo")}
        {renderRankCard(rankedFlex, "Flex")}
      </div>
    );
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
                  <div className="verification-section">
                    <button 
                      onClick={verifyEmail} 
                      className="verify-button"
                      disabled={verificationLoading || emailVerificationSent}
                    >
                      {verificationLoading ? "Sending..." : emailVerificationSent ? "Verification Sent" : "Verify Email"}
                    </button>
                    {emailVerificationSent && !user.emailVerified && (
                      <p className="verification-hint">
                        Check your email for the verification link. Didn't receive it? 
                        <button 
                          onClick={verifyEmail} 
                          className="resend-link"
                          disabled={verificationLoading}
                        >
                          {verificationLoading ? "Sending..." : "Resend"}
                        </button>
                      </p>
                    )}
                  </div>
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

          <div className="riot-account-section">
            <h4>Riot Games Account</h4>
            
            {linkedAccount ? (
              <div className="linked-account-container">
                <div className="linked-account-info">
                  <div className="account-header">
                    <div className="account-icon-name">
                      <img 
                        src={getProfileIconUrl(linkedAccount.profileIconId)} 
                        alt="Summoner icon"
                        className="summoner-icon"
                        onError={(e) => {
                          e.target.src = `https://ddragon.leagueoflegends.com/cdn/25.22/img/profileicon/${linkedAccount.profileIconId}.png`;
                        }}
                      />
                      <div>
                        <span className="account-name">
                          {linkedAccount.gameName}#{linkedAccount.tagLine}
                        </span>
                        <span className="account-level">Level {linkedAccount.summonerLevel}</span>
                      </div>
                    </div>
                    <span className="account-status verified">
                      ✅ Verified
                    </span>
                  </div>
                  <span className="account-region">
                    Region: {regions.find(r => r.value === linkedAccount.region)?.label || linkedAccount.region}
                  </span>
                </div>

                {rankedData && (
                  <div className="ranked-section">
                    <h5>Ranked Information</h5>
                    <RankedInfo rankedData={rankedData} />
                  </div>
                )}

                <button 
                  onClick={unlinkRiotAccount} 
                  className="unlink-account-btn"
                >
                  Unlink Account
                </button>
              </div>
            ) : (
              <form onSubmit={handleRiotAccountLink} className="link-account-form">
                <div className="form-group">
                  <label htmlFor="riotId">Riot ID</label>
                  <input
                    type="text"
                    id="riotId"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    placeholder="Enter your Riot ID"
                    className="riot-id-input"
                    maxLength={25} 
                  />
                  <div className="input-hint">
                    Format: Name#Tag
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="riot-id-input"
                  >
                    {regions.map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {linkError && <div className="error-message">{linkError}</div>}
                {linkSuccess && <div className="success-message">{linkSuccess}</div>}
                
                <button 
                  type="submit" 
                  disabled={linkingAccount}
                  className="link-account-btn"
                >
                  {linkingAccount ? "Validating..." : "Link Riot Account"}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="termination-section">
          <h4>Account Management</h4>
          <div className="termination-card">
            <div className="termination-warning">
              <span className="warning-icon">⚠️</span>
              <div className="warning-content">
                <h5>Terminate Account</h5>
                <p>This action cannot be undone. All your data, including profile, chats, and linked accounts will be permanently deleted.</p>
              </div>
            </div>
            <button 
              onClick={handleTerminationClick}
              className={`terminate-account-btn ${terminationButtonActive ? 'active' : ''}`}
            >
              Terminate Account
              {ripple && <span className="ripple"></span>}
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="modal-overlay">
            <div className="delete-modal">
              <h3>Confirm Account Termination</h3>
              <div className="delete-warning">
                <span className="delete-icon">🗑️</span>
                <div>
                  <p>Are you sure you want to terminate your account? This action is permanent and cannot be undone.</p>
                  <ul>
                    <li>All your profile data will be deleted</li>
                    <li>Your chat history will be removed</li>
                    <li>Linked Riot account will be unlinked</li>
                    <li>You will be removed from any active queues</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="cancel-btn"
                  disabled={deletingAccount}
                >
                  Cancel
                </button>
                <button 
                  onClick={initiateAccountDeletion}
                  className="confirm-delete-btn"
                  disabled={deletingAccount}
                >
                  {deletingAccount ? "Deleting..." : "Yes, Delete My Account"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showReauthModal && (
          <div className="modal-overlay">
            <div className="reauth-modal">
              <h3>Verify Your Identity</h3>
              <div className="reauth-warning">
                <span className="reauth-icon">🔒</span>
                <p>For security reasons, please enter your password to confirm account deletion.</p>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="riot-id-input"
                />
                {reauthError && <div className="error-message">{reauthError}</div>}
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => {
                    setShowReauthModal(false);
                    setPassword("");
                    setReauthError("");
                  }}
                  className="cancel-btn"
                  disabled={deletingAccount}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReauthentication}
                  className="confirm-delete-btn"
                  disabled={deletingAccount || !password}
                >
                  {deletingAccount ? "Deleting..." : "Confirm Deletion"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;