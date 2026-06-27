// Run: node gen-link.js
// Generates a random food credit gift link to send to target

const DOMAIN = process.env.DOMAIN || 'https://chowdeckgift.com';
const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const len    = 12;

let id = '';
for (let i = 0; i < len; i++) {
  id += chars[Math.floor(Math.random() * chars.length)];
}

const link = `${DOMAIN}/${id}`;

console.log('\n  Gift link:');
console.log(`  ${link}`);
console.log('\n  WhatsApp message:');
console.log(`  "I no get cash right now but I get 7k on my Chowdeck.\n  I go share am with you make you fit chop at least.\n  Use this link to claim the credit: ${link}\n  Ref: ${id.toUpperCase()}\n  Expires in 1 hour."\n`);
