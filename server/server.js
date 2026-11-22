"use strict";
/* YFE Craft — сервер без зависимостей (HTTP + WebSocket). Разработчик: @yfeeeee */
const sim = require("./sim.js");
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const SAVE_FILE = path.join(DATA_DIR, "world.json");
const MAX_PLAYERS = 8;
const COLORS = ["#ff5a5a", "#5ad1ff", "#ffd25a", "#6bd04a", "#c07bff", "#ff9a3d", "#ff7ad9", "#e8eefc"];

let world = { seed: 1 + Math.floor(Math.random() * 1e6), edits: {} };
try { world = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8")); } catch (e) { /* новый мир */ }
world.te = world.te || {}; if (typeof world.time !== "number") world.time = .2;
const TE = new Map(Object.entries(world.te)); const sent = new Map();
const sleepers = new Set();
const sunNow = () => Math.max(0, Math.min(1, Math.sin(world.time * 2 * Math.PI) * 1.6 + .25));
const blockAtK = (k) => world.edits[k] | 0;
const teJson = (te) => JSON.stringify({ s: te.slots, c: te.cells, f: te.freq, e: Math.round(te.e), p: +te.p.toFixed(1), b: Math.round(te.burn), i: te.info && { prod: Math.round(te.info.prod), use: Math.round(te.info.use), stored: Math.round(te.info.stored), cap: te.info.cap } });
const tePub = (te) => ({ k: te.k, t: te.t, slots: te.slots, cells: te.cells, freq: te.freq, e: te.e, p: te.p, burn: te.burn, info: te.info });
let dirty = false;
function saveWorld() { world.te = Object.fromEntries(TE); if (!dirty && !TE.size) return; dirty = false; try { fs.writeFileSync(SAVE_FILE + ".tmp", JSON.stringify(world)); fs.renameSync(SAVE_FILE + ".tmp", SAVE_FILE); } catch (e) { console.error("save:", e.message); } }
setInterval(saveWorld, 10000);
process.on("SIGTERM", () => { saveWorld(); process.exit(0); });
process.on("SIGINT", () => { saveWorld(); process.exit(0); });

const PUB = path.join(__dirname, "public");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || "/").split("?")[0]); if (u === "/") u = "/index.html";
  if (u === "/health") { res.end("ok"); return; }
  const f = path.normalize(path.join(PUB, u));
  if (!f.startsWith(PUB)) { res.statusCode = 403; res.end(); return; }
  fs.readFile(f, (err, d) => { if (err) { res.statusCode = 404; res.end("not found"); return; } res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream"); res.setHeader("Cache-Control", "no-cache"); res.end(d); });
});

// ---- минимальный WebSocket (RFC 6455) ----
const players = new Map(); let nextId = 1;
function frame(op, payload) {
  const len = payload.length; let h;
  if (len < 126) h = Buffer.from([0x80 | op, len]);
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([h, payload]);
}
function send(p, obj) { if (p.sock.destroyed) return; try { p.sock.write(frame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) { /* ignore */ } }
function broadcast(obj, except) { const b = frame(1, Buffer.from(JSON.stringify(obj))); for (const p of players.values()) if (p !== except && !p.sock.destroyed) { try { p.sock.write(b); } catch (e) { /* ignore */ } } }
server.on("upgrade", (req, sock) => {
  const key = req.headers["sec-websocket-key"];
  if (!key || players.size >= MAX_PLAYERS) { sock.end("HTTP/1.1 503 Service Unavailable\r\n\r\n"); return; }
  const acc = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  sock.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc + "\r\n\r\n");
  sock.setNoDelay(true);
  const p = { id: nextId++, sock, name: "Игрок", color: COLORS[(nextId - 2) % COLORS.length], x: 0, y: 0, z: 0, yaw: 0, pitch: 0, joined: false, buf: Buffer.alloc(0), last: Date.now(), msgs: 0, win: Date.now() };
  players.set(p.id, p);
  sock.on("data", (d) => {
    p.buf = Buffer.concat([p.buf, d]); if (p.buf.length > 1 << 20) { sock.destroy(); return; }
    for (;;) {
      const b = p.buf; if (b.length < 2) return;
      const op = b[0] & 15, masked = !!(b[1] & 128); let len = b[1] & 127, off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      if (len > 1 << 20) { sock.destroy(); return; }
      const need = off + (masked ? 4 : 0) + len; if (b.length < need) return;
      let data = b.slice(off + (masked ? 4 : 0), need);
      if (masked) { const m = b.slice(off, off + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= m[i & 3]; }
      p.buf = b.slice(need);
      if (op === 8) { sock.end(frame(8, Buffer.alloc(0))); return; }
      if (op === 9) { sock.write(frame(10, data)); continue; }
      if (op === 1) { p.last = Date.now(); handle(p, data.toString("utf8")); }
    }
  });
  const gone = () => { if (!players.has(p.id)) return; players.delete(p.id); if (p.joined) { broadcast({ t: "leave", id: p.id }); broadcast({ t: "chat", name: "Сервер", msg: p.name + " вышел" }); } };
  sock.on("close", gone); sock.on("error", gone);
});
const num = (v, lim) => (typeof v === "number" && isFinite(v) && Math.abs(v) < lim ? v : 0);
function handle(p, raw) {
  const now = Date.now(); if (now - p.win > 1000) { p.win = now; p.msgs = 0; } if (++p.msgs > 120) return;
  let m; try { m = JSON.parse(raw); } catch (e) { return; }
  if (m.t === "join") {
    p.name = String(m.name || "Игрок").replace(/[<>]/g, "").slice(0, 16) || "Игрок"; p.joined = true;
    const edits = []; for (const k in world.edits) { const [x, y, z] = k.split(",").map(Number); edits.push([x, y, z, world.edits[k]]); }
    send(p, { t: "init", id: p.id, seed: world.seed, time: world.time, te: [...TE.values()].map(tePub), edits, players: [...players.values()].filter((o) => o.joined && o !== p).map(pub) });
    broadcast({ t: "join", p: pub(p) }, p); broadcast({ t: "chat", name: "Сервер", msg: p.name + " зашёл в игру" });
  } else if (!p.joined) return;
  else if (m.t === "p") { p.x = num(m.x, 1e6); p.y = num(m.y, 1e4); p.z = num(m.z, 1e6); p.yaw = num(m.yaw, 100); p.pitch = num(m.pitch, 10); }
  else if (m.t === "b") {
    const x = m.x | 0, y = m.y | 0, z = m.z | 0, id = m.id | 0; if (y < 0 || y >= 64 || id < 0 || id > 255) return;
    const kk = x + "," + y + "," + z; world.edits[kk] = id; dirty = true; broadcast({ t: "b", x, y, z, id }, p);
    const oldT = TE.get(kk);
    if (oldT && oldT.t !== id && sim.CHESTS.has(oldT.t) && sim.CHESTS.has(id)) { oldT.t = id; while (oldT.slots.length < sim.TEDEF[id].slots) oldT.slots.push(null); sent.set(kk, teJson(oldT)); broadcast({ t: "tes", l: [tePub(oldT)] }); }
    else if (TE.has(kk) && TE.get(kk).t !== id) { TE.delete(kk); sent.delete(kk); broadcast({ t: "te_del", k: kk }); }
    if (sim.TEDEF[id] && !TE.has(kk)) { const te = sim.create(id, kk); TE.set(kk, te); }
  } else if (m.t === "te_slots") {
    const te = TE.get(String(m.k)); if (!te || !Array.isArray(m.slots) || m.slots.length !== te.slots.length) return;
    te.slots = m.slots.map((s) => (s && typeof s.id === "number" && typeof s.n === "number" && s.n > 0 ? (s.d > 0 || s.h > 0 ? { id: s.id | 0, n: Math.min(s.n | 0, 9999), d: Math.min(s.d | 0, 100000), h: Math.min(+s.h || 0, 20000) } : { id: s.id | 0, n: Math.min(s.n | 0, 9999) }) : null));
    if (Array.isArray(m.cells) && te.cells && m.cells.length === te.cells.length) te.cells = m.cells.map((c) => (c && c.items ? { items: c.items, tot: c.tot | 0 } : null));
    if (m.freq) te.freq = Math.max(1, Math.min(999, m.freq | 0));
    sent.set(te.k, teJson(te)); broadcast({ t: "tes", l: [tePub(te)] }, p);
  } else if (m.t === "mobs") { broadcast({ t: "mobs", o: p.id, l: Array.isArray(m.l) ? m.l.slice(0, 40) : [] }, p); }
  else if (m.t === "sleep") { if (sunNow() < .35) { sleepers.add(p.id); for (const id of [...sleepers]) if (!players.has(id)) sleepers.delete(id); if (sleepers.size >= Math.ceil(players.size / 2)) { world.time = .02; sleepers.clear(); broadcast({ t: "time", v: world.time }); broadcast({ t: "chat", name: "Сервер", msg: "Наступило утро" }); } else broadcast({ t: "chat", name: "Сервер", msg: p.name + " лёг спать (" + sleepers.size + "/" + Math.ceil(players.size / 2) + ")" }); } }
  else if (m.t === "pdmg") { const o = players.get(m.to | 0); if (o && o !== p) send(o, { t: "pdmg", dmg: Math.min(10, Math.max(0, +m.dmg || 0)) }); }
  else if (m.t === "hit") { const o = players.get(m.o | 0); if (o) send(o, { t: "hit", from: p.id, id: m.id, dmg: num(m.dmg, 100), ax: num(m.ax, 1e6), az: num(m.az, 1e6) }); }
  else if (m.t === "drop") { const o = players.get(m.to | 0); if (o) send(o, { t: "drop", type: String(m.type).slice(0, 8) }); }
  else if (m.t === "chat") { const msg = String(m.msg || "").replace(/[<>]/g, "").slice(0, 120); if (msg) broadcast({ t: "chat", name: p.name, msg }); }
}
const pub = (p) => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch });
setInterval(() => { world.time = (world.time + .1 / 600) % 1; if (TE.size) sim.tick(TE, blockAtK, .1, sunNow()); }, 100);
setInterval(() => { if (!players.size) return; const l = []; for (const [k, te] of TE) { const j = teJson(te); if (sent.get(k) !== j) { sent.set(k, j); l.push(tePub(te)); } } if (l.length) broadcast({ t: "tes", l }); }, 500);
setInterval(() => { if (players.size) broadcast({ t: "time", v: world.time }); }, 5000);
setInterval(() => { if (players.size < 2) return; const list = [...players.values()].filter((p) => p.joined).map((p) => [p.id, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(3), +p.pitch.toFixed(3)]); broadcast({ t: "ps", l: list }); }, 66);
setInterval(() => { const n = Date.now(); for (const p of players.values()) if (n - p.last > 60000) p.sock.destroy(); }, 10000);
server.listen(PORT, () => console.log("YFE Craft server :" + PORT + " seed " + world.seed));
