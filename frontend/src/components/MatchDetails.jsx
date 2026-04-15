import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { fetchDDragon } from "../utils/fetchDDragon";
import { useDDragon } from "../context/DDragonContext";
import ItemTooltip from "./ItemTooltip";
import { ChevronLeft, Swords, Shield, Heart, Eye, TrendingUp, Coins, MoveLeft } from "lucide-react";
import "../styles/componentsCSS/matchdetails.css";

const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_URL || "";

export default function MatchDetails() {
    const { region, matchId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const viewerPuuid = queryParams.get("puuid");
    const { latestVersion } = useDDragon();

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPuuid, setSelectedPuuid] = useState(viewerPuuid);
    const [activeTab, setActiveTab] = useState("fighting");
    const [ddragon, setDdragon] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [hoveredBar, setHoveredBar] = useState(null);
    const [compBlue, setCompBlue] = useState(null);
    const [compRed, setCompRed] = useState(null);
    const [hoveredRunePlayer, setHoveredRunePlayer] = useState(null);

    useEffect(() => {
        if (viewerPuuid) setSelectedPuuid(viewerPuuid);
    }, [viewerPuuid]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const dd = await fetchDDragon();
                setDdragon(dd);

                const res = await fetch(`${API_URL}/match-history/${region}/match/${matchId}`);
                if (!res.ok) throw new Error("Failed to fetch match details");
                const data = await res.json();
                setMatch(data);
                if (viewerPuuid) {
                    const me = data.players.find(p => p.puuid === viewerPuuid);
                    if (me) {
                        const opp = data.players.find(p => p.teamId !== me.teamId && p.teamPosition === me.teamPosition);
                        if (me.teamId === 100) {
                            setCompBlue(me.puuid);
                            setCompRed(opp ? opp.puuid : data.players.find(p => p.teamId === 200)?.puuid);
                        } else {
                            setCompRed(me.puuid);
                            setCompBlue(opp ? opp.puuid : data.players.find(p => p.teamId === 100)?.puuid);
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [region, matchId]);

    if (loading) return (
        <div className="match-details-page">
            <div className="md-loading">
                <div className="md-spinner" />
                <p>Fetching detailed match data...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="match-details-page">
            <div className="summoner-error glass-panel">
                <p>{error}</p>
                <button onClick={() => navigate(-1)} className="md-back-btn" style={{ marginTop: '1rem' }}>
                    Go Back
                </button>
            </div>
        </div>
    );

    const activePlayer = match.players.find(p => p.puuid === selectedPuuid) || match.players[0];
    const isWin = activePlayer.win;

    const blueTeam = match.players.filter(p => p.teamId === 100);
    const redTeam = match.players.filter(p => p.teamId === 200);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const getGameModeName = (queueId) => {
        const modes = {
            420: "Solo/Duo", 440: "Flex", 400: "Draft", 450: "ARAM",
            1700: "Arena", 2400: "Aram Mayhem", 900: "URF", 480: "Swiftplay"
        };
        return modes[queueId] || "Classic";
    };

    const handleItemEnter = (id, event) => {
        if (!id || id === 0) return;
        const item = ddragon?.itemsData?.[id];
        if (item) {
            setHoveredItem(item);
            setTooltipPos({ x: event.clientX, y: event.clientY });
        }
    };

    const handleSpellEnter = (spellId, event) => {
        const spell = ddragon?.spellIdToData?.[spellId];
        if (spell) {
            setHoveredItem(spell);
            setTooltipPos({ x: event.clientX, y: event.clientY });
        }
    };

    const getSummonerSpellPath = (spellId) => {
        const spellMap = {
            1: "Cleanse", 3: "Exhaust", 4: "Flash", 6: "Ghost",
            7: "Heal", 11: "Smite", 12: "Teleport", 13: "Clarity",
            14: "Ignite", 21: "Barrier", 32: "Mark", 39: "Mark",
            2201: "Flee", 2202: "Flash",
        };
        const spellName = spellMap[spellId];
        if (!spellName) return '/summoner-spells/unknown.png';
        return `/summoner-spells/${spellName}.png`;
    };

    const fixStatPerks = (statPerks) => {
        if (!statPerks) return null;
        const { defense, flex, offense } = statPerks;
        const validOffense = [5008, 5005, 5007];
        const validFlex = [5008, 5010, 5001];
        const validDefense = [5011, 5013, 5001];
        let fixedOffense = offense, fixedFlex = flex, fixedDefense = defense;
        if (!validOffense.includes(offense)) fixedOffense = 5008;
        if (!validFlex.includes(flex)) fixedFlex = 5008;
        if (!validDefense.includes(defense)) fixedDefense = 5011;
        return { offense: fixedOffense, flex: fixedFlex, defense: fixedDefense };
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

    const getAugmentIconPath = (iconPath) => {
        if (!iconPath) return "/runes/unknown.png";
        return `https://raw.communitydragon.org/latest/game/${iconPath.toLowerCase()}`;
    };

    const renderPlayerAugments = (player) => {
        const augments = [player.playerAugment1, player.playerAugment2, player.playerAugment3, player.playerAugment4].filter(id => id && id > 0);
        return (
            <div className="runes-container">
                <div className="augments-list" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {augments.slice(0, 2).map((augId, i) => {
                        const augment = ddragon?.augmentsData?.[augId];
                        return (
                            <img
                                key={i}
                                src={augment ? getAugmentIconPath(augment.icon) : "/runes/unknown.png"}
                                className="rune-icon augment-icon"
                                onMouseEnter={(e) => {
                                    if (augment) {
                                        setHoveredItem(augment);
                                        setTooltipPos({ x: e.clientX, y: e.clientY });
                                    }
                                }}
                                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredItem(null)}
                                onError={(e) => (e.target.src = "/runes/unknown.png")}
                                style={{ width: '20px', height: '20px', borderRadius: '4px' }}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderPlayerRunes = (player, side) => {
        if (!player.perks || !player.perks.styles) return null;
        const primary = player.perks.styles[0];
        const secondary = player.perks.styles[1];
        const fixed = fixStatPerks(player.perks.statPerks);
        const isHovered = hoveredRunePlayer === player.puuid;

        return (
            <div className="runes-container">
                {!isHovered ? (
                    <div className="runes-compact" onMouseEnter={() => setHoveredRunePlayer(player.puuid)}>
                        {primary?.selections?.[0] && (
                            <img
                                src={getRuneIconPath(primary.selections[0].perk)}
                                alt="Keystone"
                                className="rune-icon keystone"
                                onError={(e) => (e.target.src = "/runes/unknown.png")}
                            />
                        )}
                        {secondary?.style && (
                            <img
                                src={getRuneIconPath(secondary.style)}
                                alt="Secondary"
                                className="rune-icon secondary-style"
                                onError={(e) => (e.target.src = "/runes/unknown.png")}
                            />
                        )}
                    </div>
                ) : (
                    <div className={`runes-full ${side}`} onMouseLeave={() => { setHoveredRunePlayer(null); setHoveredItem(null); }}>
                        {primary && (
                            <div className="primary-runes">
                                {primary.selections?.map((s, i) => (
                                    <img
                                        key={i}
                                        src={getRuneIconPath(s.perk)}
                                        className={`rune-icon ${i === 0 ? "keystone" : "primary-rune"}`}
                                        onMouseEnter={(e) => {
                                            if (ddragon?.runesData?.[s.perk]) {
                                                setHoveredItem(ddragon.runesData[s.perk]);
                                                setTooltipPos({ x: e.clientX, y: e.clientY });
                                            }
                                        }}
                                        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        onError={(e) => (e.target.src = "/runes/unknown.png")}
                                    />
                                ))}
                            </div>
                        )}
                        {secondary && (
                            <div className="secondary-runes">
                                {secondary.selections?.map((s, i) => (
                                    <img
                                        key={i}
                                        src={getRuneIconPath(s.perk)}
                                        className="rune-icon secondary-rune"
                                        onMouseEnter={(e) => {
                                            if (ddragon?.runesData?.[s.perk]) {
                                                setHoveredItem(ddragon.runesData[s.perk]);
                                                setTooltipPos({ x: e.clientX, y: e.clientY });
                                            }
                                        }}
                                        onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        onError={(e) => (e.target.src = "/runes/unknown.png")}
                                    />
                                ))}
                            </div>
                        )}
                        {fixed && (
                            <div className="stat-shards">
                                <img src={getRuneIconPath(fixed.offense)} className="stat-shard" />
                                <img src={getRuneIconPath(fixed.flex)} className="stat-shard" />
                                <img src={getRuneIconPath(fixed.defense)} className="stat-shard" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const calculateAdvancedStats = (player) => {
        const timeline = match.timeline;
        if (!timeline) return { soloDeaths: 0, duels: 0, teamfights: 0, killsUnderTurret: 0, teamTotalTeamfights: 0 };

        let soloDeaths = 0;
        let pureDuelKills = 0;
        let pureDuelDeaths = 0;
        let duels = 0;
        let teamfights = 0;
        let teamTotalTeamfights = 0;
        let teamfightsWon = 0;
        const pId = player.participantId;
        const pTeamId = player.teamId;
        const teamIds = match.players.filter(p => p.teamId === pTeamId).map(p => p.participantId);
        const enemyIds = match.players.filter(p => p.teamId !== pTeamId).map(p => p.participantId);

        if (match.timeline && match.timeline.info && match.timeline.info.frames) {
            const allKills = [];
            match.timeline.info.frames.forEach(frame => {
                frame.events.forEach(event => {
                    if (event.type === "CHAMPION_KILL") allKills.push(event);
                });
            });
            const clashes = [];
            allKills.sort((a, b) => a.timestamp - b.timestamp).forEach(kill => {
                let added = false;
                for (let clash of clashes) {
                    if (kill.timestamp - clash[clash.length - 1].timestamp < 25000) {
                        clash.push(kill);
                        added = true;
                        break;
                    }
                }
                if (!added) clashes.push([kill]);
            });

            clashes.forEach(clash => {
                const teamKillsCount = clash.filter(k => teamIds.includes(k.killerId)).length;
                const enemyKillsCount = clash.filter(k => enemyIds.includes(k.killerId)).length;
                const teamMembersInvolved = new Set();
                clash.forEach(k => {
                    if (teamIds.includes(k.killerId)) teamMembersInvolved.add(k.killerId);
                    if (k.assistingParticipantIds) {
                        k.assistingParticipantIds.forEach(id => {
                            if (teamIds.includes(id)) teamMembersInvolved.add(id);
                        });
                    }
                    if (teamIds.includes(k.victimId)) teamMembersInvolved.add(k.victimId);
                });
                const isTeamfight = teamMembersInvolved.size >= 3;

                if (isTeamfight) {
                    teamTotalTeamfights++;
                    const playerParticipated = clash.some(k =>
                        k.killerId === pId || k.victimId === pId || (k.assistingParticipantIds && k.assistingParticipantIds.includes(pId))
                    );

                    if (playerParticipated) {
                        teamfights++;
                        if (teamKillsCount > enemyKillsCount) {
                            teamfightsWon++;
                        }
                    }
                }
            });
            allKills.forEach(event => {
                const victimPos = event.position;
                let alliesNearby = false;
                if (victimPos) {
                    const frameIdx = Math.floor(event.timestamp / 60000);
                    const frame = match.timeline.info.frames[frameIdx];
                    if (frame && frame.participantFrames) {
                        teamIds.forEach(allyId => {
                            if (allyId !== pId) {
                                const allyFrame = frame.participantFrames[allyId];
                                if (allyFrame && allyFrame.position) {
                                    const distSq = Math.pow(allyFrame.position.x - victimPos.x, 2) + Math.pow(allyFrame.position.y - victimPos.y, 2);
                                    if (distSq < 4000000) alliesNearby = true;
                                }
                            }
                        });
                    }
                }

                if (event.victimId === pId) {
                    const isExecution = !event.killerId || event.killerId === 0;
                    if (!isExecution) {
                        const noEnemyAssists = !event.assistingParticipantIds || event.assistingParticipantIds.length === 0;
                        if (noEnemyAssists || !alliesNearby) soloDeaths++;
                        if (noEnemyAssists && !alliesNearby) pureDuelDeaths++;
                    }
                }
                if (event.killerId === pId) {
                    const noEnemyAssists = !event.assistingParticipantIds || event.assistingParticipantIds.length === 0;
                    if (noEnemyAssists && !alliesNearby) pureDuelKills++;
                    if (noEnemyAssists) duels++;
                }
            });
        }

        return { soloDeaths, duels, pureDuelKills, pureDuelDeaths, teamfights, teamfightsWon, teamTotalTeamfights };
    };

    const getItemHistory = (puuid) => {
        const pId = match.players.find(p => p.puuid === puuid)?.participantId;
        if (!pId || !match.timeline) return [];

        let eventsList = [];
        match.timeline.info.frames.forEach(frame => {
            frame.events.forEach(event => {
                if (event.participantId === pId && (event.type === "ITEM_PURCHASED" || event.type === "ITEM_UNDO")) {
                    const time = Math.floor(event.timestamp / 1000);
                    if (event.type === "ITEM_PURCHASED") {
                        eventsList.push({ time, itemId: event.itemId });
                    } else if (event.type === "ITEM_UNDO") {
                        eventsList.pop();
                    }
                }
            });
        });

        const groupedArray = [];
        eventsList.forEach(e => {
            if (groupedArray.length === 0) {
                groupedArray.push({ timestamp: e.time, items: [e.itemId] });
            } else {
                const lastGroup = groupedArray[groupedArray.length - 1];
                if (e.time - lastGroup.timestamp <= 10) {
                    lastGroup.items.push(e.itemId);
                } else {
                    groupedArray.push({ timestamp: e.time, items: [e.itemId] });
                }
            }
        });

        return groupedArray;
    };

    const CircularStat = ({ value, label, color = "var(--color-primary)", isRaw = false, size = 80 }) => {
        const radius = 35;
        const circumference = 2 * Math.PI * radius;
        const numericValue = parseFloat(value) || 0;
        const percentage = Math.min(Math.max(numericValue, 0), 100);
        const offset = isRaw ? circumference : circumference - (circumference * percentage / 100);

        return (
            <div className="md-circular-stat">
                <svg width={size} height={size} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="md-circular-bg" strokeWidth="8" fill="none" />
                    <circle
                        cx="50" cy="50" r={radius}
                        className="md-circular-fill"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                    />
                    <text x="50" y="50" className="md-circular-text" style={{ fontSize: size > 70 ? "1.2rem" : "1.4rem" }}>{value}</text>
                </svg>
                <div className="md-circular-label">{label}</div>
            </div>
        );
    };

    const adv = calculateAdvancedStats(activePlayer);
    const itemHistory = getItemHistory(selectedPuuid);

    const teamKills = (activePlayer.teamId === 100 ? blueTeam : redTeam).reduce((sum, p) => sum + p.kills, 0);
    const kpPct = teamKills > 0 ? (((activePlayer.kills + activePlayer.assists) / teamKills) * 100).toFixed(1) + "%" : "0.0%";
    const tfPartPct = adv.teamTotalTeamfights > 0
        ? ((adv.teamfights / adv.teamTotalTeamfights) * 100).toFixed(1) + "%"
        : "0.0%";

    const tfWinratePct = adv.teamfights > 0
        ? ((adv.teamfightsWon / adv.teamfights) * 100).toFixed(1) + "%"
        : "0.0%";

    const soloWinrateVal = (adv.pureDuelKills + adv.pureDuelDeaths) > 0
        ? ((adv.pureDuelKills / (adv.pureDuelKills + adv.pureDuelDeaths)) * 100).toFixed(1) + "%"
        : "0.0%";

    const damagePct = activePlayer.challenges?.teamDamagePercentage
        ? (activePlayer.challenges.teamDamagePercentage * 100).toFixed(1) + "%"
        : "0.0%";

    const soloDeathsPct = activePlayer.deaths > 0
        ? ((adv.soloDeaths / activePlayer.deaths) * 100).toFixed(1) + "%"
        : "0.0%";

    const blueObjectives = match.teams?.["100"] || {};
    const redObjectives = match.teams?.["200"] || {};

    const GoldAdvantageGraph = () => {
        if (!match.timeline) return null;

        const [hoverIdx, setHoverIdx] = useState(null);

        const frames = match.timeline.info.frames;
        const data = frames.map(f => {
            let blueGold = 0, redGold = 0;
            Object.values(f.participantFrames).forEach(pf => {
                if (pf.participantId <= 5) blueGold += pf.totalGold;
                else redGold += pf.totalGold;
            });
            return { blueGold, redGold, adv: blueGold - redGold };
        });

        const advs = data.map(d => d.adv);
        const maxAbsAdv = Math.max(...advs.map(Math.abs), 1000);
        const yMax = Math.ceil(maxAbsAdv / 1000) * 1000;
        const yMin = -yMax;
        const totalRange = yMax - yMin;

        const chartW = 600;
        const chartH = 220;
        const paddingLeft = 55;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 40;

        const width = chartW + paddingLeft + paddingRight;
        const height = chartH + paddingTop + paddingBottom;

        const getY = (val) => paddingTop + chartH - ((val - yMin) / totalRange) * chartH;
        const getX = (i) => paddingLeft + (i / (data.length - 1)) * chartW;
        const yZero = getY(0);

        const toMMSS = (min) => {
            const m = Math.floor(min);
            return `${m}:00`;
        };

        const points = data.map((d, i) => `${getX(i)},${getY(d.adv)}`).join(" ");
        const posPoints = data.map((d, i) => {
            const x = getX(i);
            const y = Math.min(getY(d.adv), yZero);
            return `${x},${y}`;
        }).join(" ");
        const posPolygon = `${paddingLeft},${yZero} ${posPoints} ${getX(data.length - 1)},${yZero}`;
        const negPoints = data.map((d, i) => {
            const x = getX(i);
            const y = Math.max(getY(d.adv), yZero);
            return `${x},${y}`;
        }).join(" ");
        const negPolygon = `${paddingLeft},${yZero} ${negPoints} ${getX(data.length - 1)},${yZero}`;
        const yTicks = [];
        const step = yMax / 3;
        for (let v = yMin; v <= yMax; v += step) {
            yTicks.push(Math.round(v));
        }

        return (
            <div className="md-gold-graph glass-panel" style={{ position: "relative" }}>
                <h3 style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem", fontWeight: "400", textAlign: "center" }}>Team Gold Advantage</h3>
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
                    style={{ cursor: "crosshair" }}
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * width;
                        if (x >= paddingLeft && x <= paddingLeft + chartW) {
                            const idx = Math.max(0, Math.min(Math.round(((x - paddingLeft) / chartW) * (data.length - 1)), data.length - 1));
                            setHoverIdx(idx);
                        }
                    }}
                    onMouseLeave={() => setHoverIdx(null)}
                >
                    {yTicks.map((val, i) => {
                        const y = getY(val);
                        const label = val === 0 ? "0" : val >= 1000 ? `${val / 1000}k` : val <= -1000 ? `${val / 1000}k` : val;
                        return (
                            <g key={i}>
                                <line x1={paddingLeft} y1={y} x2={paddingLeft + chartW} y2={y} stroke="rgba(255,255,255,0.06)" />
                                <text x={paddingLeft - 6} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="10">{label}</text>
                            </g>
                        );
                    })}
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((step, i) => {
                        const x = paddingLeft + step * chartW;
                        const minIdx = Math.round(step * (data.length - 1));
                        return (
                            <g key={i}>
                                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartH} stroke="rgba(255,255,255,0.04)" />
                                <text x={x} y={paddingTop + chartH + 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">{toMMSS(minIdx)}</text>
                            </g>
                        );
                    })}
                    <line x1={paddingLeft} y1={yZero} x2={paddingLeft + chartW} y2={yZero} stroke="rgba(255,255,255,0.25)" />
                    <polygon points={posPolygon} fill="#3b82f6" fillOpacity="0.25" />
                    <polygon points={negPolygon} fill="#ef4444" fillOpacity="0.3" />
                    <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2" />
                    {data.map((d, i) => (
                        <circle key={i}
                            cx={getX(i)} cy={getY(d.adv)} r="3"
                            fill={d.adv >= 0 ? "#3b82f6" : "#ef4444"}
                            stroke="rgba(0,0,0,0.5)" strokeWidth="1"
                        />
                    ))}
                    {hoverIdx !== null && (() => {
                        const d = data[hoverIdx];
                        const val = d.adv;
                        const x = getX(hoverIdx);
                        const y = getY(val);
                        const aheadTeam = val > 0 ? "Blue" : val < 0 ? "Red" : null;
                        const aheadColor = val > 0 ? "#3b82f6" : "#ef4444";
                        const aheadAmt = Math.abs(val).toLocaleString();
                        const tooltipText = aheadTeam ? `${aheadTeam} ahead by ${aheadAmt}` : "Teams tied";
                        const tooltipW = 170;
                        const tooltipX = Math.min(Math.max(x - tooltipW / 2, paddingLeft), paddingLeft + chartW - tooltipW);

                        return (
                            <g>
                                <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartH} stroke="rgba(255,255,255,0.3)" />
                                <circle cx={x} cy={y} r="6" fill={val >= 0 ? "#3b82f6" : "#ef4444"} stroke="#fff" strokeWidth="2" />

                                <rect x={tooltipX} y={y - 54} width={tooltipW} height="42" rx="5"
                                    fill="rgba(10,10,20,0.9)" stroke={aheadColor} strokeWidth="1" />
                                <text x={tooltipX + tooltipW / 2} y={y - 35} textAnchor="middle" fill={aheadColor} fontSize="12" fontWeight="bold">
                                    {tooltipText}
                                </text>
                                <text x={tooltipX + tooltipW / 2} y={y - 19} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10">
                                    at {toMMSS(hoverIdx)}
                                </text>
                            </g>
                        );
                    })()}
                </svg>
            </div>
        );
    };


    const ComparisonRow = ({ label, val1, val2, max }) => {
        const pct1 = (val1 / max) * 100;
        const pct2 = (val2 / max) * 100;
        return (
            <div className="md-comp-row">
                <div className="md-comp-labels">
                    <span className="md-comp-val">{val1.toLocaleString()}</span>
                    <span className="md-comp-label">{label}</span>
                    <span className="md-comp-val">{val2.toLocaleString()}</span>
                </div>
                <div className="md-comp-bars">
                    <div className="md-comp-bar-bg left">
                        <div className="md-comp-bar-fill blue" style={{ width: `${pct1}%` }} />
                    </div>
                    <div className="md-comp-bar-bg right">
                        <div className="md-comp-bar-fill red" style={{ width: `${pct2}%` }} />
                    </div>
                </div>
            </div>
        );
    };

    const TrendGraph = ({ p1, p2, type, label }) => {
        if (!match.timeline) return null;
        const [hoverX, setHoverX] = useState(null);
        const [hoverY, setHoverY] = useState(null);

        const getTrendData = (puuid, type) => {
            const pId = match.players.find(p => p.puuid === puuid)?.participantId;
            if (!pId) return [];
            let cumKills = 0, cumAssists = 0, cumDeaths = 0, cumWards = 0;
            return match.timeline.info.frames.map(frame => {
                if (type === "gold") return { val: frame.participantFrames[pId]?.totalGold || 0 };
                if (type === "cs") {
                    const pf = frame.participantFrames[pId];
                    frame.events.forEach(e => {
                        if (e.type === "WARD_KILL" && e.killerId === pId) cumWards++;
                    });
                    return { val: (pf?.minionsKilled || 0) + (pf?.jungleMinionsKilled || 0) + cumWards };
                }
                if (type === "damage_dealt") {
                    const pf = frame.participantFrames[pId];
                    return { val: pf?.damageStats?.totalDamageDoneToChampions || 0 };
                }
                if (type === "damage_taken") {
                    const pf = frame.participantFrames[pId];
                    return { val: pf?.damageStats?.totalDamageTaken || 0 };
                }
                let frameKill = false, frameAssist = false;
                frame.events.forEach(e => {
                    if (type === "kda" && e.type === "CHAMPION_KILL") {
                        if (e.killerId === pId) { cumKills++; frameKill = true; }
                        else if (e.assistingParticipantIds?.includes(pId)) { cumAssists++; frameAssist = true; }
                    }
                    if (type === "deaths" && e.type === "CHAMPION_KILL" && e.victimId === pId) cumDeaths++;
                });
                if (type === "kda") return { val: cumKills + cumAssists, kills: cumKills, assists: cumAssists, frameKill, frameAssist };
                return { val: cumDeaths };
            });
        };

        const raw1 = getTrendData(p1.puuid, type);
        const raw2 = getTrendData(p2.puuid, type);
        const data1 = raw1.map(d => d.val);
        const data2 = raw2.map(d => d.val);

        const max = Math.max(...data1, ...data2, 1);
        const yMax = Math.ceil(max / 5) * 5 || 1;

        const width = 420;
        const height = 180;
        const paddingLeft = 30;
        const paddingBottom = 25;
        const paddingTop = 20;
        const chartW = width - paddingLeft;
        const chartH = height - paddingBottom - paddingTop;

        const getPoints = (data) => data.map((v, i) => {
            const x = (i / (data.length - 1)) * chartW + paddingLeft;
            const y = paddingTop + chartH - (v / yMax) * chartH;
            return `${x},${y}`;
        }).join(" ");

        return (
            <div className="md-trend-box glass-panel">
                <div className="md-trend-header">
                    <h4>{label}</h4>
                    <div className="md-trend-legend-ref">
                        <div className="legend-item"><span className="square blue"></span> {p1.championName}</div>
                        <div className="legend-item"><span className="square red"></span> {p2.championName}</div>
                    </div>
                </div>
                <div className="md-trend-svg-container">
                    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * width;
                            const y = ((e.clientY - rect.top) / rect.height) * height;
                            if (x >= paddingLeft) {
                                setHoverX(x);
                                setHoverY(y);
                            }
                        }}
                        onMouseLeave={() => {
                            setHoverX(null);
                            setHoverY(null);
                        }}
                    >
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="var(--defeat)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--defeat)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <g className="chart-grid">
                            {[0, 0.25, 0.5, 0.75, 1].map((step, i) => {
                                const y = paddingTop + chartH * (1 - step);
                                return (
                                    <React.Fragment key={i}>
                                        <line x1={paddingLeft} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" />
                                        <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="chart-axis-label">{Math.floor(yMax * step)}</text>
                                    </React.Fragment>
                                );
                            })}
                            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((step, i) => {
                                const x = paddingLeft + step * chartW;
                                const time = Math.floor((step * match.gameDuration) / 60);
                                return (
                                    <React.Fragment key={i}>
                                        <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartH} stroke="rgba(255,255,255,0.05)" />
                                        <text x={x} y={height - 5} textAnchor="middle" className="chart-axis-label">{time}</text>
                                    </React.Fragment>
                                );
                            })}
                        </g>

                        <polygon points={`${paddingLeft},${paddingTop + chartH} ${getPoints(data2)} ${width},${paddingTop + chartH}`} fill="url(#grad2)" />
                        <polyline points={getPoints(data2)} fill="none" stroke="var(--defeat)" strokeWidth="2.5" />

                        <polygon points={`${paddingLeft},${paddingTop + chartH} ${getPoints(data1)} ${width},${paddingTop + chartH}`} fill="url(#grad1)" />
                        <polyline points={getPoints(data1)} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />

                        {hoverX && (
                            <g>
                                {(() => {
                                    const idx = Math.max(0, Math.min(Math.floor(((hoverX - paddingLeft) / chartW) * data1.length), data1.length - 1));
                                    const val1 = data1[idx];
                                    const val2 = data2[idx];
                                    const cy1 = paddingTop + chartH - (val1 / yMax) * chartH;
                                    const cy2 = paddingTop + chartH - (val2 / yMax) * chartH;

                                    const dist1 = Math.abs(cy1 - hoverY);
                                    const dist2 = Math.abs(cy2 - hoverY);

                                    const showBlue = dist1 <= dist2;
                                    const showRed = dist2 < dist1;

                                    const getLabel = (rawData, idx, val) => {
                                        if (type !== "kda") return val;
                                        const d = rawData[idx];
                                        if (!d) return val;
                                        const parts = [];
                                        if (d.kills > 0) parts.push(`${d.kills}K`);
                                        if (d.assists > 0) parts.push(`${d.assists}A`);
                                        return parts.length > 0 ? parts.join(' / ') : '0';
                                    };

                                    return (
                                        <g>
                                            {showRed && (() => {
                                                const tipW = 60, tipH = 22;
                                                const tipX = Math.min(Math.max(hoverX - tipW / 2, paddingLeft), paddingLeft + chartW - tipW);
                                                const above = cy2 - 42 < paddingTop;
                                                const tipY = above ? cy2 + 10 : cy2 - tipH - 10;
                                                return (
                                                    <>
                                                        <circle cx={hoverX} cy={cy2} r="5" fill="var(--defeat)" stroke="#fff" strokeWidth="2" />
                                                        <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="4" fill="#222" stroke="var(--defeat)" />
                                                        <text x={tipX + tipW / 2} y={tipY + tipH - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
                                                            {getLabel(raw2, idx, val2)}
                                                        </text>
                                                    </>
                                                );
                                            })()}

                                            {showBlue && (() => {
                                                const tipW = 60, tipH = 22;
                                                const tipX = Math.min(Math.max(hoverX - tipW / 2, paddingLeft), paddingLeft + chartW - tipW);
                                                const above = cy1 - 42 < paddingTop;
                                                const tipY = above ? cy1 + 10 : cy1 - tipH - 10;
                                                return (
                                                    <>
                                                        <circle cx={hoverX} cy={cy1} r="5" fill="var(--color-primary)" stroke="#fff" strokeWidth="2" />
                                                        <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="4" fill="#222" stroke="var(--color-primary)" />
                                                        <text x={tipX + tipW / 2} y={tipY + tipH - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
                                                            {getLabel(raw1, idx, val1)}
                                                        </text>
                                                    </>
                                                );
                                            })()}
                                            <text x={hoverX} y={paddingTop + chartH + 15} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontWeight="bold">
                                                {idx}m
                                            </text>
                                        </g>
                                    );
                                })()}
                            </g>
                        )}
                        <text x={paddingLeft + chartW / 2} y={height - 2} textAnchor="middle" className="chart-axis-label" style={{ fill: 'rgba(255,255,255,0.3)' }}>Time (min)</text>
                    </svg>
                </div>
            </div>
        );
    };

    const ComparisonDashboard = () => {
        const p1 = match.players.find(p => p.puuid === compBlue) || blueTeam[0];
        const p2 = match.players.find(p => p.puuid === compRed) || redTeam[0];
        if (!p1 || !p2) return null;

        const renderCharts = () => {
            if (activeTab === "fighting") {
                return (
                    <>
                        <TrendGraph p1={p1} p2={p2} type="kda" label="Kills + Assists" />
                        <TrendGraph p1={p1} p2={p2} type="deaths" label="Deaths" />
                        <TrendGraph p1={p1} p2={p2} type="damage_dealt" label="Damage Dealt" />
                        <TrendGraph p1={p1} p2={p2} type="damage_taken" label="Damage Taken" />
                    </>
                );
            }
            const type = activeTab === "farming" ? "cs" : "gold";
            const label = activeTab === "farming" ? "CS" : "Gold";
            return <TrendGraph p1={p1} p2={p2} type={type} label={label} />;
        };

        return (
            <div className="md-comparison-dashboard">
                <div className="md-comp-top-row">
                    <div className="md-comp-player left">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p1.championId]}.png`} />
                        <span>{p1.championName}</span>
                    </div>
                    <div className="md-comp-vs-minimal">VS</div>
                    <div className="md-comp-player right">
                        <img src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p2.championId]}.png`} />
                        <span>{p2.championName}</span>
                    </div>
                </div>

                <div className="md-comp-selector-row">
                    <div className="md-comp-selector">
                        <div className="md-comp-team blue">
                            {match.players.filter(p => p.teamId === 100).map(p => (
                                <img
                                    key={p.puuid}
                                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p.championId] || p.championName}.png`}
                                    className={`md-comp-icon ${compBlue === p.puuid ? "active" : ""}`}
                                    title={p.championName}
                                    onClick={() => setCompBlue(p.puuid)}
                                />
                            ))}
                        </div>
                        <div className="md-vs-label">VS</div>
                        <div className="md-comp-team red">
                            {match.players.filter(p => p.teamId === 200).map(p => (
                                <img
                                    key={p.puuid}
                                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p.championId] || p.championName}.png`}
                                    className={`md-comp-icon ${compRed === p.puuid ? "active" : ""}`}
                                    title={p.championName}
                                    onClick={() => setCompRed(p.puuid)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {renderCharts()}

                <div className="md-comp-metrics">
                    {activeTab === "farming" && (
                        <>
                            <ComparisonRow label="Gold Earned" val1={p1.goldEarned} val2={p2.goldEarned} max={Math.max(p1.goldEarned, p2.goldEarned, 1)} />
                            <ComparisonRow label="Neutral CS" val1={p1.neutralMinionsKilled || 0} val2={p2.neutralMinionsKilled || 0} max={Math.max(p1.neutralMinionsKilled || 0, p2.neutralMinionsKilled || 0, 1)} />
                        </>
                    )}
                </div>
            </div>
        );
    };

    const DamageChart = ({ players }) => {
        const chartHeight = 150;
        const barWidth = 24;
        const gap = 8;
        const paddingLeft = 85;
        const paddingRight = 15;
        const paddingBottom = 40;
        const paddingTop = 20;
        const scaleMax = 100000;
        const chartWidth = (barWidth + gap) * 10;

        return (
            <div className="md-damage-chart-container glass-panel">
                <h3>Damage Dealt</h3>
                <svg width="100%" height={chartHeight + paddingTop + paddingBottom} viewBox={`0 0 ${chartWidth + paddingLeft + paddingRight + 80} ${chartHeight + paddingTop + paddingBottom}`}>
                    {[0, 0.2, 0.4, 0.6, 0.8, 1].map((step, i) => {
                        const val = Math.round(scaleMax * step);
                        const y = paddingTop + chartHeight * (1 - step);
                        return (
                            <g key={i}>
                                <text x={paddingLeft - 10} y={y + 4} className="chart-label-y" textAnchor="end">
                                    {val.toLocaleString()}
                                </text>
                                <line
                                    x1={paddingLeft} y1={y}
                                    x2={chartWidth + paddingLeft + 40} y2={y}
                                    className="chart-grid-line"
                                />
                            </g>
                        );
                    })}

                    {players.map((p, i) => {
                        const h = Math.min((p.totalDamageDealtToChampions / scaleMax) * chartHeight, chartHeight);
                        const x = paddingLeft + 20 + i * (barWidth + gap);
                        const isHovered = hoveredBar === p.puuid;

                        return (
                            <g key={p.puuid}
                                onMouseEnter={() => setHoveredBar(p.puuid)}
                                onMouseLeave={() => setHoveredBar(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                <rect
                                    x={x} y={paddingTop + chartHeight - h}
                                    width={barWidth} height={h}
                                    className={`chart-bar ${p.teamId === 100 ? "blue" : "red"}`}
                                    rx="4"
                                />
                                {isHovered && (
                                    <g>
                                        <rect
                                            x={x - 15} y={paddingTop + chartHeight - h - 30}
                                            width="70" height="22" rx="4"
                                            fill="rgba(0,0,0,0.9)"
                                            stroke="rgba(255,255,255,0.2)"
                                        />
                                        <text
                                            x={x + barWidth / 2} y={paddingTop + chartHeight - h - 14}
                                            className="chart-hover-val" textAnchor="middle" style={{ fontSize: '11px', fontWeight: 'bold', fill: '#fff' }}
                                        >
                                            {p.totalDamageDealtToChampions.toLocaleString()}
                                        </text>
                                    </g>
                                )}
                                <image
                                    x={x + 2} y={paddingTop + chartHeight + 8}
                                    width={barWidth - 4} height={barWidth - 4}
                                    href={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p.championId] || p.championName}.png`}
                                    style={{ borderRadius: '4px' }}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    const renderStatCard = (title, icon, items) => (
        <div className="md-stat-card glass-panel" key={title}>
            <h3>{icon} {title}</h3>
            {items.map(item => (
                <div className="md-stat-item" key={item.label}>
                    <span className="md-stat-label">{item.label}</span>
                    <span className="md-stat-value">{item.value.toLocaleString()}</span>
                </div>
            ))}
        </div>
    );

    const renderTeamTable = (team, side) => (
        <div className={`mh-team ${side}`}>
            <div className="mh-team-header">
                <div className={`mh-team-dot ${side}`} />
                <h5 className={`mh-team-name ${side}`}>
                    {side.toUpperCase()} TEAM {team[0].win ? "(Victory)" : "(Defeat)"}
                </h5>
            </div>
            <div className="mh-players">
                {team.map(p => {
                    const maxDmg = Math.max(...match.players.map(pl => pl.totalDamageDealtToChampions));
                    const dmgPct = (p.totalDamageDealtToChampions / maxDmg) * 100;

                    return (
                        <div
                            key={p.puuid}
                            className={`mh-player-row ${p.puuid === selectedPuuid ? "current" : ""}`}
                            onClick={() => setSelectedPuuid(p.puuid)}
                            style={{ cursor: 'pointer' }}
                        >
                            <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/champion/${ddragon.champIdToName?.[p.championId] || p.championName}.png`}
                                alt={p.championName}
                                className="mh-player-champ-icon"
                            />
                            <div className="md-player-spells-runes">
                                <div className="mh-player-spells">
                                    <img src={getSummonerSpellPath(p.summoner1Id)} className="mh-spell-icon" onMouseEnter={(e) => handleSpellEnter(p.summoner1Id, e)} onMouseLeave={() => setHoveredItem(null)} />
                                    <img src={getSummonerSpellPath(p.summoner2Id)} className="mh-spell-icon" onMouseEnter={(e) => handleSpellEnter(p.summoner2Id, e)} onMouseLeave={() => setHoveredItem(null)} />
                                </div>
                                {match.queueId === 1700 ? renderPlayerAugments(p) : renderPlayerRunes(p, side)}
                            </div>
                            <div className="mh-player-main-info">
                                <div className="mh-player-name-wrapper">
                                    <span className="mh-player-name">
                                        {p.riotId.split('#')[0]}
                                    </span>
                                </div>
                                <div className="mh-player-kda-text">
                                    {p.kills}/{p.deaths}/{p.assists}
                                </div>
                            </div>
                            <div className="mh-player-vision">
                                <div className="vs-label">Vision</div>
                                <div className="vs-value">{p.visionScore}</div>
                            </div>
                            <div className="mh-player-stats-mini">
                                <div className="mh-stat-dmg">
                                    <div className="dmg-val">{p.totalDamageDealtToChampions.toLocaleString()}</div>
                                    <div className="dmg-bar-bg">
                                        <div className={`dmg-bar-fill ${side}`} style={{ width: `${dmgPct}%` }} />
                                    </div>
                                </div>
                                <div className="mh-stat-gold">
                                    Gold: {p.goldEarned.toLocaleString()}
                                </div>
                            </div>
                            <div className="mh-player-items-mini">
                                {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id, i) => (
                                    id > 0 ? (
                                        <img
                                            key={i}
                                            src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/item/${id}.png`}
                                            className="mh-item-icon-tiny"
                                            onMouseEnter={(e) => handleItemEnter(id, e)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                        />
                                    ) : (
                                        <div key={i} className="mh-item-empty-tiny" />
                                    )
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (!match) return null;

    return (
        <div className="match-details-page">
            <button onClick={() => navigate(-1)} className="md-back-btn">
                <ChevronLeft size={18} />
                Back to History
            </button>

            <div className="md-unified-teams-box glass-panel">
                <div style={{ textAlign: "center", marginBottom: "1rem", color: "var(--color-muted-foreground)", fontWeight: "600", fontSize: "0.9rem", letterSpacing: "0.05em" }}>
                    MATCH DURATION: {Math.floor(match.gameDuration / 60)}:{(match.gameDuration % 60).toString().padStart(2, '0')}
                </div>
                <div className="mh-teams-grid">
                    {renderTeamTable(blueTeam, "blue")}
                    {renderTeamTable(redTeam, "red")}
                </div>
            </div>

            <div className="md-main-content">
                <div className="md-left-col">
                    <GoldAdvantageGraph />

                    <div className="md-tabs-container glass-panel">
                        <div className="md-tabs">
                            {["fighting", "farming", "objectives", "vision"].map(tab => (
                                <button
                                    key={tab}
                                    className={`md-tab ${activeTab === tab ? "active" : ""}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="md-tab-content">
                            {activeTab === "fighting" && (
                                <div className="md-fighting-stats">
                                    <div className="md-circles-row">
                                        <CircularStat value={tfWinratePct} label="Teamfights Winrate" color="var(--victory)" />
                                        <CircularStat value={soloWinrateVal} label="Duel Winrate (1v1)" color={parseFloat(soloWinrateVal) >= 50 ? "var(--victory)" : "var(--defeat)"} />
                                        <CircularStat value={tfPartPct} label="Teamfights Participation" color="var(--color-primary)" />
                                    </div>
                                    <div className="md-circles-row">
                                        <CircularStat value={soloDeathsPct} label="Solo Deaths %" color="var(--defeat)" />
                                        <CircularStat value={adv.duels} label="Solo Kills" isRaw />
                                        <CircularStat value={damagePct} label="Damage Share" />
                                    </div>
                                </div>
                            )}

                            {activeTab === "farming" && (
                                <div className="md-farming-stats">
                                    <div className="md-circles-row">
                                        <CircularStat value={activePlayer.totalMinionsKilled + (activePlayer.jungleMinionsKilled || 0)} label="Total CS" isRaw />
                                        <CircularStat value={activePlayer.goldEarned} label="Gold Earned" isRaw />
                                        <CircularStat value={((activePlayer.totalMinionsKilled + (activePlayer.jungleMinionsKilled || 0)) / (match.gameDuration / 60)).toFixed(1)} label="CS/Min" isRaw />
                                    </div>
                                </div>
                            )}

                            {activeTab === "objectives" && (
                                <div className="md-objectives-stats">
                                    <div className="md-team-objectives-comparison">
                                        <div className="md-team-col blue">
                                            <h4>Blue Team</h4>
                                            <div className="md-circles-row smaller">
                                                <CircularStat value={blueObjectives.dragon || 0} label="Dragons" isRaw size={70} />
                                                <CircularStat value={blueObjectives.baron || 0} label="Barons" isRaw size={70} />
                                                <CircularStat value={blueObjectives.voidGrubs || 0} label="Void Grubs" isRaw size={70} />
                                                <CircularStat value={blueObjectives.riftHerald || 0} label="Rift Heralds" isRaw size={70} />
                                            </div>
                                        </div>
                                        <div className="md-team-col red">
                                            <h4>Red Team</h4>
                                            <div className="md-circles-row smaller">
                                                <CircularStat value={redObjectives.dragon || 0} label="Dragons" isRaw size={70} />
                                                <CircularStat value={redObjectives.baron || 0} label="Barons" isRaw size={70} />
                                                <CircularStat value={redObjectives.voidGrubs || 0} label="Void Grubs" isRaw size={70} />
                                                <CircularStat value={redObjectives.riftHerald || 0} label="Rift Heralds" isRaw size={70} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "vision" && (
                                <div className="md-vision-stats">
                                    <div className="md-circles-row">
                                        <CircularStat value={activePlayer.visionScore} label="Vision Score" isRaw />
                                        <CircularStat value={activePlayer.challenges?.controlWardsPlaced || 0} label="Control Wards Placed" isRaw />
                                        <CircularStat value={activePlayer.challenges?.controlWardsDestroyed || 0} label="Control Wards Destroyed" isRaw />
                                    </div>
                                    <div className="md-circles-row">
                                        <CircularStat value={activePlayer.wardsPlaced} label="Wards Placed" isRaw />
                                        <CircularStat value={activePlayer.wardsKilled} label="Wards Destroyed" isRaw />
                                    </div>
                                </div>
                            )}
                            {(activeTab === "fighting" || activeTab === "farming") && <ComparisonDashboard />}
                        </div>
                    </div>
                </div>

                <div className="md-right-col">
                    <div className="md-player-summary glass-panel">
                        <div className="md-tags">
                            {activePlayer.totalDamageDealtToChampions > match.players.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0) / 10 && (
                                <span className="md-tag high-dmg">High Damage {activePlayer.championName}</span>
                            )}
                            {activePlayer.visionWardsBoughtInGame === 0 && <span className="md-tag warning">No Control Wards</span>}
                            {adv.soloDeaths > 2 && <span className="md-tag warning">Bad duelist</span>}
                        </div>
                        <div className="md-kda-summary">
                            <span className="md-kda-val win">{activePlayer.kills}</span> /
                            <span className="md-kda-val loss">{activePlayer.deaths}</span> /
                            <span className="md-kda-val">{activePlayer.assists}</span>
                        </div>
                        <div className="md-sub-stats">
                            {activePlayer.totalMinionsKilled + (activePlayer.neutralMinionsKilled || 0) + (activePlayer.wardsKilled || 0)} CS • {activePlayer.goldEarned.toLocaleString()} Gold
                        </div>
                    </div>

                    <DamageChart players={match.players} />

                    <div className="md-items-timeline glass-panel">
                        <h3>Item History</h3>
                        <div className="md-timeline-vertical">
                            {itemHistory.map((group, i) => (
                                <div key={i} className="md-timeline-row">
                                    <div className="md-time-badge">{formatTime(group.timestamp)}</div>
                                    <div className="md-time-items">
                                        {group.items.map((id, idx) => (
                                            <div key={idx} className="md-item-slot">
                                                <img
                                                    src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.latestVersion}/img/item/${id}.png`}
                                                    className="md-timeline-icon"
                                                    onMouseEnter={(e) => handleItemEnter(id, e)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {hoveredItem && (
                <ItemTooltip
                    item={hoveredItem}
                    position={tooltipPos}
                    version={latestVersion}
                />
            )}
        </div>
    );
}
