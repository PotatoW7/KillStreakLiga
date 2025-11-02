import React, { useState, useEffect } from "react";
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
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    const savedSearches = localStorage.getItem("lolRecentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lolRecentSearches", JSON.stringify(recentSearches));
  }, [recentSearches]);

  const addToRecentSearches = (playerRiotId, playerRegion) => {
    const searchEntry = { riotId: playerRiotId, region: playerRegion, timestamp: Date.now() };
    
    setRecentSearches(prev => {
      const filtered = prev.filter(search => 
        !(search.riotId === playerRiotId && search.region === playerRegion)
      );
      
      return [searchEntry, ...filtered].slice(0, 10);
    });
  };

  const searchPlayer = async (playerRiotId, playerRegion = region) => {
    setLoading(true);
    setMatchLoading(true);
    setError(null);
    setData(null);
    setMatches([]);
    setRiotId(playerRiotId);
    setRegion(playerRegion);

    const [gameName, tagLine] = playerRiotId.split("#");
    if (!gameName || !tagLine || !playerRegion) {
      setError("Invalid Riot ID format.");
      setLoading(false);
      setMatchLoading(false);
      return;
    }

    try {
      const { latestVersion, champIdToName, champNameToId } = await fetchDDragon();
      setVersion(latestVersion);
      setChampIdToName(champIdToName);
      setChampNameToId(champNameToId);

      const encodedGameName = encodeURIComponent(gameName);
      const encodedTagLine = encodeURIComponent(tagLine);
      
      const summonerRes = await fetch(`/summoner-info/${playerRegion}/${encodedGameName}/${encodedTagLine}`);
      
      if (!summonerRes.ok) {
        if (summonerRes.status === 404) {
          throw new Error("Summoner not found. Please check the Riot ID and region.");
        }
        throw new Error("Failed to fetch summoner data.");
      }
      
      const summonerData = await summonerRes.json();
      setData(summonerData);

      addToRecentSearches(playerRiotId, playerRegion);

      const matchRes = await fetch(`/match-history/${playerRegion}/${summonerData.puuid}?mode=${mode}`);
      if (!matchRes.ok) throw new Error("Failed to fetch match history");
      
      const matchData = await matchRes.json();
      setMatches(matchData.recentGames || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setMatchLoading(false);
    }
  };

  const handleRecentSearchClick = (recentRiotId, recentRegion) => {
    setRiotId(recentRiotId);
    setRegion(recentRegion);
    searchPlayer(recentRiotId, recentRegion);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const removeRecentSearch = (indexToRemove) => {
    setRecentSearches(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const generatePlayerTags = (masteryData, champIdToName) => {
    if (!masteryData || masteryData.length === 0) return [];
    
    const tags = [];
    const topChamps = masteryData.slice(0, 5);
    
    topChamps.forEach((mastery) => {
      const champName = champIdToName[mastery.championId];
      if (champName) {
        tags.push(`${champName} Lover`);
        if (mastery.championPoints >= 1000000) tags.push(`${champName} Millionaire`);
        if (mastery.championPoints >= 500000) tags.push(`${champName} Expert`);
        if (mastery.championLevel === 7) tags.push(`${champName} Master`);
      }
    });

    return [...new Set(tags)].slice(0, 8);
  };

  const getSummonerInfo = async () => { 
    await searchPlayer(riotId, region); 
  };
  
  const handleKeyPress = (e) => { 
    if (e.key === "Enter") getSummonerInfo(); 
  };
  
  const playerTags = data ? generatePlayerTags(data.mastery, champIdToName) : [];

  return (
    <div className="summoner-page">
      <h1 className="text-center">Summoner Lookup</h1>

      <div className="search-container">
        <input 
          type="text" 
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

      {recentSearches.length > 0 && (
        <div className="recent-searches-section">
          <div className="recent-searches-header">
            <h4>Recent Searches</h4>
            <button 
              onClick={clearRecentSearches} 
              className="clear-recent-btn"
              title="Clear all recent searches"
            >
              Clear All
            </button>
          </div>
          <div className="recent-searches-container">
            {recentSearches.map((search, index) => (
              <div key={index} className="recent-search-item">
                <button
                  onClick={() => handleRecentSearchClick(search.riotId, search.region)}
                  className="recent-search-btn"
                  title={`Search for ${search.riotId} in ${search.region.toUpperCase()}`}
                >
                  <span className="recent-search-name">{search.riotId}</span>
                  <span className="recent-search-region">{search.region.toUpperCase()}</span>
                </button>
                <button
                  onClick={() => removeRecentSearch(index)}
                  className="remove-recent-btn"
                  title="Remove from recent searches"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {matchLoading ? (
              <div className="loading-matches">
                <p className="text-center">Loading matches...</p>
              </div>
            ) : (
              <MatchHistory 
                matches={matches} 
                champNameToId={champNameToId} 
                version={version} 
                puuid={data.puuid}
                onPlayerClick={searchPlayer}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Summoner;