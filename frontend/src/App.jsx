import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Summoner from "./components/Summoner";
import FinishSignIn from "./components/FinishSignIn";
import FriendsList from "./components/FriendsList";
import Chat from "./components/Chat";
import QueueSystem from "./components/QueueSystem";
import Home from "./components/Home";
import Announcement from "./components/Announcement";
import BecomeCoach from "./components/BecomeCoach";
import CoachRules from "./components/CoachRules";
import Coaching from "./components/Coaching";
import AdminPanel from "./components/AdminPanel";
import AdminApplication from "./components/AdminApplication";
import LiveGame from "./components/LiveGame";
import Champions from "./components/Champions";
import Feeds from "./components/Feeds";
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import Legal from "./components/Legal";
import Contact from "./components/Contact";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";

import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./styles/index.css";

const OWNER_EMAIL = "mainprofile@gmail.com";

function NavLink({ to, children }) {
  const navigate = useNavigate();
  const isActive = window.location.pathname === to;
  return (
    <Link
      to={to}
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showSocial, setShowSocial] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeTab, setActiveTab] = useState('friends');
  const [socialMode, setSocialMode] = useState('chat');
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await initializeUserInFirestore(firebaseUser);
        setUserRole(role);

        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setProfileImage(userDoc.data().profileImage || null);
          }
        } catch (error) {
          console.error("Error fetching profile image:", error);
        }
      } else {
        setUserRole('user');
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const initializeUserInFirestore = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    const isOwner = user.email?.toLowerCase() === OWNER_EMAIL;

    if (!userDoc.exists()) {
      const newUserData = {
        username: isOwner ? "Owner" : user.displayName,
        email: user.email,
        createdAt: new Date(),
        friends: [],
        pendingRequests: [],
        role: isOwner ? "owner" : "user",
      };
      await setDoc(userRef, newUserData);

      if (isOwner) {
        await setDoc(doc(db, "owners", user.uid), {
          username: "Owner",
          email: user.email,
          createdAt: new Date()
        });
      }
      return newUserData.role;
    } else {
      const existingData = userDoc.data();
      if (isOwner && existingData.role !== 'owner') {
        await setDoc(userRef, { role: 'owner', username: 'Owner' }, { merge: true });
        await setDoc(doc(db, "owners", user.uid), {
          username: "Owner",
          email: user.email,
          createdAt: new Date()
        }, { merge: true });
        return 'owner';
      }
      return existingData.role || 'user';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setSelectedFriend(null);
      setShowSocial(false);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
  };

  const handleBackToFriends = () => {
    setSelectedFriend(null);
  };

  const toggleSocial = () => {
    setShowSocial(!showSocial);
    if (!showSocial) {
      setSelectedFriend(null);
    }
  };

  if (loading) return <div className="loading">Checking authentication...</div>;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <Link className="logo-link" to="/">
            <div className="logo-icon-box">
              <div className="logo-diamond" />
            </div>
            <span className="logo-text">RIFTHUB</span>
          </Link>

          <div className="nav-actions">
            <nav className="desktop-nav">
              <NavLink to="/feeds">Feed</NavLink>
              {!user ? (
                <>
                  <NavLink to="/summoner">Summoner</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  <Link to="/login" className="login-btn-desktop">LOGIN</Link>
                </>
              ) : (
                <>
                  <NavLink to="/summoner">Summoner</NavLink>
                  <NavLink to="/live-game">Live Game</NavLink>
                  <NavLink to="/queue">Queue</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  {(userRole === 'admin' || userRole === 'owner' || userRole === 'coach') && (
                    <NavLink to="/champions">Champions</NavLink>
                  )}
                  {(userRole === 'admin' || userRole === 'owner') && (
                    <Link className="admin-badge" to="/admin">
                      {userRole === 'owner' ? 'OWNER' : 'ADMIN'}
                    </Link>
                  )}
                </>
              )}
            </nav>

            {user && (
              <div className="user-actions">
                <button
                  className="notification-btn"
                  onClick={() => {
                    if (showSocial && socialMode === 'notifications') {
                      setShowSocial(false);
                    } else {
                      setShowSocial(true);
                      setSocialMode('notifications');
                      setActiveTab('requests');
                      setSelectedFriend(null);
                    }
                  }}
                  title="Notifications"
                >
                  <img src="/project-icons/Friends and Chat icons/bell.png" alt="Notifications" />
                  {notificationCount > 0 && (
                    <span className="notification-dot-wrapper">
                      <span className="notification-ping" />
                      <span className="notification-dot" />
                    </span>
                  )}
                </button>

                <div className="header-divider" />

                <div className="profile-btn-wrapper" ref={profileDropdownRef}>
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="profile-btn"
                  >
                    <img
                      src={profileImage || "https://ddragon.leagueoflegends.com/cdn/13.20.1/img/profileicon/588.png"}
                      alt="Profile"
                      className="profile-avatar"
                    />
                    <div className="online-indicator" />
                  </button>
                  {profileDropdownOpen && (
                    <div className="profile-dropdown glass-panel">
                      <button
                        onClick={() => { navigate('/profile'); setProfileDropdownOpen(false); }}
                        className="profile-dropdown-item"
                      >
                        <div className="dropdown-item-dot" />
                        Access Profile
                      </button>
                      <div className="dropdown-divider" />
                      <button
                        onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                        className="profile-dropdown-item danger"
                      >
                        <div className="dropdown-item-dot danger" />
                        Terminate Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!user && (
              <Link to="/login" className="mobile-login-btn">
                <span>!</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/profile" /> : <Login />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/feeds" element={<Feeds />} />
            <Route path="/summoner" element={<Summoner />} />
            <Route path="/live-game" element={<LiveGame />} />
            <Route path="/queue" element={<QueueSystem />} />
            <Route path="/finishSignIn" element={<FinishSignIn />} />
            <Route path="/become-coach" element={<BecomeCoach />} />
            <Route path="/coach-rules" element={<CoachRules />} />
            <Route path="/coaching" element={<Coaching />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/apply-admin" element={<AdminApplication />} />
            <Route path="/champions" element={<Champions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/tos" element={<TermsOfService />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />

            <Route
              path="*"
              element={<p className="error-box">404: Page not found</p>}
            />
          </Routes>
        </div>
        {user && (
          <Announcement
            notificationCount={notificationCount}
            setNotificationCount={setNotificationCount}
            isEmbedded={false}
            showPanel={false}
          />
        )}
        {user && (
          <>
            <button
              className={`social-chat-trigger ${showSocial && socialMode === 'chat' ? 'active' : ''}`}
              onClick={() => {
                if (showSocial && socialMode === 'chat') {
                  setShowSocial(false);
                } else {
                  setShowSocial(true);
                  setSocialMode('chat');
                  setActiveTab('friends');
                  setSelectedFriend(null);
                }
              }}
              title={showSocial ? "Close Hub" : "Open Social Hub"}
            >
              <div className="btn-overlay" />
              <img src="/project-icons/Friends and Chat icons/comment chat balloon.png" alt="Chat" />
              {totalUnreadMessages > 0 && (
                <span className="unread-badge">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                </span>
              )}
            </button>

            <div className={`social-panel glass-panel ${showSocial ? 'open' : ''}`}>
              <div className="social-panel-header">
                <div className="social-panel-title-group">
                  <h4 className="social-panel-title">
                    {socialMode === 'chat' ? 'Community Chat' : 'Notifications'}
                  </h4>
                  <div className="social-panel-status">
                    <div className="social-panel-status-bar" />
                    <p className="social-panel-status-text">Online Sync: Active</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSocial(false)}
                  className="social-panel-close"
                >
                  <div className="close-icon">
                    <div className="close-icon-line" />
                    <div className="close-icon-line" />
                  </div>
                </button>
              </div>
              <div className="social-panel-body">
                <div className="social-panel-body-glow" />
                {socialMode === 'chat' ? (
                  !selectedFriend ? (
                    <FriendsList
                      onSelectFriend={handleSelectFriend}
                      onUnreadCountChange={setTotalUnreadMessages}
                    />
                  ) : (
                    <Chat
                      selectedFriend={selectedFriend}
                      onBack={handleBackToFriends}
                    />
                  )
                ) : (
                  <Announcement
                    notificationCount={notificationCount}
                    setNotificationCount={setNotificationCount}
                    isEmbedded={true}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
      <CookieConsent />
    </div >
  );
}

export default App;