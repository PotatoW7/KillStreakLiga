import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchDDragon } from '../utils/fetchDDragon';
import '../styles/componentsCSS/livegame.css';

function LiveGame() {
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [hoveredPlayer, setHoveredPlayer] = useState(null);
    const [champIdToName, setChampIdToName] = useState({});
    const [version, setVersion] = useState('');
    const timerRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    const searchParams = new URLSearchParams(location.search);
    const region = searchParams.get('region');
    const puuid = searchParams.get('puuid');

    useEffect(() => {
        const loadData = async () => {
            if (!region || !puuid) {
                setError('Missing region or player data.');
                setLoading(false);
                return;
            }

            try {
                const { latestVersion, champIdToName: cMap } = await fetchDDragon();
                setVersion(latestVersion);
                setChampIdToName(cMap);

                const res = await fetch(`/summoner-info/spectator/${region}/${puuid}`);
                if (!res.ok) throw new Error('Failed to fetch live game data');

                const data = await res.json();
                if (!data.inGame) {
                    setError('This player is not currently in a game.');
                    setLoading(false);
                    return;
                }

                setLiveData(data);

                if (data.gameStartTime) {
                    const startSeconds = Math.floor((Date.now() - data.gameStartTime) / 1000);
                    setElapsedTime(Math.max(0, startSeconds));
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [region, puuid]);

    useEffect(() => {
        if (liveData?.inGame) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [liveData?.inGame]);

    const formatTime = (seconds) => {
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
            '2010': "Tutorial",
            '2020': "Tutorial"
        };

        const qId = String(queueId);
        if (modes[qId]) return modes[qId];

        const modeLabels = {
            CLASSIC: "Summoner's Rift",
            ARAM: 'ARAM',
            URF: 'URF',
            CHERRY: 'Arena',
            ONEFORALL: 'One For All',
            NEXUSBLITZ: 'Nexus Blitz',
            ULTBOOK: 'Ultimate Spellbook',
            PRACTICETOOL: 'Practice Tool',
            TUTORIAL: 'Tutorial'
        };
        return modeLabels[gameMode] || gameMode || "Live Game";
    };

    const getRuneIconPath = (perkId) => {
        const runeMap = {
            8100: 'Domination/7200_Domination', 8112: 'Domination/Electrocute',
            8128: 'Domination/DarkHarvest', 9923: 'Domination/HailOfBlades',
            8126: 'Domination/CheapShot', 8139: 'Domination/GreenTerror_TasteOfBlood',
            8143: 'Domination/SuddenImpact', 8137: 'Domination/SixthSense',
            8140: 'Domination/GrislyMementos', 8141: 'Domination/DeepWard',
            8135: 'Domination/TreasureHunter', 8105: 'Domination/RelentlessHunter',
            8106: 'Domination/UltimateHunter',

            8000: 'Precision/7201_Precision', 8005: 'Precision/PressTheAttack',
            8008: 'Precision/LethalTempoTemp', 8021: 'Precision/FleetFootwork',
            8010: 'Precision/Conqueror', 9101: 'Precision/AbsorbLife', 9111: 'Precision/Triumph',
            8009: 'Precision/PresenceOfMind', 9104: 'Precision/LegendAlacrity',
            9105: 'Precision/LegendHaste', 9103: 'Precision/LegendBloodline',
            8014: 'Precision/CoupDeGrace', 8017: 'Precision/CutDown', 8299: 'Precision/LastStand',

            8200: 'Sorcery/7202_Sorcery', 8214: 'Sorcery/SummonAery', 8229: 'Sorcery/ArcaneComet',
            8230: 'Sorcery/PhaseRush', 8224: 'Sorcery/Axiom_Arcanist', 8226: 'Sorcery/ManaflowBand',
            8275: 'Sorcery/NimbusCloak', 8210: 'Sorcery/Transcendence', 8234: 'Sorcery/CelerityTemp',
            8233: 'Sorcery/AbsoluteFocus', 8237: 'Sorcery/Scorch', 8232: 'Sorcery/Waterwalking',
            8236: 'Sorcery/GatheringStorm',

            8400: 'Resolve/7204_Resolve', 8437: 'Resolve/GraspOfTheUndying',
            8439: 'Resolve/VeteranAftershock', 8465: 'Resolve/Guardian',
            8446: 'Resolve/Demolish', 8463: 'Resolve/FontOfLife', 8401: 'Resolve/BonePlating',
            8429: 'Resolve/Conditioning', 8444: 'Resolve/SecondWind', 8473: 'Resolve/BonePlating',
            8451: 'Resolve/Overgrowth', 8453: 'Resolve/Revitalize', 8242: 'Resolve/Unflinching',

            8300: 'Inspiration/7203_Whimsy', 8351: 'Inspiration/GlacialAugment',
            8360: 'Inspiration/UnsealedSpellbook', 8369: 'Inspiration/FirstStrike',
            8306: 'Inspiration/HextechFlashtraption', 8304: 'Inspiration/MagicalFootwear',
            8321: 'Inspiration/CashBack2', 8313: 'Inspiration/PerfectTiming',
            8352: 'Inspiration/TimeWarpTonic', 8345: 'Inspiration/BiscuitDelivery',
            8347: 'Inspiration/CosmicInsight', 8410: 'Inspiration/ApproachVelocity',
            8316: 'Inspiration/JackofAllTrades2',

            5001: 'stat-modifiers/StatModsHealthScalingIcon', 5005: 'stat-modifiers/StatModsAttackSpeedIcon',
            5007: 'stat-modifiers/StatModsCDRScalingIcon', 5008: 'stat-modifiers/StatModsAdaptiveForceIcon',
            5010: 'stat-modifiers/StatModsMovementSpeedIcon', 5011: 'stat-modifiers/StatModsHealthPlusIcon',
            5013: 'stat-modifiers/StatModsTenacityIcon',
        };
        return runeMap[perkId] ? `/runes/${runeMap[perkId]}.png` : '/runes/unknown.png';
    };

    const sortParticipantsByRole = (participants) => {
        return [...participants].sort((a, b) => {
            const hasSmite = (p) => p.spell1Id === 11 || p.spell2Id === 11;
            if (hasSmite(a) && !hasSmite(b)) return -1;
            if (!hasSmite(a) && hasSmite(b)) return 1;
            return 0;
        });
    };

    const getSummonerSpellPath = (spellId) => {
        const spellMap = {
            1: 'SummonerBoost', 3: 'SummonerExhaust', 4: 'SummonerFlash',
            6: 'SummonerHaste', 7: 'SummonerHeal', 11: 'SummonerSmite',
            12: 'SummonerTeleport', 13: 'SummonerMana', 14: 'SummonerDot',
            21: 'SummonerBarrier', 30: 'SummonerPoroRecall', 31: 'SummonerPoroThrow',
            32: 'SummonerSnowball', 39: 'SummonerSnowURFSnowball_Mark',
            54: 'Summoner_UltBookPlaceholder', 55: 'Summoner_UltBookSmitePlaceholder'
        };
        return spellMap[spellId] || null;
    };

    const isStreamerMode = (participant) => {
        return !participant.puuid || participant.puuid === '' || participant.puuid === 'BOT';
    };

    const getPlayerDisplayName = (participant) => {
        if (isStreamerMode(participant)) {
            return null;
        }
        return participant.riotId || 'Unknown';
    };

    const handlePlayerClick = (participant) => {
        if (isStreamerMode(participant)) return;
        const riotId = participant.riotId;
        if (riotId && riotId !== 'Unknown') {
            navigate(`/summoner?search=${encodeURIComponent(riotId)}&region=${region}`);
        }
    };

    const renderTeam = (teamId, teamLabel, teamClass) => {
        if (!liveData?.participants) return null;
        let teamPlayers = liveData.participants.filter(p => p.teamId === teamId);
        teamPlayers = sortParticipantsByRole(teamPlayers);

        const teamBans = liveData.bannedChampions?.filter(b => b.teamId === teamId) || [];

        return (
            <div className={`live-team ${teamClass}`}>
                <div className="live-team-header-container">
                    <h3 className="live-team-header">{teamLabel}</h3>
                    <div className="live-team-bans">
                        {teamBans.map((ban, idx) => {
                            const champName = champIdToName[ban.championId];
                            if (!champName || ban.championId === -1) return <div key={idx} className="live-ban-icon empty-ban"></div>;
                            return (
                                <img
                                    key={idx}
                                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                                    alt={champName}
                                    className="live-team-ban-icon"
                                    title={`Banned: ${champName}`}
                                />
                            );
                        })}
                    </div>
                </div>
                <div className="live-team-players">
                    {teamPlayers.map((player, idx) => {
                        const champName = champIdToName[player.championId] || 'Unknown';
                        const streamer = isStreamerMode(player);
                        const displayName = getPlayerDisplayName(player);
                        const spell1 = getSummonerSpellPath(player.spell1Id);
                        const spell2 = getSummonerSpellPath(player.spell2Id);
                        const rowKey = `${player.teamId}-${idx}`;
                        const isHovered = hoveredPlayer === rowKey;

                        return (
                            <div
                                key={idx}
                                className={`live-player-row ${streamer ? 'streamer-mode' : ''}`}
                                onClick={() => handlePlayerClick(player)}
                                style={{ cursor: streamer ? 'default' : 'pointer' }}
                                title={streamer ? 'Streamer Mode' : `View ${displayName}'s profile`}
                            >
                                <div className="live-player-champion">
                                    <img
                                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                                        alt={champName}
                                        className="live-player-champ-icon"
                                        onError={(e) => { e.target.src = '/project-icons/default-icon.png'; }}
                                    />
                                    <div className="live-player-spells">
                                        {spell1 && (
                                            <img
                                                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell1}.png`}
                                                alt="Spell 1"
                                                className="live-player-spell-icon"
                                            />
                                        )}
                                        {spell2 && (
                                            <img
                                                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell2}.png`}
                                                alt="Spell 2"
                                                className="live-player-spell-icon"
                                            />
                                        )}
                                    </div>
                                    <div className="live-player-runes" onMouseLeave={() => setHoveredPlayer(null)}>
                                        {player.perks && (
                                            <>
                                                <img
                                                    src={getRuneIconPath(player.perks.perkIds[0])}
                                                    className="live-rune-icon primary-keystone"
                                                    onMouseEnter={() => setHoveredPlayer(rowKey)}
                                                />
                                                <img
                                                    src={getRuneIconPath(player.perks.perkSubStyle)}
                                                    className="live-rune-icon secondary-path"
                                                />
                                                {isHovered && (
                                                    <div className="live-runes-full">
                                                        <div className="rune-group">
                                                            <img src={getRuneIconPath(player.perks.perkStyle)} className="style-icon" />
                                                            {player.perks.perkIds.slice(0, 4).map((pid, i) => (
                                                                <img key={i} src={getRuneIconPath(pid)} className="rune-sub-icon" />
                                                            ))}
                                                        </div>
                                                        <div className="rune-group">
                                                            <img src={getRuneIconPath(player.perks.perkSubStyle)} className="style-icon" />
                                                            {player.perks.perkIds.slice(4, 6).map((pid, i) => (
                                                                <img key={i} src={getRuneIconPath(pid)} className="rune-sub-icon" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="live-player-info">
                                    <span className="live-player-champ-name">{champName}</span>
                                    {streamer ? (
                                        <span className="live-player-streamer-badge">Streamer Mode</span>
                                    ) : (
                                        <span className="live-player-name">{displayName}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderBans = () => {
        return null;
    };

    if (loading) {
        return (
            <div className="live-game-page">
                <div className="live-game-loading">
                    <div className="live-loading-spinner"></div>
                    <p>Loading live game data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="live-game-page">
                <div className="live-game-error">
                    <p>{error}</p>
                    <button onClick={() => navigate(-1)} className="live-back-btn">← Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="live-game-page">
            <button onClick={() => navigate(-1)} className="live-back-btn">← Back to Profile</button>

            <div className="live-game-header">
                <div className="live-header-indicator">
                    <span className="live-dot-lg"></span>
                    <span className="live-header-text">LIVE GAME</span>
                </div>
                <div className="live-header-details">
                    <span className="live-header-mode">{getGameModeName(liveData.gameMode, liveData.gameQueueConfigId)}</span>
                    <span className="live-header-timer">⏱ {formatTime(elapsedTime)}</span>
                </div>        </div>

            <div className="live-teams-container">
                {renderTeam(100, 'Blue Team', 'blue-team')}
                <div className="live-teams-divider">
                    <span className="live-vs-text">VS</span>
                </div>
                {renderTeam(200, 'Red Team', 'red-team')}
            </div>

            {renderBans()}
        </div>
    );
}

export default LiveGame;
