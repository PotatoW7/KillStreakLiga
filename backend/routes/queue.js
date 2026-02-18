const express = require('express');
const router = express.Router();

let queue = [];


const GAME_MODES = {
  solo_duo: {
    validSizes: [2]
  },
  ranked_flex: {
    validSizes: [1, 2, 3, 5]
  },
  draft: {
    validSizes: [1, 2, 3, 4, 5]
  },
  swiftplay: {
    validSizes: [1, 2, 3, 4, 5]
  },
  aram: {
    validSizes: [1, 2, 3, 4, 5]
  }
};

router.post('/join', async (req, res) => {
  try {
    const {
      userId,
      playerName,
      riotAccount,
      region,
      preferredRoles = [],
      queueType,
      partySize = 1,
      rank,
      communicationPrefs = { voice: false, text: true }
    } = req.body;

    if (!userId || !riotAccount?.gameName) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const modeConfig = GAME_MODES[queueType];
    if (!modeConfig) {
      return res.status(400).json({ success: false, error: 'Invalid game mode' });
    }

    if (!modeConfig.validSizes.includes(partySize)) {
      return res.status(400).json({ success: false, error: 'Invalid party size for this game mode' });
    }

    const alreadyInQueue = queue.find(player => player.userId === userId);
    if (alreadyInQueue) {
      return res.json({ success: false, error: 'Already in queue' });
    }

    const player = {
      userId,
      playerName,
      riotAccount,
      region: region.toLowerCase(),
      preferredRoles,
      queueType,
      partySize,
      rank,
      communicationPrefs,
      joinedAt: new Date(),
      queueId: generateQueueId()
    };

    queue.push(player);
    console.log(`Player ${playerName} joined ${queueType} queue. Queue size: ${queue.length}`);

    res.json({
      success: true,
      queueId: player.queueId,
      position: queue.length,
      estimatedWait: estimateWaitTime(queue.length)
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

router.post('/leave', (req, res) => {
  try {
    const { userId } = req.body;

    const initialLength = queue.length;
    queue = queue.filter(player => player.userId !== userId);

    console.log(`Player ${userId} left queue. Queue was ${initialLength}, now ${queue.length}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving queue:', error);
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

router.get('/status/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const inQueue = queue.find(player => player.userId === userId);

    const queueStats = {
      totalPlayers: queue.length,
      playersInRegion: inQueue ? queue.filter(p => p.region === inQueue.region).length : 0,
      averageWaitTime: calculateAverageWaitTime(),
      modePreferences: calculateModePreferences()
    };

    res.json({
      inQueue: !!inQueue,
      queuePosition: inQueue ? queue.indexOf(inQueue) + 1 : null,
      queueSize: queue.length,
      currentMatch: null,
      queueStats,
      estimatedWait: inQueue ? estimateWaitTime(queue.length) : null
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

router.get('/players', (req, res) => {
  try {
    const { excludeUserId } = req.query;

    let filteredPlayers = queue;

    if (excludeUserId) {
      filteredPlayers = queue.filter(player => player.userId !== excludeUserId);
    }

    res.json({
      players: filteredPlayers.map(player => ({
        userId: player.userId,
        playerName: player.playerName,
        riotAccount: player.riotAccount,
        region: player.region,
        preferredRoles: player.preferredRoles,
        queueType: player.queueType,
        partySize: player.partySize,
        rank: player.rank,
        communicationPrefs: player.communicationPrefs,
        waitTime: Math.floor((new Date() - player.joinedAt) / 1000)
      }))
    });
  } catch (error) {
    console.error('Error getting available players:', error);
    res.status(500).json({ error: 'Failed to get available players' });
  }
});

router.get('/analytics', (req, res) => {
  try {
    const { region } = req.query;

    const filteredQueue = region && region !== 'all' && region !== 'undefined'
      ? queue.filter(p => p.region === region.toLowerCase())
      : queue;

    const analytics = {
      totalPlayers: filteredQueue.length,
      averageWaitTime: calculateAverageWaitTime(filteredQueue),
      modePreferences: calculateModePreferences(filteredQueue),
      region: region || 'all'
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error getting queue analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

function calculateModePreferences(players = queue) {
  const preferences = {};
  players.forEach(player => {
    preferences[player.queueType] = (preferences[player.queueType] || 0) + 1;
  });
  return preferences;
}

function estimateWaitTime(queueSize) {
  const baseWait = 30;
  const sizeMultiplier = 10;
  return Math.max(baseWait, queueSize * sizeMultiplier);
}

function calculateAverageWaitTime(players = queue) {
  if (players.length === 0) return 0;
  const totalWait = players.reduce((sum, player) => {
    return sum + Math.floor((new Date() - player.joinedAt) / 1000);
  }, 0);
  return Math.floor(totalWait / players.length);
}

function generateQueueId() {
  return 'q_' + Math.random().toString(36).substr(2, 9);
}


module.exports = router;