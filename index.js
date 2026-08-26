require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

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

function verifyWebhookSignature(req) {
  const signature = req.headers['x-signature'];
  if (!signature) return false;

  const payload = JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.KICK_CLIENT_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(signature, hash);
}

app.post('/webhook', (req, res) => {
  console.log('📨 Webhook received:', JSON.stringify(req.body, null, 2));

  if (!verifyWebhookSignature(req)) {
    console.error('❌ Invalid signature!');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type, data } = req.body;

  if (type === 'channel.chat_message' || type === 'message.created') {
    const message = data?.message || data?.content;
    const username = data?.user?.username || data?.sender?.username;

    console.log(`💬 [${username}]: ${message}`);

    if (message.toLowerCase().includes('!case')) {
      const now = Date.now();
      const cooldownKey = `case_${username}`;

      if (COOLDOWNS.has(cooldownKey)) {
        const expiresAt = COOLDOWNS.get(cooldownKey);
        if (now < expiresAt) {
          const remaining = Math.ceil((expiresAt - now) / 1000);
          console.log(`⏳ ${username} je na cooldown (${remaining}s)`);
          return res.json({ ok: true });
        }
      }

      COOLDOWNS.set(cooldownKey, now + 120000);
      const reward = getWeightedReward();
      console.log(`🎲 ${username} vyhrál: ${reward}`);
    }
  }

  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.json({ status: '✅ Bot is running!', webhook: '/webhook' });
});

app.listen(8080, () => {
  console.log('🚀 Server running on port 8080');
  console.log('📡 Webhook: POST /webhook');
});
