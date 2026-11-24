"use strict";
/* Симуляция механизмов на сервере. Разработчик: @yfeeeee. Идентификаторы должны совпадать с index.html */
const B = { LOG: 5, PLANKS: 7, COBBLE: 8, SAND: 4, GLASS: 15, STONE: 3, CHEST: 23, CABLE: 24, GENERATOR: 25, SOLAR: 26, SMELTER: 27, MACERATOR: 28, BATTERY: 29, MECABLE: 30, TERMINAL: 31, CRUCIBLE: 32, DRIVE: 33, QBRIDGE: 35, JAR: 38, PEDESTAL: 47, CHEST_IRON: 48, CHEST_GOLD: 49, CHEST_DIAMOND: 50, INFUSION: 34, PRESS: 51, MILL: 52, SMELTERY: 53, TANK: 54, CAST: 55, WHEEL: 56, WINDMILL: 57, REACTOR: 64, CHARGER: 65, MFE: 66, COMPRESSOR: 70, COOLER: 84, QUARRY: 83, SHAFT: 67, COGWHEEL: 68, WATER: 21 };
const I = { STICK: 100, COAL: 101, RAW_COPPER: 102, RAW_TIN: 103, RAW_IRON: 104, RAW_GOLD: 105, ING_COPPER: 107, ING_TIN: 108, ING_IRON: 109, ING_GOLD: 110, RAW_MEAT: 180, COOKED: 181, DUST_COPPER: 190, DUST_TIN: 191, DUST_IRON: 192, DUST_GOLD: 193 };
const FUEL = { [I.COAL]: 40, [B.LOG]: 10, [B.PLANKS]: 5, [I.STICK]: 2 };
const SMELT = { [I.RAW_COPPER]: I.ING_COPPER, [I.RAW_TIN]: I.ING_TIN, [I.RAW_IRON]: I.ING_IRON, [I.RAW_GOLD]: I.ING_GOLD, [I.DUST_COPPER]: I.ING_COPPER, [I.DUST_TIN]: I.ING_TIN, [I.DUST_IRON]: I.ING_IRON, [I.DUST_GOLD]: I.ING_GOLD, [B.SAND]: B.GLASS, [B.COBBLE]: B.STONE, [I.RAW_MEAT]: I.COOKED };
const MACER = { [I.RAW_COPPER]: [I.DUST_COPPER, 2], [I.RAW_TIN]: [I.DUST_TIN, 2], [I.RAW_IRON]: [I.DUST_IRON, 2], [I.RAW_GOLD]: [I.DUST_GOLD, 2], [B.COBBLE]: [B.SAND, 1], [B.LOG]: [B.PLANKS, 6] };
const COMPM = { [8]: [3, 1], [3]: [22, 1] };
const PRESSM = { [109]: [231, 1], [107]: [232, 1], [110]: [233, 1] };
const MILLM = { [102]: [190, 2], [103]: [191, 2], [104]: [192, 2], [105]: [193, 2] };
const TEDEF = { [B.CHEST]: { slots: 27 }, [B.REACTOR]: { slots: 54, energy: true }, [B.CHARGER]: { slots: 1, energy: true }, [B.MFE]: { slots: 0, energy: true }, [B.COMPRESSOR]: { slots: 2, energy: true, rate: 20 }, [B.SMELTERY]: { slots: 2, cells: 1 }, [B.TANK]: { slots: 0, cells: 1 }, [B.CAST]: { slots: 2 }, [B.WHEEL]: { slots: 0, energy: true }, [B.WINDMILL]: { slots: 0, energy: true }, [B.PRESS]: { slots: 2, energy: true, rate: 18 }, [B.MILL]: { slots: 2, energy: true, rate: 6 }, [B.GENERATOR]: { slots: 1, energy: true }, [B.SOLAR]: { slots: 0, energy: true }, [B.SMELTER]: { slots: 2, energy: true, rate: 12 }, [B.MACERATOR]: { slots: 2, energy: true, rate: 15 }, [B.BATTERY]: { slots: 0, energy: true }, [B.TERMINAL]: { slots: 0 }, [B.CRUCIBLE]: { slots: 1 }, [B.DRIVE]: { slots: 0, cells: 5 }, [B.QBRIDGE]: { slots: 0 }, [B.JAR]: { slots: 0, cells: 1 }, [B.PEDESTAL]: { slots: 1 }, [B.CHEST_IRON]: { slots: 54 }, [B.CHEST_GOLD]: { slots: 81 }, [B.CHEST_DIAMOND]: { slots: 108 }, [B.INFUSION]: { slots: 1 } };
const ENERGY = new Set([B.CABLE, B.GENERATOR, B.SOLAR, B.SMELTER, B.MACERATOR, B.PRESS, B.MILL, B.WHEEL, B.WINDMILL, B.REACTOR, B.CHARGER, B.COMPRESSOR, B.MFE, B.SHAFT, B.COGWHEEL, B.BATTERY]);
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const BAT_CAP = 4000;
const create = (t, k) => ({ t, k, freq: 1, slots: new Array(TEDEF[t].slots).fill(null), cells: TEDEF[t].cells ? new Array(TEDEF[t].cells).fill(null) : undefined, e: 0, p: 0, burn: 0 });
function job(te) {
  const inp = te.slots[0]; if (!inp) return null; let out, n = 1;
  if (te.t === B.SMELTER) out = SMELT[inp.id]; else { const m = (te.t === B.COMPRESSOR ? COMPM : te.t === B.PRESS ? PRESSM : te.t === B.MILL ? MILLM : MACER)[inp.id]; if (m) { out = m[0]; n = m[1]; } }
  if (!out) return null; const o = te.slots[1]; if (o && (o.id !== out || o.n + n > 64)) return null; return { out, n, rate: TEDEF[te.t].rate };
}
const MELT = { 14: ["diamond", 200], 102: ["copper", 200], 103: ["tin", 200], 104: ["iron", 200], 105: ["gold", 200], 190: ["copper", 100], 191: ["tin", 100], 192: ["iron", 100], 193: ["gold", 100], 107: ["copper", 100], 108: ["tin", 100], 109: ["iron", 100], 110: ["gold", 100], 149: ["thaum", 100], 230: ["bronze", 100] };
function smeltTick(te, dt, TEX) {
  const c = te.cells[0] || (te.cells[0] = { items: {}, tot: 0 }), inp = te.slots[0], m = inp && MELT[inp.id];
  if (te.burn > 0) te.burn -= dt;
  if (m && c.tot + m[1] <= 4000) {
    if (te.burn <= 0 && te.slots[1] && FUEL[te.slots[1].id]) { te.burn = FUEL[te.slots[1].id]; te.slots[1].n--; if (te.slots[1].n <= 0) te.slots[1] = null; }
    if (te.burn > 0) { te.p += dt; if (te.p >= 3) { te.p = 0; inp.n--; if (inp.n <= 0) te.slots[0] = null; c.items[m[0]] = (c.items[m[0]] || 0) + m[1]; c.tot += m[1]; } } else te.p = 0;
  } else te.p = 0;
  const it = c.items; while ((it.copper || 0) >= 75 && (it.tin || 0) >= 25) { it.copper -= 75; it.tin -= 25; it.bronze = (it.bronze || 0) + 100; }
  if (c.tot > 0 && te.k) { const p = te.k.split(",").map(Number); for (const d of DIRS) { const t2 = TEX.get((p[0] + d[0]) + "," + (p[1] + d[1]) + "," + (p[2] + d[2])); if (t2 && t2.t === B.TANK) { const tc = t2.cells[0] || (t2.cells[0] = { items: {}, tot: 0 }); for (const f in it) { if (!(it[f] > 0)) continue; const mv = Math.min(it[f], 16000 - tc.tot); if (mv > 0) { it[f] -= mv; c.tot -= mv; tc.items[f] = (tc.items[f] || 0) + mv; tc.tot += mv; } } } } }
}
const HMAX = { 252: 10000, 253: 1000, 254: 1000, 256: 2500 }, RHEAT = { 252: 1, 253: 1, 254: 1, 256: 1 };
function reactorStep(te) {
  const s = te.slots, W = 9, H = 6, on = te.freq >= 2; let eu = 0, hullAdd = 0, hull = te.p || 0;
  const nbs = (r, c) => { const o = []; for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (a >= 0 && b >= 0 && a < H && b < W && s[a * W + b]) o.push({ i: a * W + b, s: s[a * W + b] }); return o; };
  if (on) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const cell = s[r * W + c]; if (!cell || cell.id !== 250) continue; const ns = nbs(r, c); let pulses = 1;
    for (const n of ns) { if (n.s.id === 250) pulses++; else if (n.s.id === 255) { pulses++; n.s.d = (n.s.d || 0) + 1; if (n.s.d >= 3000) s[n.i] = null; } }
    eu += 20 * pulses; const heat = 4 * pulses * (pulses + 1) / 2, acc = ns.filter((n) => s[n.i] && RHEAT[s[n.i].id]);
    if (acc.length) for (const n of acc) n.s.h = (n.s.h || 0) + heat / acc.length; else hullAdd += heat;
    cell.d = (cell.d || 0) + 1; if (cell.d >= 1200) s[r * W + c] = { id: 251, n: 1 };
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const k = s[r * W + c]; if (!k || !RHEAT[k.id]) continue; k.h = k.h || 0;
    if (k.id === 253) k.h = Math.max(0, k.h - 6);
    else if (k.id === 254) { const t = Math.min(5, hull); hull -= t; k.h = Math.max(0, k.h + t - 10); }
    else if (k.id === 256) { for (const n of nbs(r, c)) if (RHEAT[n.s.id]) { n.s.h = n.s.h || 0; const d = (n.s.h / HMAX[n.s.id] - k.h / 2500) * 400, t = Math.max(-4, Math.min(4, d)); n.s.h -= t; k.h += t; } const t2 = Math.min(4, hull); hull -= t2; k.h += t2; }
    if (k.h >= HMAX[k.id]) s[r * W + c] = null;
  }
  hull -= (te.cool || 0) * 12; hull += hullAdd; if (!on) hull -= 2; te.p = Math.max(0, hull); te.e = on ? eu : 0;
}
function coolCount(k, blockAt) { const q = k.split(",").map(Number); let n = 0; for (const d of DIRS) if (blockAt(q[0] + d[0], q[1] + d[1], q[2] + d[2]) === B.COOLER) n++; return n; }
function tick(TE, blockAt, dt, sun) {
  const seen = new Set();
  for (const [, t0] of TE) if (t0.t === B.REACTOR) { t0.rt = (t0.rt || 0) + dt; if (t0.rt >= 1) { t0.rt -= 1; t0.cool = coolCount(t0.k, blockAt); reactorStep(t0); } }
  for (const [, t0] of TE) if (t0.t === B.SMELTERY) smeltTick(t0, dt, TE);
  for (const [k, te] of TE) {
    if (!TEDEF[te.t] || !TEDEF[te.t].energy || seen.has(k)) continue;
    const comp = [], q = [k], cells = new Set([k]); seen.add(k);
    while (q.length && cells.size < 800) {
      const cur = q.pop(), p = cur.split(",").map(Number), t = TE.get(cur); if (t) comp.push(t);
      for (const d of DIRS) { const nk = (p[0] + d[0]) + "," + (p[1] + d[1]) + "," + (p[2] + d[2]); if (cells.has(nk)) continue; const b = blockAt(nk); if (ENERGY.has(b)) { cells.add(nk); seen.add(nk); q.push(nk); } }
    }
    let req = 0, batE = 0, batCap = 0, prod = 0; const bats = [], gens = [], cons = [], chg = [];
    for (const t of comp) {
      if (t.t === B.BATTERY || t.t === B.MFE) { bats.push(t); batE += t.e; batCap += t.t === B.MFE ? 40000 : BAT_CAP; }
      else if (t.t === B.GENERATOR) gens.push(t);
      else if (t.t === B.SMELTER || t.t === B.MACERATOR || t.t === B.PRESS || t.t === B.MILL || t.t === B.COMPRESSOR) { const j = job(t); if (j) { cons.push([t, j]); req += j.rate * dt; } else t.p = 0; }
      else if (t.t === B.CHARGER) { if (t.slots[0] && t.slots[0].d > 0) { req += 30 * dt; chg.push(t); } }
      else if (t.t === B.REACTOR) { prod += (t.e || 0) * dt; }
      else if (t.t === B.WHEEL) { const q2 = t.k.split(",").map(Number); let w = 0; for (const d of DIRS) { const nk = (q2[0] + d[0]) + "," + (q2[1] + d[1]) + "," + (q2[2] + d[2]); if (blockAt(nk) === B.WATER) w = 1; const tq = TE.get(nk); if (tq && tq.t === B.TANK && tq.cells[0] && tq.cells[0].items.water > 0) w = 1; } prod += w * 12 * dt; }
      else if (t.t === B.WINDMILL) { t.skyT = (t.skyT || 0) - dt; if (t.skyT <= 0) { t.skyT = 2; const q2 = t.k.split(",").map(Number); let clear = true; for (let y = q2[1] + 1; y < 64; y++) { const b = blockAt(q2[0] + "," + y + "," + q2[2]); if (b > 0 && b !== B.CABLE) { clear = false; break; } } t.sky = clear; t.hh = q2[1]; } prod += t.sky ? (3 + 9 * Math.max(0, Math.min(1, (t.hh - 20) / 40))) * dt : 0; }
      else if (t.t === B.SOLAR) { t.skyT = (t.skyT || 0) - dt; if (t.skyT <= 0) { t.skyT = 2; const p = t.k.split(",").map(Number); let clear = true; for (let y = p[1] + 1; y < 64; y++) { const b = blockAt(p[0] + "," + y + "," + p[2]); if (b > 0 && b !== B.CABLE && b !== B.MECABLE) { clear = false; break; } } t.sky = clear; } prod += t.sky ? 6 * dt * Math.max(0, Math.min(1, sun * 1.2)) : 0; }
    }
    const room = batCap - batE;
    for (const g of gens) {
      if (g.burn <= 0 && g.slots[0] && FUEL[g.slots[0].id] && (req > 0 || room > 0)) { g.burn = FUEL[g.slots[0].id]; g.slots[0].n--; if (g.slots[0].n <= 0) g.slots[0] = null; }
      if (g.burn > 0) { g.burn -= dt; prod += 20 * dt; }
    }
    const total = prod + batE, used = Math.min(total, req), eff = req > 0 ? used / req : 0, stored = Math.min(total - used, batCap);
    for (const b of bats) b.e = stored * ((b.t === B.MFE ? 40000 : BAT_CAP) / batCap);
    for (const t of chg) t.slots[0].d = Math.max(0, t.slots[0].d - 40 * dt * eff);
    for (const [t, j] of cons) { t.p += dt * eff; if (t.p >= 4) { t.p = 0; t.slots[0].n--; if (t.slots[0].n <= 0) t.slots[0] = null; const o = t.slots[1]; if (o) o.n += j.n; else t.slots[1] = { id: j.out, n: j.n }; } }
    const info = { prod: prod / dt, use: used / dt, stored, cap: batCap }; for (const t of comp) t.info = info;
  }
}
const CHESTS = new Set([B.CHEST, B.CHEST_IRON, B.CHEST_GOLD, B.CHEST_DIAMOND]);
module.exports = { TEDEF, create, tick, CHESTS };
