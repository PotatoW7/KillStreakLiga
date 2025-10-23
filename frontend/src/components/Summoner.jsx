import React, { useState } from "react";
import RankedInfo from "./RankedInfo";
import ChampionMastery from "./ChampionMastery";
import MatchHistory from "./MatchHistory";
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

  const getSummonerInfo = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setMatches([]);

    const [gameName, tagLine] = riotId.split("#");
    if (!gameName || !tagLine || !region) {
      setError("Please enter Riot ID in format: Name#Tag and select a region.");
      setLoading(false);
      return;
    }

    try {
      const { latestVersion, champIdToName, champNameToId } = await fetchDDragon();
      setVersion(latestVersion);
      setChampIdToName(champIdToName);
      setChampNameToId(champNameToId);

      const summonerRes = await fetch(`/summoner-info/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      if (!summonerRes.ok) throw new Error("Summoner not found or API error.");
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

  return (
    <div>
      <h2>Summoner Lookup</h2>
      <input
        type="text"
        placeholder="Riot ID (e.g. ZedZaKmet#ZED)"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
      />
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="euw1">EUW</option>
        <option value="na1">NA</option>
        <option value="kr">KR</option>
        <option value="eun1">EUNE</option>
        <option value="jp1">JP</option>
      </select>
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="all">All</option>
        <option value="solo_duo">Ranked Solo/Duo</option>
        <option value="ranked_flex">Ranked Flex</option>
        <option value="draft">Draft Pick</option>
        <option value="aram">ARAM</option>
        <option value="swiftplay">Swiftplay</option>
        <option value="arena">Arena</option>
      </select>
      <button onClick={getSummonerInfo}>Search</button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <div className="summoner-card">
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${data.profileIconId}.png`}
              alt="Summoner Icon"
              className="summoner-icon"
            />
            <div className="summoner-info">
              <h3>{data.name}</h3>
              <p>Level {data.summonerLevel}</p>
              <RankedInfo
                rankedSolo={data.ranked?.find(q => q.queueType === "RANKED_SOLO_5x5")}
                rankedFlex={data.ranked?.find(q => q.queueType === "RANKED_FLEX_SR")}
              />
            </div>
          </div>

          <ChampionMastery
            masteryData={data.mastery}
            champIdToName={champIdToName}
            winrateMap={{}} // optional: pass winrateMap if you want to reuse it
            version={version}
          />

          <MatchHistory
            matches={matches}
            champNameToId={champNameToId}
            version={version}
            puuid={data.puuid}
          />
        </div>
      )}
    </div>
  );
}

export default Summoner;
