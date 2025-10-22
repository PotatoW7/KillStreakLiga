// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Profile from "./components/Profile";
import { auth } from "./firebase";


function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <div className="App">
        <nav style={{ marginBottom: "20px" }}>
          {!user && (
            <>
              <Link to="/" style={{ marginRight: "10px" }}>Login</Link>
              <Link to="/register" style={{ marginRight: "10px" }}>Register</Link>
            </>
          )}
          {user && (
            <Link to="/profile">
              {user.displayName ? `Welcome, ${user.displayName}` : "Your Profile"}
            </Link>
          )}
        </nav>

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<p>404: Page not found</p>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
