import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, Activity, Target, Search, ChevronDown } from "lucide-react";
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
          throw new Error("Player not found. Please check the Riot ID and region.");
        }
        throw new Error("Failed to fetch player data.");
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

  const renderRankCard = (rankData, label) => {
    if (!rankData) return (
      <div className="bg-secondary/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 min-w-[200px] flex flex-col justify-center">
        <div className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest mb-1">{label}</div>
        <div className="text-xs font-bold text-muted-foreground/30 italic tracking-tight">Unranked</div>
      </div>
    );

    const winRate = Math.round((rankData.wins / (rankData.wins + rankData.losses)) * 100);
    const tierName = rankData.tier.charAt(0) + rankData.tier.slice(1).toLowerCase();

    return (
      <div className="bg-secondary/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 min-w-[280px] z-10 hover:border-primary/20 transition-all group/rank">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">{label}</div>
          <div className={`text-[10px] font-black ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {winRate}% WR
          </div>
        </div>

        <div className="flex items-center gap-4">
          <img
            src={`/rank-icons/Rank=${tierName}.png`}
            alt={rankData.tier}
            className="w-16 h-16 group-hover/rank:scale-110 transition-transform duration-500"
            onError={(e) => (e.target.src = "/rank-icons/Rank=Unranked.png")}
          />
          <div>
            <div className="font-display text-2xl font-black text-primary leading-none mb-1">{rankData.tier} {rankData.rank}</div>
            <div className="font-bold text-lg text-foreground">{rankData.leaguePoints} LP</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <span>{rankData.wins} Wins</span>
          <span>{rankData.losses} Losses</span>
        </div>
        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${winRate}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      {/* Search Section (Simplified for top) */}
      <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
          <div className="relative glass-panel rounded-2xl p-2 flex items-center gap-3">
            <input
              type="text"
              value={riotId}
              onChange={(e) => setRiotId(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faker#KR1"
              className="flex-1 border-0 bg-transparent px-4 py-2 text-lg font-medium placeholder:text-muted-foreground/30 outline-none"
            />
            <div className="relative group/select">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-[10px] font-black tracking-[0.2em] uppercase text-white/70 hover:text-primary hover:border-primary/50 transition-all outline-none cursor-pointer"
              >
                <option value="euw1" className="bg-neutral-900">EUW</option>
                <option value="eun1" className="bg-neutral-900">EUNE</option>
                <option value="na1" className="bg-neutral-900">NA</option>
                <option value="kr" className="bg-neutral-900">KR</option>
                <option value="jp1" className="bg-neutral-900">JP</option>
                <option value="br1" className="bg-neutral-900">BR</option>
                <option value="la1" className="bg-neutral-900">LAN</option>
                <option value="la2" className="bg-neutral-900">LAS</option>
                <option value="oc1" className="bg-neutral-900">OCE</option>
                <option value="ru" className="bg-neutral-900">RU</option>
                <option value="tr1" className="bg-neutral-900">TR</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 group-hover/select:text-primary/50 transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <button
              onClick={getSummonerInfo}
              disabled={loading}
              className="bg-primary text-black px-6 py-2 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-white active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel border-red-500/30 bg-red-500/5 p-4 rounded-2xl mb-8 flex items-center gap-3 animate-in zoom-in-95 duration-300">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-red-500 font-bold">!</span>
          </div>
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {data && (
        <>
          <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />

            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${data.profileIconId}.png`}
                alt="Profile Icon"
                className="w-32 h-32 rounded-2xl border-4 border-secondary/50 shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border-2 border-primary text-primary px-3 py-1 rounded-full text-xs font-black shadow-xl z-20">
                {data.summonerLevel}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left z-10">
              <h1 className="font-display text-4xl font-black text-foreground mb-2 flex flex-col md:flex-row md:items-baseline gap-2">
                <span>{riotId.split('#')[0]}</span>
                <span className="text-muted-foreground font-medium text-2xl tracking-tight">#{riotId.split('#')[1] || data.tagLine || region.toUpperCase()}</span>
              </h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/5 text-primary">
                  <Trophy className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Master Tier</span>
                </div>
                {liveGame?.inGame && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-green-500/20 bg-green-500/5 text-green-500 animate-pulse">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] uppercase font-black tracking-widest">In Game</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-muted-foreground">
                  <Target className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-black tracking-widest">{region.toUpperCase()} Region</span>
                </div>
              </div>

              {playerTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  {playerTags.slice(0, 4).map((tag, index) => (
                    <span key={index} className="px-2 py-1 rounded-lg bg-secondary/60 text-[9px] font-black tracking-wider uppercase border border-white/5 text-foreground/70">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 z-10">
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

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-8">
              <div className="glass-panel p-8 rounded-3xl group">
                <h4 className="font-display text-xl font-black mb-6 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  Champion Mastery
                </h4>
                <ChampionMastery masteryData={data.mastery} champIdToName={champIdToName} version={version} />
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {liveGame?.inGame && (
                <div
                  className="group relative overflow-hidden rounded-3xl border border-green-500/30 bg-green-500/5 p-6 flex flex-col md:flex-row items-center gap-6 cursor-pointer hover:bg-green-500/10 transition-all"
                  onClick={handleLiveGameClick}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]" />

                  <div className="relative flex-shrink-0">
                    <div className="bg-green-500 text-black font-black text-[9px] px-4 py-1.5 rounded-full relative z-10 tracking-[0.2em]">
                      LIVE GAME
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-4 z-10">
                    {(() => {
                      const currentPlayer = getLiveGameChampion();
                      if (currentPlayer && champIdToName[currentPlayer.championId]) {
                        const champName = champIdToName[currentPlayer.championId];
                        return (
                          <>
                            <img
                              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                              alt={champName}
                              className="w-12 h-12 rounded-xl border-2 border-green-500/50"
                            />
                            <div>
                              <div className="text-green-400 font-black text-[10px] uppercase tracking-widest mb-0.5">Match In Progress</div>
                              <div className="font-display text-xl font-bold">
                                {champName} <span className="text-muted-foreground/50 font-normal mx-2">-</span> {getGameModeName(liveGame.gameMode, liveGame.gameQueueConfigId)}
                              </div>
                            </div>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="z-10 text-right">
                    <div className="text-2xl font-black text-white tabular-nums leading-none mb-1">{formatElapsedTime(elapsedTime)}</div>
                    <div className="text-[9px] font-black text-green-500/70 tracking-[0.2em] uppercase">Duration</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-2 mb-2">
                <h2 className="font-display text-2xl font-black uppercase tracking-tight italic">Match History</h2>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recent History</div>
                </div>
              </div>

              {matchLoading ? (
                <div className="glass-panel p-20 rounded-3xl flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-muted-foreground font-bold tracking-[0.3em] uppercase text-[10px]">Loading Match History...</p>
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
          </div>
        </>
      )}
    </div>
  );
}

export default Summoner;