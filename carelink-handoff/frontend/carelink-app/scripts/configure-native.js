// HTTPS same-origin deployment keeps session cookies HttpOnly in the WebView.
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
const raw = process.env.CARELINK_APP_URL;
if (!raw) throw new Error('Set CARELINK_APP_URL to your deployed HTTPS CareLink origin (no patient data in this URL).');
const url = new URL(raw);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('CARELINK_APP_URL must be an HTTPS origin.');
config.server = { androidScheme: 'https', url: `${url.origin}/mobile`, cleartext: false };
fs.writeFileSync('capacitor.config.json', JSON.stringify(config, null, 2) + '\n');
console.log('Native app configured for same-origin HTTPS sign-in. Run npx cap sync android.');
