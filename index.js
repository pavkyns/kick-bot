require('dotenv').config();

const http = require('http');

console.log('[BOT] ✅ Bot se spustil!');
console.log('[BOT] Username:', process.env.BOT_USERNAME);

// HTTP Server - aby Railway věděl že je bot živý
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Kick Bot is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] ✅ Listening on port ${PORT}`);
});

// Cooldowns map
const userCooldowns = new Map();

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

// Testovací simulace
setInterval(() => {
  const reward = spinCase();
  console.log(`[CASE] ${reward}`);
}, 60000);

console.log('[BOT] ✅ Ready for !case command!');
