import React, { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

function RiotLink() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("euw1");
  const [loading, setLoading] = useState(false);

  const validateRiotAccount = async (gameName, tagLine, region) => {
    try {
      const response = await fetch(`http://localhost:3000/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      
      if (!response.ok) {
        throw new Error('Summoner not found');
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
      throw new Error('Failed to validate Riot account. Please check the details and try again.');
    }
  };

  const handleLink = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (!gameName.trim() || !tagLine.trim()) {
      alert("Please enter both Game Name and Tag Line");
      return;
    }

    setLoading(true);

    try {
      const validatedAccount = await validateRiotAccount(gameName, tagLine, region);

      const accountData = {
        ...validatedAccount,
        linkedAt: new Date()
      };

      await setDoc(doc(db, "users", uid), {
        riotAccount: accountData
      }, { merge: true });
      
      alert("Riot account linked successfully!");
      setGameName("");
      setTagLine("");
      setRegion("euw1");
    } catch (err) {
      console.error("Failed to link Riot account:", err.message);
      alert(err.message || "Failed to link Riot account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLink} className="link-account-form">
      <h3>Link Riot Account</h3>
      <div className="form-group">
        <label>Game Name</label>
        <input
          type="text"
          placeholder="Game Name"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          required
          className="riot-id-input"
        />
      </div>
      <div className="form-group">
        <label>Tag Line</label>
        <input
          type="text"
          placeholder="Tag Line"
          value={tagLine}
          onChange={(e) => setTagLine(e.target.value)}
          required
          className="riot-id-input"
        />
      </div>
      <div className="form-group">
        <label>Region</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="euw1">EUW</option>
          <option value="na1">NA</option>
          <option value="kr">KR</option>
          <option value="eun1">EUNE</option>
        </select>
      </div>
      <button 
        type="submit" 
        className="link-account-btn" 
        disabled={loading}
      >
        {loading ? "Validating..." : "Link Account"}
      </button>
    </form>
  );
}

export default RiotLink;