require('dotenv').config();
const irc = require('irc');
const express = require('express');

const app = express();

const REWARDS = [
  { name: '1x Ticket', weight: 60 },
  { name: '2x Ticket', weight: 25 },
  { name: '5x Ticket', weight: 10 },
  { name: '10x Ticket', weight: 5 },
];

const COOLDOWNS = new Map();

function getWeightedReward() {
  const totalWeight = REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;

  for (const reward of REWARDS) {
    random -= reward.weight;
    if (random <= 0) return reward.name;
  }
  return REWARDS[0].name;
}

const client = new irc.Client('irc.kick.com', process.env.BOT_USERNAME, {
  port: 6667,
  secure: false,
  channels: [`#${process.env.KICK_CHANNEL}`],
  password: process.env.BOT_PASSWORD,
  userName: process.env.BOT_USERNAME,
  realName: 'Case Bot',
  autoRejoin: true,
  autoConnect: true,
  retryCount: 999,
  retryDelay: 2000,
});

client.addListener('registered', () => {
  console.log('✅ Connected to Kick IRC!');
});

client.addListener('message', (from, to, text, message) => {
  console.log(`📨 [${from}]: ${text}`);

  if (text.toLowerCase().includes('!case')) {
    const now = Date.now();
    const cooldownKey = `case_${from}`;

    if (COOLDOWNS.has(cooldownKey)) {
      const expiresAt = COOLDOWNS.get(cooldownKey);
      if (now < expiresAt) {
        const remaining = Math.ceil((expiresAt - now) / 1000);
        console.log(`⏳ ${from} je na cooldown (${remaining}s)`);
        return;
      }
    }

    COOLDOWNS.set(cooldownKey, now + 120000);
    const reward = getWeightedReward();
    
    console.log(`🎲 ${from} vyhrál: ${reward}`);
    client.say(to, `@${from} Vyhrál jsi: ${reward}! 🎉`);
  }
});

client.addListener('error', (message) => {
  console.error('❌ IRC Error:', message);
});

app.get('/', (req, res) => {
  res.json({ status: '✅ Bot is running!' });
});

app.listen(8080, () => {
  console.log('🚀 Server running on port 8080');
});
