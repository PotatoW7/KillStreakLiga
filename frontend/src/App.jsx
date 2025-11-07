import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Summoner from "./components/Summoner";
import FinishSignIn from "./components/FinishSignIn";
import FriendsList from "./components/FriendsList";
import Chat from "./components/Chat";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showSocial, setShowSocial] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await initializeUserInFirestore(firebaseUser);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const initializeUserInFirestore = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        username: user.displayName,
        email: user.email,
        createdAt: new Date(),
        friends: [],
        pendingRequests: [],
      });
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
    <>
      <nav>
        {!user ? (
          <>
            <Link className="nav-link" to="/">
              Login
            </Link>
            <Link className="nav-link" to="/register">
              Register
            </Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/profile">
              {user.displayName ? `Welcome, ${user.displayName}` : "Profile"}
            </Link>
            <Link className="nav-link" to="/summoner">
              Summoner Lookup
            </Link>
            <button className="nav-link" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </nav>

      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="/profile" /> : <Login />}
          />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/summoner" element={<Summoner />} />
          <Route path="/finishSignIn" element={<FinishSignIn />} />
          <Route
            path="*"
            element={<p className="error-box">404: Page not found</p>}
          />
        </Routes>

        {user && (
          <>
            <button
              className="floating-chat-btn"
              onClick={toggleSocial}
              title={showSocial ? "Close Chat" : "Open Friends & Chat"}
            >
             💬
            </button>

            <div className={`social-container-wrapper ${showSocial ? "open" : ""}`}>
              <div className="social-container">
                {!selectedFriend ? (
                  <FriendsList onSelectFriend={handleSelectFriend} />
                ) : (
                  <Chat
                    selectedFriend={selectedFriend}
                    onBack={handleBackToFriends}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;
