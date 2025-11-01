import React, { useState } from "react";
import RankedInfo from "./RankedInfo";
import MatchHistory from "./MatchHistory";
import ChampionMastery from "./ChampionMastery";
import { fetchDDragon } from "../utils/fetchDDragon";

function Summoner() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("euw1");
  const [mode, setMode] = useState("all");
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [champIdToName, setChampIdToName] = useState({});
  const [champNameToId, setChampNameToId] = useState({});
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generatePlayerTags = (masteryData, champIdToName) => {
    if (!masteryData || masteryData.length === 0) return [];
    
    const tags = [];
    const topChamps = masteryData.slice(0, 5); // Top 5 champions
    
    topChamps.forEach((mastery) => {
      const champName = champIdToName[mastery.championId];
      if (champName) {
        tags.push(`${champName} Lover`);
        
        if (mastery.championPoints >= 1000000) {
          tags.push(`${champName} Millionaire`);
        }
        
        if (mastery.championPoints >= 500000) {
          tags.push(`${champName} Expert`);
        }
        
        if (mastery.championLevel === 7) {
          tags.push(`${champName} Master`);
        }
      }
    });

    if (masteryData.length > 0) {
      const totalMasteryPoints = masteryData.reduce((sum, mastery) => sum + mastery.championPoints, 0);
      
      
    }
    
    return [...new Set(tags)].slice(0, 8);
  };

  const getSummonerInfo = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setMatches([]);

    const [gameName, tagLine] = riotId.split("#");
    if (!gameName || !tagLine || !region) {
      setError("Enter Riot ID like Name#Tag and select a region.");
      setLoading(false);
      return;
    }

    try {
      const { latestVersion, champIdToName, champNameToId } = await fetchDDragon();
      setVersion(latestVersion);
      setChampIdToName(champIdToName);
      setChampNameToId(champNameToId);

      const summonerRes = await fetch(`/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      if (!summonerRes.ok) throw new Error("Summoner not found.");
      const summonerData = await summonerRes.json();
      setData(summonerData);

      const matchRes = await fetch(`/match-history/${region}/${summonerData.puuid}?mode=${mode}`);
      const matchData = await matchRes.json();
      setMatches(matchData.recentGames || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === "Enter") getSummonerInfo(); };

  const playerTags = data ? generatePlayerTags(data.mastery, champIdToName) : [];

  return (
    <div className="summoner-page">
      <h1 className="text-center">Summoner Lookup</h1>

      <div className="search-container">
        <input 
          type="text" 
          placeholder="Riot ID (Faker#KR1)" 
          value={riotId} 
          onChange={(e) => setRiotId(e.target.value)} 
          onKeyPress={handleKeyPress} 
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="euw1">EUW</option>
          <option value="eun1">EUNE</option>
          <option value="na1">NA</option>
          <option value="kr">KR</option>
          <option value="jp1">JP</option>
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="all">All</option>
          <option value="solo_duo">Solo/Duo</option>
          <option value="ranked_flex">Flex</option>
          <option value="draft">Draft</option>
          <option value="aram">ARAM</option>
          <option value="swiftplay">Swiftplay</option>
          <option value="arena">Arena</option>
        </select>
        <button onClick={getSummonerInfo} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {data && (
        <>
          <div className="profile-section">
            <div className="profile-card">
              <div className="profile-icon-container">
                <img 
                  src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${data.profileIconId}.png`} 
                  alt="Profile Icon" 
                  className="profile-icon"
                />
                <div className="summoner-level">{data.summonerLevel}</div>
              </div>
              <div className="profile-details">
                <h2>{data.name}</h2>
                <div className="profile-rank-info">
                  <RankedInfo 
                    rankedSolo={data.ranked?.find(q => q.queueType === "RANKED_SOLO_5x5")} 
                    rankedFlex={data.ranked?.find(q => q.queueType === "RANKED_FLEX_SR")} 
                    compact={true}
                  />
                </div>
                
                {/* Player Tags Section */}
                {playerTags.length > 0 && (
                  <div className="player-tags-section">
                    <h4>Player Tags</h4>
                    <div className="player-tags-container">
                      {playerTags.map((tag, index) => (
                        <span key={index} className="player-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <ChampionMastery masteryData={data.mastery} champIdToName={champIdToName} version={version} />
              </div>
            </div>
          </div>

          <div className="match-history-section">
            <MatchHistory matches={matches} champNameToId={champNameToId} version={version} puuid={data.puuid}/>
          </div>
        </>
      )}
    </div>
  );
}

export default Summoner;