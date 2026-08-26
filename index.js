require('dotenv').config();

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Username:', process.env.BOT_USERNAME);

// Testovací funkce
function spinCase() {
  const rand = Math.random() * 100;
  if (rand < 30) return '1x Ticket';
  if (rand < 55) return '2x Ticket';
  if (rand < 75) return '5x Ticket';
  if (rand < 88) return '10x Ticket';
  if (rand < 96) return 'VIP Day';
  if (rand < 99) return '7 Day VIP';
  return 'Perma VIP';
}

// Testovací loop - aby se bot neidle necrashoval
setInterval(() => {
  console.log('[TEST] Case:', spinCase());
}, 60000); // Každou minutu

console.log('[BOT] ✅ Bot je připraven!');



client.on('ready', () => {
  console.log('[BOT] Přihlášen jako:', client.username);
});

client.on('message', (message) => {
  const args = message.content.split(' ');
  const command = args[0].toLowerCase();

  if (command === '!case') {
    const userId = message.author.id;
    const now = Date.now();

    // Kontrola cooldownu
    if (userCooldowns.has(userId)) {
      const cooldownEnd = userCooldowns.get(userId);
      if (now < cooldownEnd) {
        const secondsLeft = Math.ceil((cooldownEnd - now) / 1000);
        message.reply(`⏳ Musíš počkat ${secondsLeft} sekund!`);
        return;
      }
    }

    // Nastav nový cooldown (120 sekund = 2 minuty)
    userCooldowns.set(userId, now + 120000);

    const reward = spinCase();
    message.reply(`🎁 Vyhrál jsi: **${reward}**`);
  }
});

// Přihlášení
client.login(process.env.BOT_USERNAME, process.env.BOT_PASSWORD);
