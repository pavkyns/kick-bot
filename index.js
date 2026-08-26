require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

console.log('🤖 BOT STARTING...');

let lastMessageId = null;
const POLL_INTERVAL = 5000; // Kontroluj každých 5 sekund
const COOLDOWNS = new Map(); // Pro cooldown !case

// Weighted rewards
const REWARDS = [
  { name: '1x Ticket', weight: 60 },
  { name: '2x Ticket', weight: 25 },
  { name: '5x Ticket', weight: 10 },
  { name: '10x Ticket', weight: 5 },
];

// 1️⃣ Získej zprávy z chatu
async function fetchChatMessages() {
  try {
    const response = await axios.get(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.KICK_CLIENT_ID}`,
        },
      }
    );

    const messages = response.data.messages || [];

    for (const msg of messages) {
      if (msg.id && (!lastMessageId || msg.id > lastMessageId)) {
        console.log(`📨 ${msg.sender.username}: ${msg.content}`);

        // Detekuj !case command
        if (msg.content.includes('!case')) {
          handleCaseCommand(msg.sender.username);
        }

        lastMessageId = msg.id;
      }
    }
  } catch (error) {
    console.error('❌ Error fetching messages:', error.message);
  }
}

// 2️⃣ Handle !case command
function handleCaseCommand(username) {
  const now = Date.now();
  const cooldownKey = `case_${username}`;

  // Check cooldown (120s)
  if (COOLDOWNS.has(cooldownKey)) {
    const expiresAt = COOLDOWNS.get(cooldownKey);
    if (now < expiresAt) {
      const remaining = Math.ceil((expiresAt - now) / 1000);
      console.log(`⏳ ${username} je na cooldown (${remaining}s)`);
      return;
    }
  }

  // Set cooldown
  COOLDOWNS.set(cooldownKey, now + 120000);

  // Vyber reward s váhou
  const reward = getWeightedReward();
  console.log(`🎲 ${username} vyhrál: ${reward}`);

  // Pošli zprávu
  sendMessage(`@${username} Vyhrál jsi: ${reward}! 🎉`);
}

// 3️⃣ Weighted random selection
function getWeightedReward() {
  const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const reward of REWARDS) {
    random -= reward.weight;
    if (random <= 0) {
      return reward.name;
    }
  }

  return REWARDS[0].name;
}

// 4️⃣ Pošli zprávu do chatu
async function sendMessage(message) {
  try {
    console.log(`📤 Sending: ${message}`);
    await axios.post(
      `https://kick.com/api/v2/channels/${process.env.KICK_CHANNEL}/messages`,
      { content: message },
      {
        headers: {
          'Authorization': `Bearer ${process.env.KICK_CLIENT_ID}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Message sent!');
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
}

// 5️⃣ Start polling
function startPolling() {
  console.log('🔄 Starting message polling...');
  setInterval(fetchChatMessages, POLL_INTERVAL);
  // Ihned na začátek
  fetchChatMessages();
}

// 6️⃣ Express server
app.get('/', (req, res) => {
  res.json({ status: '✅ Bot is running!' });
});

app.listen(8080, () => {
  console.log('🚀 Server running on port 8080');
  startPolling();
});
