import React, { useEffect, useState } from "react";
import { auth } from "../firebase";

function Profile() {
  const [summonerData, setSummonerData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummonerInfo = async () => {
      try {
        // Hardcoded for now — you can later store Riot ID in Firestore or user metadata
        const region = "euw1";
        const gameName = "ZedZaKmet#ZED";
        const tagLine = "EUW";

        const res = await fetch(`/summoner-info/${region}/${gameName}/${tagLine}`);
        if (!res.ok) throw new Error("Failed to fetch summoner info");
        const data = await res.json();
        setSummonerData(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchSummonerInfo();
  }, []);

  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!summonerData) return <p>Loading summoner info...</p>;

  return (
    <div>
      <h2>Welcome, {auth.currentUser?.displayName || auth.currentUser?.email}</h2>
      <p>Summoner: {summonerData.name}</p>
      <p>Level: {summonerData.summonerLevel}</p>
      <img
        src={`https://ddragon.leagueoflegends.com/cdn/img/profileicon/${summonerData.profileIconId}.png`}
        alt="Profile Icon"
        width={64}
        height={64}
      />
    </div>
  );
}

export default Profile;
