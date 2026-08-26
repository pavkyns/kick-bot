require('dotenv').config();
const { KickClient } = require('kick.js');

const client = new KickClient();
const PREFIX = '!';
const COOLDOWN_TIME = 120000;

const userCooldowns = new Map();

const caseRewards = {
  1: { chance: 30, reward: '1x Ticket do giveaway', emoji: '🎫' },
  2: { chance: 25, reward: '2x Ticket do giveaway', emoji: '🎫🎫' },
  3: { chance: 15, reward: '500 Pepe coins', emoji: '💰' },
  4: { chance: 10, reward: '1000 Pepe coins', emoji: '💰💰' },
  5: { chance: 8, reward: 'VIP role na 1 měsíc', emoji: '👑' },
  6: { chance: 5, reward: 'Custom role', emoji: '✨' },
  7: { chance: 3, reward: '5000 Pepe coins + Ticket', emoji: '💎' },
  8: { chance: 2, reward: 'Moderator na 1 měsíc', emoji: '🔨' },
  9: { chance: 1, reward: 'Vlastní emote na serveru', emoji: '🌟' },
  10: { chance: 1, reward: 'Perma VIP role', emoji: '👑✨' }
};

function spinCase() {
  const random = Math.random() * 100;
  let accumulated = 0;

  for (let num = 1; num <= 10; num++) {
    accumulated += caseRewards[num].chance;
    if (random <= accumulated) {
      return num;
    }
  }
  return 10;
}

function checkCooldown(userId) {
  const now = Date.now();
  const userLastUse = userCooldowns.get(userId);

  if (userLastUse && now - userLastUse < COOLDOWN_TIME) {
    const remainingSeconds = Math.ceil((COOLDOWN_TIME - (now - userLastUse)) / 1000);
    return {
      onCooldown: true,
      remaining: remainingSeconds
    };
  }

  userCooldowns.set(userId, now);
  return { onCooldown: false };
}

client.on('message', (message) => {
  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  if (command === `${PREFIX}case`) {
    const username = message.author.username;
    const userId = message.author.id;

    const cooldownCheck = checkCooldown(userId);
    if (cooldownCheck.onCooldown) {
      client.chat.sendMessage(
        `@${username} Musíš počkat ${cooldownCheck.remaining}s! ⏱️`,
        message.channel.id
      );
      return;
    }

    const winNumber = spinCase();
    const reward = caseRewards[winNumber];

    const responseMessage = `${username} ${reward.emoji} Padlo ti číslo: ${winNumber} (šance: ${reward.chance}%) Výhra: ${reward.reward} 🎉`;
    
    client.chat.sendMessage(responseMessage, message.channel.id);
  }
});

client.login({
  username: process.env.BOT_USERNAME,
  password: process.env.BOT_PASSWORD
});
