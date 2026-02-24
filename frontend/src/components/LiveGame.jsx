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
            <div className="flex flex-col gap-1.5 ">
                <img
                    src={getRuneIconPath(keystoneId)}
                    alt="Keystone"
                    className="w-6 h-6 object-contain drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]"
                    onError={(e) => (e.target.src = "/runes/unknown.png")}
                />
                {secondaryStyle && (
                    <img
                        src={getRuneIconPath(secondaryStyle)}
                        alt="Secondary"
                        className="w-4 h-4 object-contain opacity-50 mx-auto"
                        onError={(e) => (e.target.src = "/runes/unknown.png")}
                    />
                )}
            </div>
        );
    };

    const renderPlayerCard = (player, idx) => {
        const champName = champIdToName[player.championId] || 'Unknown';
        const streamer = !player.puuid || player.puuid === '' || player.bot === true;
        const displayName = getPlayerDisplayName(player);
        const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champName}_0.jpg`;

        return (
            <div
                key={player.puuid || idx}
                onClick={() => handlePlayerClick(player)}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-black/40 transition-all duration-700 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(234,179,8,0.1)] ${streamer ? 'cursor-default' : 'cursor-pointer'}`}
            >
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                    style={{ backgroundImage: `url(${splashUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="relative h-48 flex flex-col justify-end p-4">
                    <div className="flex justify-between items-end gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic mb-1 drop-shadow-lg">{champName}</p>
                            <h4 className="text-xs font-black uppercase tracking-widest text-white truncate drop-shadow-lg">
                                {streamer ? <span className="text-muted-foreground/50">{displayName}</span> : displayName}
                            </h4>
                        </div>

                        <div className="flex items-center gap-2 pb-1">
                            {!isRolelessMode() && player.detectedRole && (
                                <img src={getRoleIconPath(player.detectedRole)} className="w-4 h-4 object-contain opacity-60" alt={player.detectedRole} />
                            )}
                            <div className="flex flex-col gap-1">
                                <img src={getSummonerSpellPath(player.spell1Id)} className="w-4 h-4 rounded-md border border-white/10" alt="Spell1" />
                                <img src={getSummonerSpellPath(player.spell2Id)} className="w-4 h-4 rounded-md border border-white/10" alt="Spell2" />
                            </div>
                            {renderPlayerRunes(player)}
                        </div>
                    </div>
                </div>

                {!streamer && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(234,179,8,0.6)]" />}
            </div>
        );
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-pulse">Loading Live Game...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="glass-panel p-8 rounded-3xl border-red-500/20 max-w-md">
                <p className="text-sm font-black uppercase tracking-widest text-red-400 mb-6 italic">{error}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const blueBans = liveData.bannedChampions?.filter(b => b.teamId === 100) || [];
    const redBans = liveData.bannedChampions?.filter(b => b.teamId === 200) || [];

    return (
        <div className="min-h-screen pt-24 pb-16 px-4">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">


                <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
                        <div>
                            <h1 className="font-display text-3xl font-black uppercase tracking-[0.2em] italic text-white leading-none">Live Game</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/50 mt-2">Mode: {getGameModeName(liveData.gameMode, liveData.gameQueueConfigId)}</p>
                        </div>
                    </div>

                    <div className="glass-panel px-12 py-4 rounded-2xl border-primary/20 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 mb-1">Duration</p>
                        <p className="font-display text-3xl font-black text-white italic tracking-widest">{formatTime(elapsedTime)}</p>
                    </div>

                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-xl bg-white/2 border border-white/5 text-[9px] font-black uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all group shrink-0"
                    >
                        <span className="opacity-40 group-hover:opacity-100 transition-opacity mr-2">←</span> Exit Match
                    </button>
                </div>


                <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">


                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 italic">Blue Team</h3>
                            <div className="h-0.5 flex-1 mx-4 bg-gradient-to-r from-blue-400/20 to-transparent" />
                        </div>
                        <div className="grid gap-3">
                            {sortParticipantsByRole(liveData.participants, 100).map((p, i) => renderPlayerCard(p, i))}
                        </div>
                    </div>


                    <div className="flex flex-col items-center gap-8 py-12">
                        <div className="flex flex-col gap-4">
                            {!isRolelessMode() && blueBans.map((ban, i) => {
                                const name = champIdToName[ban.championId];
                                return (
                                    <div key={i} className="w-10 h-10 rounded-xl border border-red-500/20 bg-black grayscale opacity-40 hover:opacity-100 transition-all group overflow-hidden relative">
                                        {name && ban.championId !== -1 ? (
                                            <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`} alt="Ban" className="w-full h-full object-cover" />
                                        ) : <div className="w-full h-full bg-white/2" />}
                                        <div className="absolute inset-0 bg-red-500/20 group-hover:opacity-0 transition-opacity" />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="font-display text-2xl font-black italic text-white/10 tracking-[0.5em] [writing-mode:vertical-lr] select-none">BANNED CHAMPIONS</div>

                        <div className="flex flex-col gap-4">
                            {!isRolelessMode() && redBans.map((ban, i) => {
                                const name = champIdToName[ban.championId];
                                return (
                                    <div key={i} className="w-10 h-10 rounded-xl border border-red-500/20 bg-black grayscale opacity-40 hover:opacity-100 transition-all group overflow-hidden relative">
                                        {name && ban.championId !== -1 ? (
                                            <img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${name}.png`} alt="Ban" className="w-full h-full object-cover" />
                                        ) : <div className="w-full h-full bg-white/2" />}
                                        <div className="absolute inset-0 bg-red-500/20 group-hover:opacity-0 transition-opacity" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>


                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="h-0.5 flex-1 mx-4 bg-gradient-to-l from-red-400/20 to-transparent" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-400 italic">Red Team</h3>
                        </div>
                        <div className="grid gap-3">
                            {sortParticipantsByRole(liveData.participants, 200).map((p, i) => renderPlayerCard(p, i))}
                        </div>
                    </div>

                </div>


                <div className="text-center opacity-10 pt-12">
                    <p className="text-[8px] font-black uppercase tracking-[0.8em] hidden">End of Live Game Data</p>
                </div>
            </div>
        </div>
    );
}

export default LiveGame;
