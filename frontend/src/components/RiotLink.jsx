import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function RiotLink() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("euw1");

  const handleLink = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await setDoc(doc(db, "users", uid), {
        riotAccount: { gameName, tagLine, region }
      }, { merge: true });
      alert("Riot account linked!");
    } catch (err) {
      console.error("Failed to link Riot account:", err.message);
    }
  };

  return (
    <form onSubmit={handleLink} className="form-container">
      <h3>Link Riot Account</h3>
      <input
        type="text"
        placeholder="Game Name"
        value={gameName}
        onChange={(e) => setGameName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Tag Line"
        value={tagLine}
        onChange={(e) => setTagLine(e.target.value)}
        required
      />
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="euw1">EUW</option>
        <option value="na1">NA</option>
        <option value="kr">KR</option>
        <option value="eun1">EUNE</option>
      </select>
      <button type="submit">Link Account</button>
    </form>
  );
}

export default RiotLink;
