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
  const [linkingAccount, setLinkingAccount] = useState(false);
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("na1");
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");
  const [rankedData, setRankedData] = useState(null);

  const contextMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const regions = [
    { value: "na1", label: "North America (NA)" },
    { value: "euw1", label: "Europe West (EUW)" },
    { value: "eun1", label: "Europe Nordic & East (EUNE)" },
    { value: "kr", label: "Korea (KR)" },
    { value: "br1", label: "Brazil (BR)" },
    { value: "la1", label: "Latin America North (LAN)" },
    { value: "la2", label: "Latin America South (LAS)" },
    { value: "oc1", label: "Oceania (OCE)" },
    { value: "ru", label: "Russia (RU)" },
    { value: "tr1", label: "Turkey (TR)" },
    { value: "jp1", label: "Japan (JP)" },
    { value: "ph2", label: "Philippines (PH)" },
    { value: "sg2", label: "Singapore (SG)" },
    { value: "th2", label: "Thailand (TH)" },
    { value: "tw2", label: "Taiwan (TW)" },
    { value: "vn2", label: "Vietnam (VN)" }
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfileImage(userData.profileImage || null);
          setLinkedAccount(userData.riotAccount || null);
          
          // If there's a linked account, fetch ranked data
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

  const validateRiotId = async (riotId, region) => {
    const parts = riotId.split('#');
    if (parts.length !== 2) {
      throw new Error('Invalid Riot ID format. Use: name#tag');
    }

    const [gameName, tagLine] = parts;
    
    if (!gameName.trim() || !tagLine.trim()) {
      throw new Error('Both name and tag are required');
    }

    // Validate tag line length (max 5 characters)
    if (tagLine.length > 5) {
      throw new Error('Tag line cannot be longer than 5 characters');
    }

    // Validate game name length (Riot IDs have limits but being more permissive here)
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
      
      // Fetch ranked data for the newly linked account
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

  // RankedInfo component for displaying ranked data
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

          {/* Riot Account Linking Section */}
          <div className="riot-account-section">
            <h4>Riot Games Account</h4>
            
            {linkedAccount ? (
              <div className="linked-account-container">
                <div className="linked-account-info">
                  <div className="account-header">
                    <div className="account-icon-name">
                      <img 
                        src={`https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/${linkedAccount.profileIconId}.png`}
                        alt="Summoner icon"
                        className="summoner-icon"
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
                  <span className="account-linked-date">
                    Linked: {new Date(linkedAccount.linkedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Ranked Information */}
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
                    placeholder="Enter your Riot ID (e.g., wewtawgds#adgdf)"
                    className="riot-id-input"
                    maxLength={25} // Game name (16) + # (1) + tag (5) + buffer
                  />
                  <div className="input-hint">
                    Format: name#tag (name: 3-16 chars, tag: max 5 chars)
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
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

                <div className="account-note">
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;