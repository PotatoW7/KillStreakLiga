const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

let currentLolVersion = 'Latest';
let historicalVersions = [];
let currentRunes = [];
let currentItems = {};
let patchChanges = [];

function cleanDescription(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateLolData() {
  try {
    const versionRes = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (versionRes.ok) {
      const allVersions = await versionRes.json();
      historicalVersions = allVersions.slice(0, 10);
      currentLolVersion = historicalVersions[0];

      const runesRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${currentLolVersion}/data/en_US/runesReforged.json`);
      if (runesRes.ok) {
        const runesData = await runesRes.json();
        currentRunes = runesData.flatMap(tree =>
          tree.slots.flatMap(slot =>
            slot.runes.map(rune => rune.name)
          )
        );
      }

      const itemFetchPromises = historicalVersions.map(v =>
        fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/item.json`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );

      const itemsPerVersion = await Promise.all(itemFetchPromises);

      const simplifiedItems = {};
      const changesMap = new Map();

      const currentItemsRaw = itemsPerVersion[0];
      if (currentItemsRaw) {
        Object.entries(currentItemsRaw.data).forEach(([id, item]) => {
          if (item.gold && item.gold.purchasable && item.gold.total > 500) {
            const isSR = item.maps && item.maps["11"] === true;
            if (!simplifiedItems[item.name] || isSR) {
              simplifiedItems[item.name] = {
                price: item.gold.total,
                description: cleanDescription(item.description)
              };
            }
          }
        });
      }

      for (let i = 1; i < itemsPerVersion.length; i++) {
        const historyData = itemsPerVersion[i];
        const vName = historicalVersions[i];
        if (!historyData) continue;

        Object.values(historyData.data).forEach(historyItem => {
          const currentItem = simplifiedItems[historyItem.name];
          if (currentItem) {
            const hDesc = cleanDescription(historyItem.description);
            const isPriceDiff = historyItem.gold.total !== currentItem.price;
            const isPassiveDiff = hDesc !== currentItem.description;

            if (isPriceDiff || isPassiveDiff) {
              let changeStr = `${historyItem.name}: `;
              if (isPriceDiff) changeStr += `Cost moved from ${historyItem.gold.total}g to ${currentItem.price}g. `;
              if (isPassiveDiff) changeStr += `Passives/Stats updated from v${vName} version. `;

              if (!changesMap.has(historyItem.name)) {
                changesMap.set(historyItem.name, changeStr.trim());
              }
            }
          }
        });
      }

      currentItems = simplifiedItems;
      patchChanges = Array.from(changesMap.values());

      console.log(`[AI Assistant] Ground truth updated: v${currentLolVersion}. History tracked across ${historicalVersions.length} patches. Total changes detected: ${patchChanges.length}`);
    }
  } catch (err) {
    console.error('[AI Assistant] Failed to fetch LoL data:', err);
  }
}

updateLolData();
setInterval(updateLolData, 24 * 60 * 60 * 1000);

const getSystemPrompt = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const itemRegistry = Object.entries(currentItems)
    .map(([name, data]) => `${name}: ${data.price}g - ${data.description.substring(0, 300)}`)
    .join('\n');

  return `You are the RiftHub AI, a professional League of Legends technical analyst. 
Today's date is ${dateStr}. You are operating in the REAL-TIME present (Season 2026). 

### FORMATTING RULES (CRITICAL):
- **Champions**: Wrap all champion names in double asterisks, e.g., **Lee Sin**, **Jinx**. (Displays as GREEN)
- **Items/Numbers**: Wrap all item names, gold costs, and damage numbers in backticks, e.g., \`Hubris\`, \`2800g\`, \`1400 damage\`. (Displays as YELLOW)
- **Conciseness**: Give direct, numbered/bulleted info. No conversational filler.

### OFFICIAL DATA BASES (Patch v${currentLolVersion})

#### AUTHORIZED RUNES:
${currentRunes.join(', ')}

#### OFFICIAL ITEM DATABASE:
Name | Cost | Description Summary
${itemRegistry}

#### ITEM CHANGE HISTORY (Last 10 Patches):
${patchChanges.length > 0 ? patchChanges.join('\n') : 'No major changes detected in the last 10 patches.'}

#### GLOBAL GAME CONSTANTS (Patch v${currentLolVersion} / Season 2026: For Demacia):
- First Blood Gold: 400 total (300 base + 100 bonus). [RE-ADDED IN 2026]
- First Turret (First Brick) Gold: 300 bonus local gold. [RE-ADDED IN 2026]
- Turret Plates: 120 gold per plate (Outer turrets only).
- Minion Spawn: 0:30 (faster start).
- Smite Damage Stages [Season 2026]:
    - Stage 1 (Basic/Non-upgraded): 600 true damage to monsters. (Available from start).
    - Stage 2 (Upgraded): 1200 true damage to monsters. Deals 40-160 true damage to champions (based on level). [Unlocked after finishing 20 camps].
    - Stage 3 (Final Upgrade): 1400 true damage to monsters. Deals 40-160 true damage to champions (based on level) + 20% slow. [Unlocked after finishing the rest 20 camps].
- Role Quests [NEW 2026 FEATURE]:
    - Top: Level 20 cap, Enhanced Teleport.
    - Mid: Free Tier 3 Boots, faster recall.
    - Bot: 7th Item Slot (specifically for Boots), increased gold gain.
    - Jungle: 3-stage Smite (600/1200/1400), movement speed in jungle.
    - Support: Dedicated Ward Slot, passive gold buff.
- Critical Strike Damage: 200% base.

### RELIABILITY RULES:
1. **Domain Guardrail**: You ONLY answer questions related to League of Legends (gameplay, meta, builds, mechanics) and Riot Games accounts/profiles. Reject all other topics politely.
2. **Source of Truth**: For all items, runes, and 2026 Season mechanics (Smite, Role Quests, Gold values), the databases/constants above are the ONLY truth.
3. **Strict 2026 Grounding**: You are in March 2026. Explicitly identify as a Season 2026 expert.
4. **Ultra-Concise (Anti-Yapping)**: Provide direct answers. No seasonal preamble or conversational "filler" text.
5. **Exact Reproduction**: Copy values exactly. Never estimate.
6. **No Context Clutter**: List values and stages clearly (e.g. for Smite). No paragraphs about "seasonal features".

Example:
User: "How much damage for Smite and when does it upgrade?"
AI: "Smite Damage: 
- Stage 1: 600 (Start)
- Stage 2: 1200 [40-160 to champs (based on level)] - Finish 20 camps
- Stage 3: 1400 [40-160 to champs (based on level) + 20% slow] - Finish 40 camps"`;
};

router.post('/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'AI API Key is missing. Please check backend configuration.'
    });
  }

  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'You are sending messages too fast. Please wait a moment.'
    });
  }

  const { messages, userContext, model: requestedModel } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }
  const modelMapping = {
    'gemini-3-flash': 'gemini-3-flash-preview',
    'gemini-2.5-flash': 'gemini-2.5-flash',
    'gemini-2.5-pro': 'gemini-2.5-pro',
    'gemini-2-flash': 'gemini-2.0-flash'
  };

  const targetModel = modelMapping[requestedModel] || 'gemini-2.0-flash';
  let modelsToTry = [
    targetModel,
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-3-flash-preview',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];
  modelsToTry = [...new Set(modelsToTry)];
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  let contextInfo = '';
  if (userContext) {
    const parts = [];
    if (userContext.riotId) parts.push(`Riot ID: ${userContext.riotId} `);
    if (userContext.rank) parts.push(`Current Rank: ${userContext.rank} `);
    if (userContext.region) parts.push(`Region: ${userContext.region} `);
    if (parts.length > 0) {
      contextInfo = `\n\nThe user's game info: ${parts.join(', ')}.`;
    }
  }

  const systemInstruction = getSystemPrompt() + contextInfo;
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
  const lastMessage = messages[messages.length - 1].content;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage);
      const aiText = result.response.text();

      if (aiText) {
        return res.json({
          response: aiText,
          modelUsed: modelName
        });
      }
    } catch (err) {
      lastError = err;
      const errorMsg = err.message || '';
      const statusCode = err.status || (err.response && err.response.status);

      console.error(`[AI Model Error] ${modelName}:`, {
        message: errorMsg,
        status: statusCode,
        stack: err.stack?.substring(0, 200)
      });
      const isRateLimit = statusCode === 429 ||
        errorMsg.includes('429') ||
        errorMsg.toLowerCase().includes('quota') ||
        errorMsg.toLowerCase().includes('rate limit');

      if (!isRateLimit) {
        break;
      }

      console.warn(`Model ${modelName} rate limited, trying next fallback...`);
    }
  }

  console.error('AI chat final failure detail:');
  console.dir(lastError, { depth: null });

  const finalErrorMsg = lastError?.message || 'Unknown error';
  const finalStatus = lastError?.status || (lastError?.response && lastError?.response.status);

  if (finalStatus === 429 || finalErrorMsg.includes('429') || finalErrorMsg.toLowerCase().includes('rate limit') || finalErrorMsg.toLowerCase().includes('quota')) {
    return res.status(429).json({
      error: 'API rate limit reached. Please try one of the other models in the list.',
      isRateLimit: true
    });
  }

  if (finalStatus === 401 || finalStatus === 403 || finalErrorMsg.includes('API_KEY')) {
    return res.status(401).json({ error: 'AI Service configuration error (API Key). Please contact admin.' });
  }

  res.status(500).json({ error: `AI Error: ${finalErrorMsg.substring(0, 200)}${finalErrorMsg.length > 200 ? '...' : ''}` });
});

router.get('/models', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'API Key missing' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Failed to list models' });
    }

    const modelNames = data.models.map(m => m.name.replace('models/', ''));
    res.json({
      count: modelNames.length,
      available: modelNames
    });
  } catch (err) {
    console.error('Model list error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/test', async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.json({ status: 'error', message: 'No GEMINI_API_KEY in .env' });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent('Say "Hello, AI is working!" and nothing else.');
    const text = result.response.text();

    return res.json({
      status: 'ok',
      aiResponse: text
    });
  } catch (err) {
    return res.json({
      status: 'error',
      message: err.message
    });
  }
});

router.get('/debug-data', (req, res) => {
  res.json({
    version: currentLolVersion,
    runesCount: currentRunes.length,
    itemsCount: Object.keys(currentItems).length,
    sampleItems: Object.entries(currentItems).slice(0, 10),
    hubris: currentItems['Hubris'] || 'Not found'
  });
});

module.exports = router;
