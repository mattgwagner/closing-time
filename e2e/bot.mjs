// Balance gate: plays whole nights at high speed with the bot players in POLICIES / POLICIES2 (public/index.html),
// for both chapters. "good" reacts to what a careful player can see or hear, with human reaction delays.
// Usage: node e2e/bot.mjs
import { launch, pageUrl } from "./pw.mjs";
const browser = await launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
await page.goto(pageUrl("?test"));
await page.waitForFunction(() => window.__ct);
const SEEDS = 60;
const res = await page.evaluate(SEEDS => {
  const out = {};
  for (const ch of [1, 2]) for (const pol of ["good", "turtle", "idle"]) for (let n = 1; n <= 5; n++) {
    const r = { won: 0, why: {}, power: 0 };
    for (let s = 1; s <= SEEDS; s++) { const x = __ct.sim(n, pol, s, undefined, ch); if (x.won) { r.won++; r.power += x.power; } else r.why[x.over] = (r.why[x.over] || 0) + 1; }
    out[`c${ch}${pol}${n}`] = r;
  }
  let max = 0; for (let s = 1; s <= 80; s++) if (__ct.sim(6, "good", s, [20, 20, 20, 20], 2).won) max++;
  out.c2max = max;
  return out;
}, SEEDS);
await browser.close();
let fail = 0;
const need = (cond, msg) => { console.log(`${cond ? "ok  " : "FAIL"} ${msg}`); if (!cond) fail++; };
const KILLERS = { 1: ["bop", "pip", "rat", "zoom"], 2: ["bop", "gulp", "hue", "lumi"] };
for (const ch of [1, 2]) {
  const r = k => res[`c${ch}${k}`], C = `Ch${ch}`;
  for (const n of [1, 2, 3, 4]) need(r(`good${n}`).won >= SEEDS * 0.95, `${C}: careful player survives Night ${n} (${r(`good${n}`).won}/${SEEDS}, ~${Math.round(r(`good${n}`).power / Math.max(1, r(`good${n}`).won))}% power left)`);
  need(r("good5").won >= SEEDS * 0.8, `${C}: careful player usually survives Night 5 (${r("good5").won}/${SEEDS}, ~${Math.round(r("good5").power / Math.max(1, r("good5").won))}% power left)`);
  for (const n of [4, 5]) need(r(`turtle${n}`).won <= SEEDS * 0.1, `${C}: shutting the door(s) all night runs out of power on Night ${n} (${r(`turtle${n}`).won}/${SEEDS} survived)`);
  need(r("idle1").won <= SEEDS * 0.1, `${C}: doing nothing loses Night 1 (${r("idle1").won}/${SEEDS} survived)`);
  const killers = Object.assign({}, r("idle3").why, r("idle5").why);
  for (const w of KILLERS[ch]) need(killers[w] > 0, `${C}: ${w} can catch an idle player`);
}
console.log(`info Ch2 all-20s Custom Night: the bot wins ${res.c2max}/80`);
need(errors.length === 0, `no page errors ${errors.join(" | ")}`);
process.exit(fail ? 1 : 0);
