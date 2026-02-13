import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { fetchDDragon } from '../utils/fetchDDragon';
import '../styles/componentsCSS/livegame.css';

function LiveGame() {
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [champIdToName, setChampIdToName] = useState({});
    const [championRoles, setChampionRoles] = useState({});
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

                try {
                    const rolesSnapshot = await getDocs(collection(db, "champions"));
                    const rolesMap = {};
                    rolesSnapshot.forEach((docSnap) => {
                        rolesMap[docSnap.id] = docSnap.data();
                    });
                    console.log('Loaded champion roles from Firestore:', Object.keys(rolesMap).length);
                    setChampionRoles(rolesMap);
                } catch (rolesErr) {
                    console.warn('Could not load champion roles from Firestore (permissions?):', rolesErr.message);
                    console.warn('Live game will still work, but role sorting may be less accurate.');
                }

                const res = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/spectator/${region}/${puuid}`);
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
                console.error('Error:', err);
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
            '420': "Ranked Solo/Duo",
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

    const getRolePriorities = (player) => {
        if (player.spell1Id === 11 || player.spell2Id === 11) {
            return [{ role: 'JUNGLE', priority: 100 }];
        }

        const champIdStr = player.championId.toString();
        const champName = champIdToName[champIdStr];
        const champData = championRoles[champName];
        const priorities = [];

        if (champData) {
            (champData.mainRoles || []).forEach(role => {
                priorities.push({ role, priority: 3 });
            });
            (champData.secondaryRoles || []).forEach(role => {
                priorities.push({ role, priority: 2 });
            });
            (champData.offMetaRoles || []).forEach(role => {
                priorities.push({ role, priority: 1 });
            });
        }

        const spell1 = player.spell1Id;
        const spell2 = player.spell2Id;

        if (spell1 === 3 || spell2 === 3) {
            const existing = priorities.find(p => p.role === 'SUPPORT');
            if (existing) existing.priority += 0.5;
            else priorities.push({ role: 'SUPPORT', priority: 0.5 });
        }
        if (spell1 === 7 || spell2 === 7) {
            const existing = priorities.find(p => p.role === 'ADC');
            if (existing) existing.priority += 0.5;
            else priorities.push({ role: 'ADC', priority: 0.5 });
        }
        priorities.sort((a, b) => b.priority - a.priority);

        return priorities.length > 0 ? priorities : [{ role: 'UNKNOWN', priority: 0 }];
    };

    const detectRoleForPlayer = (player) => {
        const priorities = getRolePriorities(player);
        return priorities[0]?.role || 'UNKNOWN';
    };

    const sortParticipantsByRole = (participants, teamId) => {
        if (!participants || participants.length === 0) return [];

        let teamPlayers = participants.filter(p => p.teamId === teamId);
        if (teamPlayers.length === 0) return [];

        const correctOrder = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

        const playerPriorities = teamPlayers.map(player => ({
            player,
            priorities: getRolePriorities(player)
        }));

        const assigned = {};
        const usedPlayers = new Set();

        const jungler = playerPriorities.find(pp =>
            pp.priorities.length === 1 &&
            pp.priorities[0].role === 'JUNGLE' &&
            pp.priorities[0].priority === 100
        );
        if (jungler) {
            assigned['JUNGLE'] = jungler.player;
            usedPlayers.add(jungler.player.puuid || jungler.player.championId);
        }

        const rolesToFill = correctOrder.filter(r => !assigned[r]);
        for (const role of rolesToFill) {
            let bestPlayer = null;
            let bestScore = -1;

            for (const pp of playerPriorities) {
                const playerId = pp.player.puuid || pp.player.championId;
                if (usedPlayers.has(playerId)) continue;

                const rolePriority = pp.priorities.find(p => p.role === role);
                if (rolePriority && rolePriority.priority > bestScore) {
                    bestScore = rolePriority.priority;
                    bestPlayer = pp;
                }
            }

            if (bestPlayer) {
                assigned[role] = bestPlayer.player;
                usedPlayers.add(bestPlayer.player.puuid || bestPlayer.player.championId);
            }
        }

        const leftover = teamPlayers.filter(p => {
            const id = p.puuid || p.championId;
            return !usedPlayers.has(id);
        });

        for (const role of correctOrder) {
            if (!assigned[role] && leftover.length > 0) {
                assigned[role] = leftover.shift();
            }
        }


        return correctOrder.map(role => {
            const player = assigned[role];
            if (player) {
                return { ...player, detectedRole: role };
            }
            return null;
        }).filter(Boolean);
    };

    const getRoleIconPath = (role) => {
        const map = {
            'TOP': '/lane-icons/top lane.png',
            'JUNGLE': '/lane-icons/jg icon.png',
            'MID': '/lane-icons/mid lane.png',
            'ADC': '/lane-icons/adc lane.png',
            'SUPPORT': '/lane-icons/sup icon.png'
        };
        return map[role] || '';
    };

    const getSummonerSpellPath = (spellId) => {
        const spellMap = {
            1: 'Cleanse', 3: 'Exhaust', 4: 'Flash', 6: 'Ghost',
            7: 'Heal', 11: 'Smite', 12: 'Teleport', 13: 'Clarity',
            14: 'Ignite', 21: 'Barrier', 32: 'Mark', 39: 'Mark',
        };
        const spellName = spellMap[spellId];
        if (!spellName) {
            return '/summoner-spells/unknown.png';
        }
        return `/summoner-spells/${spellName}.png`;
    };

    const isRolelessMode = () => {
        const qId = Number(liveData?.gameQueueConfigId);
        const mode = liveData?.gameMode;
        return qId === 450 || mode === 'ARAM' || mode === 'URF' || qId === 900 || qId === 1900;
    };

    const isStreamerMode = (participant) => {
        return !participant.puuid || participant.puuid === '' || participant.bot === true;
    };

    const getPlayerDisplayName = (participant) => {
        if (isStreamerMode(participant)) {
            return null;
        }

        if (participant.riotId && participant.riotId !== 'Unknown') {
            return participant.riotId;
        }
        if (participant.summonerName && participant.summonerName !== 'Unknown') {
            return participant.summonerName;
        }
        if (participant.gameName && participant.gameName !== 'Unknown') {
            if (participant.tagLine) {
                return `${participant.gameName}#${participant.tagLine}`;
            }
            return participant.gameName;
        }

        return 'Unknown';
    };

    const handlePlayerClick = (participant) => {
        if (isStreamerMode(participant)) return;
        const username = getPlayerDisplayName(participant);
        if (username && username !== 'Unknown') {
            navigate(`/summoner?search=${encodeURIComponent(username)}&region=${region}`);
        }
    };

    const renderPlayerRunes = (player) => {
        if (!player.perks || !player.perks.perkIds || player.perks.perkIds.length === 0) {
            return null;
        }

        const perks = player.perks;
        const keystoneId = perks.perkIds[0];
        const secondaryStyle = perks.perkSubStyle;

        if (!keystoneId) return null;

        return (
            <div className="live-player-runes-simple">
                <img
                    src={getRuneIconPath(keystoneId)}
                    alt="Keystone"
                    className="live-rune-keystone"
                    onError={(e) => (e.target.src = "/runes/unknown.png")}
                />
                {secondaryStyle && (
                    <img
                        src={getRuneIconPath(secondaryStyle)}
                        alt="Secondary Style"
                        className="live-rune-secondary"
                        onError={(e) => (e.target.src = "/runes/unknown.png")}
                    />
                )}
            </div>
        );
    };

    const renderPlayerCard = (player, idx) => {
        const champName = champIdToName[player.championId] || 'Unknown';
        const streamer = isStreamerMode(player);
        const displayName = getPlayerDisplayName(player);
        const spell1 = getSummonerSpellPath(player.spell1Id);
        const spell2 = getSummonerSpellPath(player.spell2Id);
        const loadingUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champName}_0.jpg`;


        return (
            <div
                key={player.puuid || idx}
                className={`live-player-card ${streamer ? 'streamer-mode' : ''}`}
                onClick={() => handlePlayerClick(player)}
                style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.2), rgba(10,12,20,1)), url(${loadingUrl})`,
                    cursor: streamer ? 'default' : 'pointer'
                }}
            >
                <div className="card-top">
                    <span className="card-champ-name">{champName}</span>
                </div>

                <div className="card-bottom">
                    <div className="card-horizontal-row">
                        <div className="card-spells-runes">
                            {!isRolelessMode() && (
                                <div className="card-role">
                                    {player.detectedRole && (
                                        <img
                                            src={getRoleIconPath(player.detectedRole)}
                                            alt={player.detectedRole}
                                            className="card-role-icon"
                                        />
                                    )}
                                </div>
                            )}
                            <div className="card-spells">
                                <img src={spell1} alt="Spell 1" className="card-spell-icon" />
                                <img src={spell2} alt="Spell 2" className="card-spell-icon" />
                            </div>
                            <div className="card-runes">
                                {renderPlayerRunes(player)}
                            </div>
                        </div>
                    </div>

                    <div className="card-summoner-details">
                        {streamer ? (
                            <span className="card-streamer-badge">
                                {player.bot ? 'BOT' : 'Streamer Mode'}
                            </span>
                        ) : (
                            <span className="card-summoner-name">{displayName}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderTeam = (teamId, teamClass) => {
        if (!liveData?.participants) return null;

        const teamPlayers = sortParticipantsByRole(liveData.participants, teamId);

        console.log(`Team ${teamId} players:`, teamPlayers.map(p => ({
            name: getPlayerDisplayName(p),
            champion: champIdToName[p.championId],
            role: p.detectedRole,
            spells: [p.spell1Id, p.spell2Id]
        })));

        return (
            <div className={`live-team-grid ${teamClass}`}>
                {teamPlayers.map((player, idx) => renderPlayerCard(player, idx))}
            </div>
        );
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

    const blueTeamBans = liveData.bannedChampions?.filter(b => b.teamId === 100) || [];
    const redTeamBans = liveData.bannedChampions?.filter(b => b.teamId === 200) || [];

    return (
        <div className="live-game-page">
            <div className="live-sidebar-nav">
                <button onClick={() => navigate(-1)} className="live-back-btn">← Back to Profile</button>
            </div>

            <div className="live-game-content">
                <div className="live-game-header-simple">
                    <span className="header-mode-text">
                        {getGameModeName(liveData.gameMode, liveData.gameQueueConfigId)}
                    </span>
                    <span className="header-timer-text">{formatTime(elapsedTime)}</span>
                </div>

                <div className="live-main-grid">
                    {renderTeam(100, 'blue-team')}

                    <div className="live-bans-bar">
                        {!isRolelessMode() && <div className="team-ban-label">BLUE TEAM BANS</div>}
                        <div className="team-bans blue-bans">
                            {!isRolelessMode() && blueTeamBans.map((ban, idx) => {
                                const champName = champIdToName[ban.championId];
                                return champName && ban.championId !== -1 ? (
                                    <div key={idx} className="ban-item">
                                        <img
                                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                                            className="ban-icon-mini"
                                            alt={`Ban ${champName}`}
                                        />
                                    </div>
                                ) : <div key={idx} className="ban-placeholder-mini"></div>;
                            })}
                        </div>

                        <div className="vs-logo">VS</div>
                        <div className="team-bans red-bans">
                            {!isRolelessMode() && redTeamBans.map((ban, idx) => {
                                const champName = champIdToName[ban.championId];
                                return champName && ban.championId !== -1 ? (
                                    <div key={idx} className="ban-item">
                                        <img
                                            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                                            className="ban-icon-mini"
                                            alt={`Ban ${champName}`}
                                        />
                                    </div>
                                ) : <div key={idx} className="ban-placeholder-mini"></div>;
                            })}
                        </div>
                        {!isRolelessMode() && <div className="team-ban-label">RED TEAM BANS</div>}
                    </div>

                    {renderTeam(200, 'red-team')}
                </div>
            </div>
        </div>
    );
}

export default LiveGame;