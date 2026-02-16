import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const [liveGame, setLiveGame] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const [champIdToName, setChampIdToName] = useState({});
  const [champNameToId, setChampNameToId] = useState({});
  const [itemsData, setItemsData] = useState({});
  const [version, setVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const search = searchParams.get('search');
    const regionParam = searchParams.get('region');

    if (search && regionParam) {
      setRiotId(search);
      setRegion(regionParam);
      searchPlayer(search, regionParam);
    }
  }, [location]);

  useEffect(() => {
    const handleSearchPlayer = (event) => {
      const { riotId, region } = event.detail;
      setRiotId(riotId);
      setRegion(region);
      searchPlayer(riotId, region);
    };

    window.addEventListener('searchPlayer', handleSearchPlayer);

    return () => {
      window.removeEventListener('searchPlayer', handleSearchPlayer);
    };
  }, []);

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
    setLiveGame(null);
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
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
      const { latestVersion, champIdToName, champNameToId, itemsData } = await fetchDDragon();
      setVersion(latestVersion);
      setChampIdToName(champIdToName);
      setChampNameToId(champNameToId);
      setItemsData(itemsData);

      const encodedGameName = encodeURIComponent(gameName);
      const encodedTagLine = encodeURIComponent(tagLine);

      const summonerRes = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/${playerRegion}/${encodedGameName}/${encodedTagLine}`);

      if (!summonerRes.ok) {
        if (summonerRes.status === 404) {
          throw new Error("Summoner not found. Please check the Riot ID and region.");
        }
        throw new Error("Failed to fetch summoner data.");
      }

      const summonerData = await summonerRes.json();
      setData(summonerData);

      addToRecentSearches(playerRiotId, playerRegion);

      fetch(`${import.meta.env.VITE_API_URL}/summoner-info/spectator/${playerRegion}/${summonerData.puuid}`)
        .then(r => r.ok ? r.json() : { inGame: false })
        .then(spectatorData => {
          setLiveGame(spectatorData);
          if (spectatorData.inGame && spectatorData.gameStartTime) {
            const startSeconds = Math.floor((Date.now() - spectatorData.gameStartTime) / 1000);
            setElapsedTime(Math.max(0, startSeconds));
          }
        })
        .catch(() => setLiveGame(null));

      const matchRes = await fetch(`${import.meta.env.VITE_API_URL}/match-history/${playerRegion}/${summonerData.puuid}?mode=${mode}`);
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

  useEffect(() => {
    if (liveGame?.inGame) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveGame?.inGame]);

  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGameModeName = (gameMode, queueId) => {
    const modes = {
      '400': "Normal Draft",
      '420': "Ranked Solo Duo",
      '430': "Normal Blind",
      '440': "Ranked Flex",
      '450': "ARAM",
      '480': "Swiftplay",
      '490': "Swiftplay",
      '700': "Clash",
      '900': "URF",
      '1020': "One For All",
      '1300': "Nexus Blitz",
      '1400': "Ultimate Spellbook",
      '1700': "Arena",
      '1900': "URF",
      '2000': "Tutorial",
      '2400': "Aram Mayhem"
    };
    const qId = String(queueId);
    if (modes[qId]) return modes[qId];

    const labels = {
      CLASSIC: 'Summoner\'s Rift',
      ARAM: 'ARAM',
      URF: 'URF',
      CHERRY: 'Arena',
      ONEFORALL: 'One For All',
      NEXUSBLITZ: 'Nexus Blitz',
      ULTBOOK: 'Ultimate Spellbook'
    };
    return labels[gameMode] || gameMode || "Live Game";
  };

  const getLiveGameChampion = () => {
    if (!liveGame?.inGame || !liveGame.participants || !data?.puuid) return null;
    return liveGame.participants.find(p => p.puuid === data.puuid);
  };

  const handleLiveGameClick = () => {
    if (liveGame?.inGame && data?.puuid) {
      navigate(`/live-game?region=${region}&puuid=${data.puuid}`);
    }
  };

  return (
    <div className="summoner-page">
      <h1 className="text-center">Summoner Lookup</h1>

      <div className="search-container">
        <input
          type="text"
          value={riotId}
          onChange={(e) => setRiotId(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter Riot ID (name#tag)"
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="euw1">EUW</option>
          <option value="eun1">EUNE</option>
          <option value="na1">NA</option>
          <option value="kr">KR</option>
          <option value="jp1">JP</option>
          <option value="br1">BR</option>
          <option value="la1">LAN</option>
          <option value="la2">LAS</option>
          <option value="oc1">OCE</option>
          <option value="ru">RU</option>
          <option value="tr1">TR</option>
          <option value="ph2">PH</option>
          <option value="sg2">SG</option>
          <option value="th2">TH</option>
          <option value="tw2">TW</option>
          <option value="vn2">VN</option>
          <option value="me1">ME</option>
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="all">All</option>
          <option value="solo_duo">Solo/Duo</option>
          <option value="ranked_flex">Flex</option>
          <option value="draft">Draft</option>
          <option value="aram">ARAM</option>
          <option value="aram_mayhem">Aram Mayhem</option>
          <option value="urf">URF</option>
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

          {liveGame?.inGame && (
            <div className="live-game-banner" onClick={handleLiveGameClick} title="Click to view live game details">
              <div className="live-game-indicator">
                <span className="live-dot"></span>
                <span className="live-text">LIVE</span>
              </div>
              <div className="live-game-info">
                <span className="live-game-mode">{getGameModeName(liveGame.gameMode, liveGame.gameQueueConfigId)}</span>
                {(() => {
                  const currentPlayer = getLiveGameChampion();
                  if (currentPlayer && champIdToName[currentPlayer.championId]) {
                    const champName = champIdToName[currentPlayer.championId];
                    return (
                      <div className="live-champion-info">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                          alt={champName}
                          className="live-champion-icon"
                        />
                        <span className="live-champion-name">Playing {champName}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                <span className="live-game-time">
                  {formatElapsedTime(elapsedTime)}
                </span>
              </div>
              <div className="live-game-view-details">
                View Details →
              </div>
            </div>
          )}

          <div className="match-history-section">
            {matchLoading ? (
              <div className="loading-matches">
                <p className="text-center">Loading matches...</p>
              </div>
            ) : (
              <MatchHistory
                matches={matches}
                champIdToName={champIdToName}
                champNameToId={champNameToId}
                itemsData={itemsData}
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