import React, { useState, useEffect, useRef } from "react";
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, Activity, Target, Search, ChevronDown } from "lucide-react";
import RankedInfo from "./RankedInfo";
import MatchHistory from "./MatchHistory";
import ChampionMastery from "./ChampionMastery";
import { fetchDDragon } from "../utils/fetchDDragon";

function Summoner() {
  const [searchInput, setSearchInput] = useState("");
  const [displayRiotId, setDisplayRiotId] = useState("");
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
      setSearchInput(search);
      setDisplayRiotId(search);
      setRegion(regionParam);
      searchPlayer(search, regionParam);
    }
  }, [location]);

  useEffect(() => {
    const handleSearchPlayer = (event) => {
      const { riotId, region } = event.detail;
      setSearchInput(riotId);
      setDisplayRiotId(riotId);
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
    setDisplayRiotId(playerRiotId);
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

      const summonerRes = await fetch(`${API_URL}/summoner-info/${playerRegion}/${encodedGameName}/${encodedTagLine}`);

      if (!summonerRes.ok) {
        if (summonerRes.status === 404) {
          throw new Error("Player not found. Please check the Riot ID and region.");
        }
        throw new Error("Failed to fetch player data.");
      }

      const summonerData = await summonerRes.json();
      setData(summonerData);

      addToRecentSearches(playerRiotId, playerRegion);

      fetch(`${API_URL}/summoner-info/spectator/${playerRegion}/${summonerData.puuid}`)
        .then(r => r.ok ? r.json() : { inGame: false })
        .then(spectatorData => {
          setLiveGame(spectatorData);
          if (spectatorData.inGame && spectatorData.gameStartTime) {
            const startSeconds = Math.floor((Date.now() - spectatorData.gameStartTime) / 1000);
            setElapsedTime(Math.max(0, startSeconds));
          }
        })
        .catch(() => setLiveGame(null));

      const matchRes = await fetch(`${API_URL}/match-history/${playerRegion}/${summonerData.puuid}?mode=${mode}`);
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
    setSearchInput(recentRiotId);
    setDisplayRiotId(recentRiotId);
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
    await searchPlayer(searchInput, region);
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

  const renderRankCard = (rankData, label) => {
    if (!rankData) return (
      <div className="summoner-rank-card unranked">
        <div className="summoner-rank-label">{label}</div>
        <div className="summoner-rank-unranked">Unranked</div>
      </div>
    );

    const winRate = Math.round((rankData.wins / (rankData.wins + rankData.losses)) * 100);
    const tierName = rankData.tier.charAt(0) + rankData.tier.slice(1).toLowerCase();

    return (
      <div className="summoner-rank-card ranked">
        <div className="summoner-rank-header">
          <div className="summoner-rank-label">{label}</div>
          <div className={`summoner-rank-wr ${winRate >= 50 ? 'positive' : 'negative'}`}>
            {winRate}% WR
          </div>
        </div>

        <div className="summoner-rank-display">
          <img
            src={`/rank-icons/Rank=${tierName}.png`}
            alt={rankData.tier}
            className="summoner-rank-icon"
            onError={(e) => (e.target.src = "/rank-icons/Rank=Unranked.png")}
          />
          <div>
            <div className="summoner-rank-tier">{rankData.tier} {rankData.rank}</div>
            <div className="summoner-rank-lp">{rankData.leaguePoints} LP</div>
          </div>
        </div>

        <div className="summoner-rank-stats">
          <span>{rankData.wins} Wins</span>
          <span>{rankData.losses} Losses</span>
        </div>
        <div className="summoner-rank-bar-track" title={`${rankData.leaguePoints} LP`}>
          <div
            className="summoner-rank-bar-fill"
            style={{ width: `${Math.min(100, rankData.leaguePoints)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="summoner-page">
      <div className="summoner-search">
        <div className="summoner-search-glow-wrapper">
          <div className="summoner-search-glow"></div>
          <div className="summoner-search-bar glass-panel">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faker#KR1"
              className="summoner-search-input"
            />
            <div className="summoner-region-wrapper">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="summoner-region-select"
              >
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
              </select>
              <div className="summoner-region-chevron">
                <ChevronDown />
              </div>
            </div>
            <button
              onClick={getSummonerInfo}
              disabled={loading}
              className="summoner-search-btn"
            >
              <Search className="icon-sm" />
            </button>
          </div>

          {recentSearches.length > 0 && (
            <div className="recent-searches-box glass-panel">
              <div className="recent-header">
                <span className="recent-title">History</span>
                <button
                  onClick={clearRecentSearches}
                  className="recent-clear-btn"
                >
                  Clear All
                </button>
              </div>
              <div className="recent-pills">
                {recentSearches.map((search, index) => (
                  <div key={index} className="recent-pill">
                    <div
                      className="recent-pill-content"
                      onClick={() => handleRecentSearchClick(search.riotId, search.region)}
                    >
                      <span className="recent-pill-name">{search.riotId.split('#')[0]}</span>
                      <span className="recent-pill-tag">#{search.riotId.split('#')[1]}</span>
                    </div>
                    <button
                      className="recent-pill-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(index);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="summoner-error glass-panel">
          <div className="summoner-error-icon">
            <span>!</span>
          </div>
          <p className="summoner-error-text">{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="summoner-profile glass-panel">
            <div className="summoner-profile-glow" />

            <div className="summoner-avatar-wrapper">
              <div className="summoner-avatar-glow"></div>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${data.profileIconId}.png`}
                alt="Profile Icon"
                className="summoner-avatar"
              />
              <div className="summoner-level-badge">
                {data.summonerLevel}
              </div>
            </div>

            <div className="summoner-info">
              <h1 className="summoner-name">
                {displayRiotId.split('#')[0]}
                <span className={`summoner-tag ${(displayRiotId.split('#')[1] || data.tagLine || region.toUpperCase()).length > 3 ? 'long-tag' : ''}`}>
                  #{displayRiotId.split('#')[1] || data.tagLine || region.toUpperCase()}
                </span>
              </h1>

              <div className="summoner-badges">
                {liveGame?.inGame && (
                  <div className="summoner-badge live">
                    <Activity className="icon-sm" />
                    <span>In Game</span>
                  </div>
                )}
                <div className="summoner-badge region">
                  <Target className="icon-sm" />
                  <span>{region.toUpperCase()} Region</span>
                </div>
              </div>

              {playerTags.length > 0 && (
                <div className="summoner-tags">
                  {playerTags.slice(0, 4).map((tag, index) => (
                    <span key={index} className="summoner-player-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="summoner-ranks">
              {(() => {
                const solo = data.ranked?.find(q => q.queueType === "RANKED_SOLO_5x5");
                return renderRankCard(solo, "Ranked Solo");
              })()}
              {(() => {
                const flex = data.ranked?.find(q => q.queueType === "RANKED_FLEX_SR");
                return renderRankCard(flex, "Ranked Flex");
              })()}
            </div>
          </div>
          {data.mastery && data.mastery.length > 0 && (
            <div className="summoner-mastery-strip glass-panel" style={{ marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <h4 className="summoner-section-title">
                <div className="summoner-section-bar" />
                Champion Mastery
              </h4>
              <ChampionMastery masteryData={data.mastery} champIdToName={champIdToName} version={version} />
            </div>
          )}

          <div className="summoner-match-section">
            {liveGame?.inGame && (
              <div
                className="summoner-live-banner"
                onClick={handleLiveGameClick}
              >
                <div className="summoner-live-glow" />

                <div className="summoner-live-badge" style={{ flexShrink: 0 }}>
                  LIVE GAME
                </div>

                <div className="summoner-live-details">
                  {(() => {
                    const currentPlayer = getLiveGameChampion();
                    if (currentPlayer && champIdToName[currentPlayer.championId]) {
                      const champName = champIdToName[currentPlayer.championId];
                      return (
                        <>
                          <img
                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                            alt={champName}
                            className="summoner-live-champ-icon"
                          />
                          <div>
                            <div className="summoner-live-status">Match In Progress</div>
                            <div className="summoner-live-mode">
                              {champName} <span className="separator">-</span> {getGameModeName(liveGame.gameMode, liveGame.gameQueueConfigId)}
                            </div>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="summoner-live-timer">
                  <div className="summoner-live-time">{formatElapsedTime(elapsedTime)}</div>
                  <div className="summoner-live-label">Duration</div>
                </div>
              </div>
            )}

            <div className="summoner-match-header">
              <h2 className="summoner-match-title">Match History</h2>
              <div className="summoner-match-label">
                <div className="summoner-match-dot" />
                <div className="summoner-match-label-text">Recent History</div>
              </div>
            </div>

            {matchLoading ? (
              <div className="summoner-match-loading glass-panel">
                <div className="summoner-match-spinner" />
                <p className="summoner-match-loading-text">Loading Match History...</p>
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