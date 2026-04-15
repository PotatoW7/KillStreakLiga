import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from "react-router-dom";
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
import AuthActionHandler from "./components/AuthActionHandler";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import ItemTooltip from "./components/ItemTooltip";
import MatchDetails from "./components/MatchDetails";
import { applyActionCode, checkActionCode, reload, getRedirectResult, linkWithCredential, EmailAuthProvider, signInWithPopup } from "firebase/auth";

import { auth, db, storage } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { useDDragon } from "./context/DDragonContext";
import "./styles/index.css";



function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

function UsernameModal({ user, onComplete, onCancel }) {
  const { latestVersion } = useDDragon();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 3) return setError("Username must be at least 3 characters.");
    if (trimmedUsername.length > 15) return setError("Username cannot exceed 15 characters.");

    setLoading(true);
    setError("");

    try {
      const q = query(collection(db, "users"), where("usernameLowercase", "==", trimmedUsername.toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Username already exists.");
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        username: trimmedUsername,
        usernameLowercase: trimmedUsername.toLowerCase(),
        email: user.email.toLowerCase(),
        createdAt: new Date(),
        friends: [],
        pendingRequests: [],
        emailVerified: user.emailVerified,
        role: "user",
        profileImage: user.photoURL || `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/29.png`
      });
      onComplete();
    } catch (err) {
      console.error("Error creating profile:", err);
      setError("Could not save profile. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="username-modal glass-panel">
        <div className="modal-header">
          <div className="auth-title-bar" />
          <h2 className="modal-title">Complete Your Profile</h2>
        </div>
        <p className="modal-subtitle">Choose a username for RiftHub</p>

        {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <p className="auth-label">Username</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
              placeholder="Enter username..."
              maxLength={15}
              required
              autoFocus
            />
          </div>
          <button disabled={loading} className="auth-submit">
            <span>{loading ? "Saving..." : "Start Climbing"}</span>
            <div className="auth-submit-shine" />
          </button>
        </form>
      </div>
    </div>
  );
}

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
  const { latestVersion } = useDDragon();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);

  useEffect(() => {
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    console.log("Auth Action Check:", {
      mode,
      hasCode: !!oobCode,
      path: window.location.pathname,
      loading
    });

    if (mode && oobCode) {
      if (mode === "resetPassword") {
        if (window.location.pathname !== "/auth/action") {
          console.log("Redirecting to /auth/action...");
          navigate(`/auth/action${window.location.search}`, { replace: true });
        }
      } else if (mode === "verifyEmail") {
        handleVerifyEmail(oobCode);
      }
    }
  }, [location.search, navigate, loading]);

  const [showSocial, setShowSocial] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [activeTab, setActiveTab] = useState('friends');
  const [socialMode, setSocialMode] = useState('chat');
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [profileImage, setProfileImage] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [globalFriends, setGlobalFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [verificationPopup, setVerificationPopup] = useState(null);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await initializeUserInFirestore(firebaseUser);
        setUserRole(role);

        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

        const isDeleting = sessionStorage.getItem('ignoringUsernameModal');
        if (!userDoc.exists() && !isDeleting) {
          setPendingUser(firebaseUser);
          setShowUsernameModal(true);
        }

        try {
          if (userDoc.exists()) {
            setProfileImage(userDoc.data().profileImage || null);
          }
        } catch (error) {
          console.error("Error fetching profile image:", error);
        }
      } else {
        sessionStorage.removeItem('ignoringUsernameModal');
        setProfileImage(null);
      }
      if (firebaseUser) {
        setProfileImage(prev => prev || firebaseUser.photoURL);
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleVerifyEmail = async (code) => {
    setVerificationPopup({ status: 'loading' });
    try {
      await checkActionCode(auth, code);
      await applyActionCode(auth, code);
      if (auth.currentUser) {
        await reload(auth.currentUser);
      }
      setVerificationPopup({ status: 'success' });
      setTimeout(() => setVerificationPopup(null), 5000);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationPopup({
        status: 'error',
        message: error.code === "auth/invalid-action-code"
          ? "Verification link expired or already used."
          : "An error occurred during verification."
      });
      setTimeout(() => setVerificationPopup(null), 5000);
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (!userDoc.exists()) {
            setPendingUser(user);
            setShowUsernameModal(true);
          }
        }
      } catch (error) {
        console.error("Error handling redirect:", error);
      }
    };
    handleRedirect();
  }, []);

  useEffect(() => {
    if (!user) {
      setGlobalFriends([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalFriends(data.friends || []);
        setProfileImage(data.profileImage || null);
        setUserRole(data.role || 'user');
      }
    });

    return () => unsubscribe();
  }, [user]);
  useEffect(() => {
    if (!user || globalFriends.length === 0) {
      setUnreadCounts({});
      setTotalUnreadMessages(0);
      return;
    }

    const unsubscribes = new Map();

    globalFriends.forEach(friend => {
      const chatId = [user.uid, friend.id].sort().join('_');
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef, where('read', '==', false));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const unreadCount = snapshot.docs.filter(doc => doc.data().senderId !== user.uid).length;
        setUnreadCounts(prev => {
          if (prev[friend.id] === unreadCount) return prev;
          return { ...prev, [friend.id]: unreadCount };
        });
      });

      unsubscribes.set(friend.id, unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, globalFriends.map(f => f.id).join(',')]);

  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    setTotalUnreadMessages(total);
  }, [unreadCounts]);

  async function initializeUserInFirestore(user) {
    const userRef = doc(db, "users", user.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (!data.usernameLowercase) {
          await updateDoc(userRef, {
            usernameLowercase: (data.username || user.displayName || "anonymous").toLowerCase()
          });
        }
        return data.role || 'user';
      }
    } catch (error) {
      console.error("Error in initializeUserInFirestore:", error);
    }
    return 'user';
  }

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
    <div className={`app-root ${showSocial ? 'social-open' : ''}`}>
      <header className="app-header">
        <div className="header-inner">
          <Link className="logo-link" to="/">
            <img src="/rifthub.png" alt="RiftHub Logo" className="logo-image" />
            <span className="logo-text">KILLSTREAK</span>
          </Link>

          <div className="nav-actions">
            <nav className="desktop-nav">
              <NavLink to="/feeds">Feed</NavLink>
              {!user ? (
                <>
                  <NavLink to="/summoner">Summoner Lookup</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  <div className="auth-buttons-group">
                    <Link to="/login" className="login-btn-desktop">LOGIN</Link>
                    <Link to="/register" className="login-btn-desktop">REGISTER</Link>
                  </div>
                </>
              ) : (
                <>
                  <NavLink to="/summoner">Summoner Lookup</NavLink>
                  <NavLink to="/queue">Queue finder</NavLink>
                  <NavLink to="/coaching">Coaching</NavLink>
                  {(userRole === 'admin' || userRole === 'coach') && (
                    <NavLink to="/champions">Champions</NavLink>
                  )}
                  {userRole === 'admin' && (
                    <Link className="admin-badge" to="/admin">
                      ADMIN
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
                      src={profileImage || `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/29.png`}
                      alt="Profile"
                      className="profile-avatar"
                    />
                  </button>
                  {profileDropdownOpen && (
                    <div className="profile-dropdown glass-panel">
                      <button
                        onClick={() => { navigate('/profile'); setProfileDropdownOpen(false); }}
                        className="profile-dropdown-item"
                      >
                        <div className="dropdown-item-dot" />
                        View Profile
                      </button>
                      <div className="dropdown-divider" />
                      <button
                        onClick={() => { handleLogout(); setProfileDropdownOpen(false); }}
                        className="profile-dropdown-item danger"
                      >
                        <div className="dropdown-item-dot danger" />
                        Logout
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
        <ScrollToTop />
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
            <Route path="/match/:region/:matchId" element={<MatchDetails />} />
            <Route path="/queue" element={<QueueSystem />} />
            <Route path="/finishSignIn" element={<FinishSignIn />} />
            <Route path="/auth/action" element={<AuthActionHandler />} />
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
              className={`social-chat-trigger ${showSocial && socialMode === 'chat' ? 'active' : ''} ${showSocial ? 'hidden' : ''}`}
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
                      unreadCounts={unreadCounts}
                    />
                  ) : (
                    <Chat
                      selectedFriend={selectedFriend}
                      onBack={handleBackToFriends}
                      isSocialOpen={showSocial}
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
      {
        verificationPopup && (
          <div className={`verification-popup-overlay ${verificationPopup.status}`}>
            <div className="verification-popup-card glass-panel">
              {verificationPopup.status === 'loading' ? (
                <div className="verifying-content">
                  <div className="verifying-spinner" />
                  <p>Verifying account...</p>
                </div>
              ) : verificationPopup.status === 'success' ? (
                <div className="success-content">
                  <div className="success-icon">✓</div>
                  <h3>Success!</h3>
                  <p>Account verification completed</p>
                  <button onClick={() => setVerificationPopup(null)} className="close-popup-btn">Dismiss</button>
                </div>
              ) : (
                <div className="error-content">
                  <div className="error-icon">✕</div>
                  <h3>Failed</h3>
                  <p>{verificationPopup.message}</p>
                  <button onClick={() => setVerificationPopup(null)} className="close-popup-btn">Dismiss</button>
                </div>
              )}
            </div>
          </div>
        )
      }
      {showUsernameModal && pendingUser && (
        <UsernameModal
          user={pendingUser}
          onComplete={() => {
            setShowUsernameModal(false);
            setPendingUser(null);
            navigate('/profile');
          }}
        />
      )}
    </div >
  );
}

export default App;