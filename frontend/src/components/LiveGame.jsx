import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { fetchDDragon } from '../utils/fetchDDragon';

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
                setError('Error: Missing region or player data.');
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
                    setChampionRoles(rolesMap);
                } catch (rolesErr) {
                    console.warn('Could not load champion roles from Firestore');
                }

                const res = await fetch(`${import.meta.env.VITE_API_URL}/summoner-info/spectator/${region}/${puuid}`);
                if (!res.ok) throw new Error('Error: Failed to fetch live game data');

                const data = await res.json();

                if (!data.inGame) {
                    setError('Not in Game: This player is not currently in a live match.');
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
            '1900': "URF"
        };
        const qId = String(queueId);
        if (modes[qId]) return modes[qId];
        return gameMode || "Live Game";
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
            (champData.mainRoles || []).forEach(role => priorities.push({ role, priority: 3 }));
            (champData.secondaryRoles || []).forEach(role => priorities.push({ role, priority: 2 }));
            (champData.offMetaRoles || []).forEach(role => priorities.push({ role, priority: 1 }));
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
            if (!assigned[role] && leftover.length > 0) assigned[role] = leftover.shift();
        }
        return correctOrder.map(role => {
            const player = assigned[role];
            if (player) return { ...player, detectedRole: role };
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
        return spellName ? `/summoner-spells/${spellName}.png` : '/summoner-spells/unknown.png';
    };

    const isRolelessMode = () => {
        const qId = Number(liveData?.gameQueueConfigId);
        const mode = liveData?.gameMode;
        return qId === 450 || mode === 'ARAM' || mode === 'URF' || qId === 900 || qId === 1900;
    };

    const getPlayerDisplayName = (participant) => {
        if (!participant.puuid || participant.puuid === '' || participant.bot === true) return 'Streamer Mode';
        if (participant.riotId && participant.riotId !== 'Unknown') return participant.riotId;
        if (participant.summonerName && participant.summonerName !== 'Unknown') return participant.summonerName;
        if (participant.gameName && participant.gameName !== 'Unknown') {
            return participant.tagLine ? `${participant.gameName}#${participant.tagLine}` : participant.gameName;
        }
        return 'Unknown Player';
    };

    const handlePlayerClick = (participant) => {
        if (!participant.puuid || participant.puuid === '' || participant.bot === true) return;
        const username = getPlayerDisplayName(participant);
        if (username && username !== 'Unknown') {
            navigate(`/summoner?search=${encodeURIComponent(username)}&region=${region}`);
        }
    };

    const renderPlayerRunes = (player) => {
        if (!player.perks || !player.perks.perkIds || player.perks.perkIds.length === 0) return null;
        const perks = player.perks;
        const keystoneId = perks.perkIds[0];
        const secondaryStyle = perks.perkSubStyle;
        return (
            <div className="lg-runes">
                <img
                    src={getRuneIconPath(keystoneId)}
                    alt="Keystone"
                    className="lg-rune-icon"
                    onError={(e) => (e.target.src = "/runes/unknown.png")}
                />
                {secondaryStyle && (
                    <img
                        src={getRuneIconPath(secondaryStyle)}
                        alt="Secondary"
                        className="lg-rune-icon secondary"
                        onError={(e) => (e.target.src = "/runes/unknown.png")}
                    />
                )}
            </div>
        );
    };

    const renderPlayerCard = (player, idx, teamColor) => {
        const champName = champIdToName[player.championId] || 'Unknown';
        const streamer = !player.puuid || player.puuid === '' || player.bot === true;
        const displayName = getPlayerDisplayName(player);
        const isCurrent = player.puuid === puuid;

        return (
            <div
                key={player.puuid || idx}
                onClick={() => handlePlayerClick(player)}
                className={`lg-player glass-panel ${isCurrent ? 'current' : ''} ${streamer ? 'streamer' : ''}`}
            >
                <div className="lg-champ-wrapper">
                    <div className={`lg-champ-glow ${teamColor}`} />
                    <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champName}.png`}
                        className={`lg-champ-icon ${teamColor}`}
                        alt={champName}
                        onError={(e) => (e.target.src = "/placeholder-champ.png")}
                    />
                </div>

                <div className="lg-spells">
                    <img src={getSummonerSpellPath(player.spell1Id)} className="lg-spell-icon" alt="Spell1" />
                    <img src={getSummonerSpellPath(player.spell2Id)} className="lg-spell-icon" alt="Spell2" />
                </div>

                <div className="lg-player-info">
                    <h4 className="lg-player-name">{displayName}</h4>
                    <p className="lg-player-champ-text">{champName}</p>
                </div>

                <div className="lg-player-rank">
                    <img src="/rank-icons/Rank=Unranked.png" alt="Rank" className="lg-rank-icon" />
                    <span className="lg-rank-text">Lvl {player.summonerLevel || '??'}</span>
                </div>

                {!isRolelessMode() && player.detectedRole && (
                    <div className="lg-role-tag">
                        <img src={getRoleIconPath(player.detectedRole)} className="lg-role-icon" alt={player.detectedRole} />
                        <span className="lg-role-text">{player.detectedRole}</span>
                    </div>
                )}

                {renderPlayerRunes(player)}
            </div>
        );
    };

    if (loading) return (
        <div className="lg-loading">
            <div className="lg-spinner" />
            <p className="lg-loading-text">Synchronizing Live Data...</p>
        </div>
    );

    if (error) return (
        <div className="lg-not-in-game">
            <div className="lg-not-in-game-icon-box">
                <div className="lg-not-in-game-icon">!</div>
            </div>
            <h2 className="lg-not-in-game-title">{error.includes('Not in Game') ? 'No Active Match Detected' : 'Signal Lost'}</h2>
            <p className="lg-not-in-game-desc">{error}</p>
            <button
                onClick={() => navigate(-1)}
                className="lg-back-btn"
                style={{ width: 'auto', padding: '0 2rem', marginTop: '1rem' }}
            >
                Return to Base
            </button>
        </div>
    );

    const blueBans = liveData.bannedChampions?.filter(b => b.teamId === 100) || [];
    const redBans = liveData.bannedChampions?.filter(b => b.teamId === 200) || [];

    return (
        <div className="live-game-page">
            <header className="lg-header">
                <div className="lg-header-info">
                    <button onClick={() => navigate(-1)} className="lg-back-btn">
                        ←
                    </button>
                    <div>
                        <div className="lg-live-badge">
                            <div className="lg-live-dot" />
                            <span className="lg-live-text">Live Match</span>
                        </div>
                        <h1 className="lg-title">In-Game Analysis</h1>
                    </div>
                </div>

                <div className="lg-header-right">
                    <div className="lg-mode-badge">
                        <p className="lg-mode-label">Mode</p>
                        <p className="lg-mode-name">{getGameModeName(liveData.gameMode, liveData.gameQueueConfigId)}</p>
                    </div>

                    <div className="lg-timer-box">
                        <p className="lg-timer-label">Elasped</p>
                        <p className="lg-timer-value">{formatTime(elapsedTime)}</p>
                    </div>
                </div>
            </header>

            <div className="lg-teams">
                <div className="lg-team-card glass-panel">
                    <div className="lg-team-header blue">
                        <div className="lg-team-title-row">
                            <div className="lg-team-dot blue" />
                            <h3 className="lg-team-name blue">Blue Team</h3>
                        </div>
                        <span className="lg-team-count blue">5 Synchronized</span>
                    </div>
                    <div className="lg-players">
                        {sortParticipantsByRole(liveData.participants, 100).map((p, i) => renderPlayerCard(p, i, 'blue'))}
                    </div>
                </div>

                <div className="lg-team-card glass-panel">
                    <div className="lg-team-header red">
                        <div className="lg-team-title-row">
                            <div className="lg-team-dot red" />
                            <h3 className="lg-team-name red">Red Team</h3>
                        </div>
                        <span className="lg-team-count red">5 Synchronized</span>
                    </div>
                    <div className="lg-players">
                        {sortParticipantsByRole(liveData.participants, 200).map((p, i) => renderPlayerCard(p, i, 'red'))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LiveGame;
