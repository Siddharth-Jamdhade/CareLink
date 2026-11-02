const fs = require("fs");
const crypto = require("crypto");
const manifest = JSON.parse(fs.readFileSync("build/asset-manifest.json", "utf8"));
const assets = ["/", "/index.html", "/manifest.json", "/logo192.png", "/logo512.png", ...Object.values(manifest.files).filter(p => !p.endsWith(".map"))];
const version = crypto.createHash("sha256").update(JSON.stringify(assets) + fs.readFileSync("build/index.html")).digest("hex").slice(0, 12);
fs.writeFileSync("build/service-worker.js", `
const CACHE = "carelink-shell-${version}";
const ASSETS = ${JSON.stringify([...new Set(assets)])};
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("carelink-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", event => {
 const url = new URL(event.request.url);
 if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/uploads/")) return;
 if (event.request.mode === "navigate") { event.respondWith(fetch(event.request).catch(() => caches.match("/index.html"))); return; }
 if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)));
});
`);
