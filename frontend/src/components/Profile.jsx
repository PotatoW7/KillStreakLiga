import React from "react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  if (!user) {
    return <p>You must be logged in to view this page.</p>;
  }

  return (
    <div>
      <h2>Welcome, {user.displayName || user.email}</h2>
      <p>Email: {user.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Profile;
