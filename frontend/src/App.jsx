import React, { useEffect, useState } from "react";
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

import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./styles/index.css";

const OWNER_EMAIL = "mainprofile@gmail.com";

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
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await initializeUserInFirestore(firebaseUser);
        setUserRole(role);
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
    <div className="app">
      <nav>
        {!user ? (
          <>
            <Link className="nav-link" to="/">
              Home
            </Link>
            <Link className="nav-link" to="/summoner">
              Summoner Lookup
            </Link>
            <Link className="nav-link" to="/coaching">
              Coaching
            </Link>
            <Link className="nav-link" to="/login">
              Login
            </Link>
            <Link className="nav-link" to="/register">
              Register
            </Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/">
              Home
            </Link>
            <Link className="nav-link" to="/profile">
              {user.displayName ? `Welcome, ${user.displayName}` : "Profile"}
            </Link>
            <Link className="nav-link" to="/summoner">
              Summoner Lookup
            </Link>
            <Link className="nav-link" to="/queue">
              Find Queue
            </Link>
            <Link className="nav-link" to="/coaching">
              Coaching
            </Link>
            {(userRole === 'admin' || userRole === 'owner') && (
              <Link className="nav-link admin-link" to="/admin">
                {userRole === 'owner' ? ' Owner Panel' : ' Admin Panel'}
              </Link>
            )}
            <button className="nav-link logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </nav>

      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/profile" /> : <Login />}
          />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/summoner" element={<Summoner />} />
          <Route path="/queue" element={<QueueSystem />} />
          <Route path="/finishSignIn" element={<FinishSignIn />} />
          <Route path="/become-coach" element={<BecomeCoach />} />
          <Route path="/coach-rules" element={<CoachRules />} />
          <Route path="/coaching" element={<Coaching />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/apply-admin" element={<AdminApplication />} />

          <Route
            path="*"
            element={<p className="error-box">404: Page not found</p>}
          />
        </Routes>
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
              className="notification-side-btn"
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
              <img src="/project-icons/Friends and Chat icons/bell.png" alt="Notifications" className="side-tab-icon" />
              {notificationCount > 0 && (
                <span className="side-notification-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
              )}
            </button>

            <button
              className="floating-chat-btn"
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
              title={showSocial ? "Close Chat" : "Open Friends & Chat"}
            >
              <img src="/project-icons/Friends and Chat icons/comment chat balloon.png" alt="Chat" className="floating-chat-icon" />
              {totalUnreadMessages > 0 && (
                <span className="chat-unread-badge">{totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}</span>
              )}
            </button>

            <div className={`social-container-wrapper ${showSocial ? "open" : ""}`}>
              <div className="social-header">
                <h4 className="social-header-title">
                  {socialMode === 'chat' ? ' Friends & Chat' : ' Notifications'}
                </h4>
              </div>
              <div className="social-container">
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
      </div>
    </div>
  );
}

export default App;