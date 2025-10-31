import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import Summoner from "./components/Summoner";
import FinishSignIn from "./components/FinishSignIn";
import { auth } from "./firebase";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/"); // Redirect to login page after logout
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) return (
    <div className="loading">Checking authentication...</div>
  );

  return (
    <div className="app-container">
      <nav>
        {!user ? (
          <>
            <Link className="nav-link" to="/">Login</Link>
            <Link className="nav-link" to="/register">Register</Link>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/profile">
              {user.displayName ? `Welcome, ${user.displayName}` : "Profile"}
            </Link>
            <Link className="nav-link" to="/summoner">Summoner Lookup</Link>
            <button className="nav-link" onClick={handleLogout}>Logout</button>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={user ? <Navigate to="/profile" /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/summoner" element={<Summoner />} />
        <Route path="/finishSignIn" element={<FinishSignIn />} />
        <Route path="*" element={<p className="error-box">404: Page not found</p>} />
      </Routes>
    </div>
  );
}

export default App;