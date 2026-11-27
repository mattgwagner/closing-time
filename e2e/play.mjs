// A real mouse-and-keyboard playthrough at 1920x1080 (a kid's desktop): title, how to play, Night 1 with the old
// guard's message, every office control by mouse and by key, all nine cameras with someone on them, each scare and
// its game-over tip, a power-out, dawn and the next night, pause, Custom Night, and a 1366x768 fit check. Then the same
// for Chapter 2 (Starlite Cinema): chapter picker, separate saves, the booth controls, all nine cameras and each scare.
// Screenshots go to shots/. Usage: node e2e/play.mjs
import { launch, pageUrl } from "./pw.mjs";
import { mkdirSync } from "node:fs";
mkdirSync(new URL("../shots/", import.meta.url), { recursive: true });
const shot = (page, name) => page.screenshot({ path: new URL(`../shots/${name}.png`, import.meta.url).pathname });
const browser = await launch();
const errors = [];
let step = "start";
const ok = (cond, msg) => { if (!cond) throw new Error(`[${step}] ${msg}`); };
const F = (page, fn, arg) => page.evaluate(fn, arg);
const S = (page, fn) => page.evaluate(`(() => { const S = __ct.S; ${fn} })()`);

async function open(vp, save) {
  const page = await browser.newPage({ viewport: vp });
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(pageUrl("?test&seed=7"));
  await page.evaluate(s => { localStorage.removeItem("closingtime.test"); if (s) localStorage.setItem("closingtime.test", JSON.stringify(s)); }, save);
  await page.goto(pageUrl("?test&seed=7"));
  await page.waitForFunction(() => window.__ct);
  return page;
}
const on = (page, id) => page.locator(id).evaluate(b => b.classList.contains("on"));

try {
  const page = await open({ width: 1920, height: 1080 });
  step = "title";
  ok(await page.isVisible("#title"), "title shows");
  ok(!(await page.locator("#bCustom").isDisabled()), "Custom Night open on a fresh save");
  await page.click("#bCustom");
  ok((await page.locator(".card .lv").allTextContents()).join() === "3,0,0,0", "fresh save starts Custom at Night 1 levels");
  ok((await page.textContent("#custom")).includes("How to play"), "custom screen points to How to play");
  await page.click("#cBack");
  ok((await page.textContent("#bCont")).includes("Night 1"), "start button says Night 1");
  await page.waitForTimeout(300);
  await shot(page, "01-title");
  await page.click("#bHow");
  ok(await page.isVisible("#how"), "how to play shows");
  await shot(page, "02-how");
  await page.click("#howBack");
  await page.click("#bSoft");
  ok((await page.textContent("#bSoft")).includes("ON"), "less scary toggles on");
  await page.click("#bSoft");

  step = "night 1";
  await page.click("#bCont");
  ok(await F(page, () => __ct.G.mode) === "play", "playing");
  ok(await F(page, () => __ct.S.night) === 1, "night 1");
  await page.waitForSelector("#msg:not([hidden])", { timeout: 4000 });
  await page.waitForTimeout(2500);
  ok((await page.textContent("#msgText")).startsWith("Hey, new guard"), "old guard's message types out");
  await shot(page, "03-night1-call");
  await page.click("#msgOk");
  ok(await page.isHidden("#msg"), "message dismissed");

  step = "office controls";
  await page.click("#bLightL");
  ok(await S(page, "return S.lightL"), "left light on by mouse");
  await page.click("#bLightR");
  ok(await S(page, "return S.lightR && !S.lightL"), "one hall light at a time");
  await page.keyboard.press("KeyD");
  ok(await S(page, "return !S.lightR"), "D turns the right light off");
  for (const [id, key, k] of [["#bDoorL", "KeyQ", "doorL"], ["#bDoorR", "KeyE", "doorR"], ["#bVent", "KeyS", "hatch"], ["#bWin", "KeyW", "winLight"]]) {
    await page.click(id);
    ok(await S(page, `return S.${k}`) && await on(page, id), `${k} on by mouse and button lit`);
    await page.keyboard.press(key);
    ok(!(await S(page, `return S.${k}`)), `${key} toggles ${k} off`);
  }
  await page.click("#bDoorL"); await page.click("#bVent");
  await S(page, "S.power = 100;");
  const p0 = await S(page, "return S.power");
  await page.waitForTimeout(1000);
  const used = p0 - await S(page, "return S.power");
  ok(used > 0.15 && used < 0.4, `closed door + hatch drain power faster (${used.toFixed(2)}%/s)`);
  await page.click("#bDoorL"); await page.click("#bVent");

  step = "office with visitors";
  await S(page, "S.ai = [0,0,0,0]; S.bop.i = 4; S.pip.i = 3; S.rat.i = 2; S.lightL = true;");
  await page.waitForTimeout(400);
  await shot(page, "04-office-visitors");
  await S(page, "S.winLight = true; S.lightL = false;");
  await page.waitForTimeout(300);
  await shot(page, "05-office-window-light");
  await S(page, "S.winLight = false; S.doorL = true; S.doorR = true; S.hatch = true; S.bop.i = 0; S.pip.i = 0; S.rat.i = 0;");
  await page.waitForTimeout(500);
  await shot(page, "06-office-shut");
  await page.click("#bDoorL"); await page.click("#bDoorR"); await page.click("#bVent");

  step = "cameras";
  await page.keyboard.press("Space");
  ok(await S(page, "return S.cams") && await page.isVisible("#camMap"), "Space raises the tablet");
  ok(await page.isHidden("#bDoorL"), "office buttons hidden behind the tablet");
  ok(await page.locator("#camMap button").count() === 9, "nine cameras on the map");
  const setups = {
    1: "S.bop.i = 0;", 2: "S.pip.i = 1;", 3: "S.bop.i = 1;", 4: "S.zoom.st = 1;", 5: "S.bop.i = 3;",
    6: "S.zoom.st = 3; S.zoom.runT = 2;", 7: "S.bop.i = 2;", 8: "S.pip.i = 2;", 9: "S.rat.i = 1;",
  };
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await S(page, setups[n]);
    if (n % 2) await page.click(`#camMap button[data-cam="${n}"]`); else await page.keyboard.press(`Digit${n}`);
    ok(await S(page, "return S.cam") === n, `cam ${n} selected`);
    await page.waitForTimeout(150);
    await shot(page, `07-cam${n}`);
  }
  await S(page, "S.zoom.st = 2;");
  await page.click('#camMap button[data-cam="4"]'); await page.waitForTimeout(150);
  await shot(page, "07-cam4-out");
  await page.click("#bCam");
  ok(!(await S(page, "return S.cams")), "tablet down by mouse");
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyE");
  ok(await S(page, "return !S.cams && S.doorR"), "E with the tablet up drops it and shuts the right door");
  await page.keyboard.press("KeyE");

  step = "bopper scare";
  await S(page, "S.zoom.st = 0; S.rat.i = 0; S.pip.i = 0; S.ai = [3,0,0,0]; S.bop.i = 4; S.bop.doorT = 99; S.doorL = false;");
  await page.waitForTimeout(250);
  await shot(page, "08-scare-bopper");
  await page.waitForSelector("#over:not([hidden])", { timeout: 4000 });
  ok((await page.textContent("#overT")).includes("Bopper got you"), "game over names Bopper");
  ok((await page.textContent("#overTip")).includes("LEFT LIGHT"), "tip tells you what to do");
  await shot(page, "09-over");

  step = "door saves you";
  await page.click("#oRetry");
  ok(await F(page, () => __ct.G.mode) === "play", "retry starts the night again");
  await page.click("#msgOk").catch(() => {});
  await S(page, "S.bop.i = 4; S.bop.doorT = 0;");
  await page.click("#bDoorL");
  await S(page, "S.bop.doorT = 99;");
  await page.waitForTimeout(200);
  ok(await S(page, "return !S.over && S.bop.i === 1"), "shut door sends Bopper back");

  step = "other scares";
  for (const [who, setup, tip] of [
    ["Pippa", "S.ai = [0,5,0,0]; S.pip.i = 3; S.pip.winT = 99;", "WINDOW LIGHT"],
    ["Rattles", "S.ai = [0,0,5,0]; S.rat.i = 2; S.rat.nearT = 99;", "VENT HATCH"],
    ["Zoom", "S.ai = [0,0,0,5]; S.zoom.st = 3; S.zoom.runT = 99;", "RIGHT DOOR"],
  ]) {
    await S(page, "S.doorL = S.doorR = S.hatch = S.winLight = false;");
    await S(page, setup);
    await page.waitForTimeout(260);
    await shot(page, `10-scare-${who.toLowerCase()}`);
    await page.waitForSelector("#over:not([hidden])", { timeout: 4000 });
    ok((await page.textContent("#overT")).includes(`${who} got you`), `${who} catches you`);
    ok((await page.textContent("#overTip")).includes(tip), `${who} tip`);
    await page.click("#oRetry");
  }

  step = "zoom bangs";
  await S(page, "S.ai = [0,0,0,5]; S.zoom.st = 3; S.zoom.runT = 0; S.power = 80;");
  await page.click("#bDoorR");
  await S(page, "S.zoom.runT = 99;");
  await page.waitForTimeout(200);
  ok(await S(page, "return !S.over && S.zoom.st < 3 && S.power < 78"), "shut right door: Zoom bangs and it costs power");

  step = "pause";
  await page.keyboard.press("Escape");
  ok(await page.isVisible("#pause"), "Esc pauses");
  const tp = await S(page, "return S.t");
  await page.waitForTimeout(500);
  ok(await S(page, "return S.t") === tp, "time stops while paused");
  await page.click("#pRes");
  ok(await F(page, () => __ct.G.mode) === "play", "resumed");

  step = "power out";
  await S(page, "S.ai = [0,0,0,0]; S.power = 0.01; S.doorL = true;");
  await page.waitForTimeout(3500);
  ok(await S(page, "return !!S.out && !S.doorL"), "power out opens the doors");
  ok(await page.locator("#bDoorL").isDisabled(), "buttons dead in the dark");
  await shot(page, "11-power-out");
  await S(page, "S.out.kill = 0;");
  await page.waitForSelector("#over:not([hidden])", { timeout: 4000 });
  ok((await page.textContent("#overTip")).includes("power ran out"), "power tip");

  step = "dawn";
  await page.click("#oRetry");
  await page.click("#msgOk").catch(() => {});
  await S(page, "S.ai = [0,0,0,0]; S.t = __ct.NIGHT_LEN - 0.5;");
  await page.waitForTimeout(1600);
  await shot(page, "12-dawn");
  await page.waitForSelector("#won:not([hidden])", { timeout: 6000 });
  ok((await page.textContent("#wonT")).includes("Night 1 complete"), "night 1 complete");
  await shot(page, "13-won");
  ok(await F(page, () => JSON.parse(localStorage.getItem("closingtime.test")).night) === 2, "progress saved");
  await page.click("#wNext");
  ok(await S(page, "return S.night") === 2, "night 2 starts");
  await page.keyboard.press("Escape"); await page.click("#pQuit");
  ok((await page.textContent("#bCont")).includes("Night 2"), "title continues at Night 2");

  step = "less scary";
  await page.click("#bSoft");
  await page.click("#bCont");
  await page.click("#msgOk").catch(() => {});
  await S(page, "S.ai = [5,0,0,0]; S.bop.i = 4; S.bop.doorT = 99;");
  await page.waitForTimeout(250);
  await shot(page, "14-soft-warning");
  await page.waitForTimeout(700);
  await shot(page, "15-soft-scare");
  await page.waitForSelector("#over:not([hidden])", { timeout: 4000 });
  await page.close();

  step = "week beaten → custom night";
  const p2 = await open({ width: 1920, height: 1080 }, { night: 5, beat: false });
  await p2.click("#bCont");
  await p2.click("#msgOk").catch(() => {});
  await S(p2, "S.ai = [0,0,0,0]; S.t = __ct.NIGHT_LEN - 0.2;");
  await p2.waitForSelector("#won:not([hidden])", { timeout: 6000 });
  ok((await p2.textContent("#wonT")).includes("whole week"), "week beaten screen");
  ok(await p2.isHidden("#wNext"), "no next night after 5");
  await p2.click("#wTitle");
  ok(!(await p2.locator("#bCustom").isDisabled()), "Custom Night unlocked");
  ok((await p2.textContent("#stars")).includes("Survived the week"), "star shows");
  await p2.click("#bCustom");
  ok(await p2.locator(".card").count() === 4, "four cards");
  await p2.locator(".card").nth(0).locator('button[data-d="1"]').click();
  ok((await p2.locator(".card .lv").nth(0).textContent()) === "6", "plus raises a level");
  await p2.click('.preset[data-v="20"]');
  ok((await p2.locator(".card .lv").allTextContents()).every(v => v === "20"), "All 20 preset");
  await shot(p2, "16-custom");
  await p2.click('.preset[data-v="5"]');
  await p2.click("#cGo");
  ok(await S(p2, "return S.ai.join()") === "5,5,5,5", "custom levels used");
  ok(await p2.isHidden("#msg"), "no phone call on Custom Night");
  await S(p2, "S.t = __ct.NIGHT_LEN - 0.2;");
  await p2.waitForSelector("#won:not([hidden])", { timeout: 6000 });
  ok((await p2.textContent("#wonT")).includes("Custom Night beaten"), "custom win");
  await p2.click("#wTitle");
  await p2.click("#bNew");
  ok((await p2.textContent("#bNew")).includes("Click again") && await p2.isVisible("#title"), "New game asks first");
  ok(await F(p2, () => JSON.parse(localStorage.getItem("closingtime.test")).night) === 5, "progress kept after one click");
  await p2.click("#bNew");
  ok(await S(p2, "return S.night") === 1, "second click starts over at Night 1");
  step = "pause during the ring";
  await p2.keyboard.press("Escape");
  await p2.waitForTimeout(2200);
  ok(await p2.isHidden("#msg"), "no call while paused");
  await p2.click("#pRes");
  await p2.waitForSelector("#msg:not([hidden])", { timeout: 2000 });
  await p2.close();

  step = "chapter 2: picker";
  const c = await open({ width: 1920, height: 1080 }, { night: 3, beat: false });
  ok(await on(c, "#bCh1") && !(await on(c, "#bCh2")), "Chapter 1 picked on an old save");
  ok((await c.textContent("#bCont")).includes("Night 3"), "Chapter 1 continues at Night 3");
  await c.click("#bCh2");
  ok(await on(c, "#bCh2"), "Chapter 2 picked");
  ok((await c.textContent("#bCont")).includes("Start: Night 1"), "Chapter 2 starts at Night 1 with its own progress");
  ok((await c.textContent("#tSub")).includes("Starlite Cinema"), "Chapter 2 subtitle");
  await c.waitForTimeout(300);
  await shot(c, "20-ch2-title");
  await c.click("#bHow");
  const how = await c.textContent("#howWho");
  ok(["Gulp", "Hue", "Lumi", "POPCORN", "PROJECTOR"].every(w => how.includes(w)), "Chapter 2 how to play");
  await shot(c, "21-ch2-how");
  await c.click("#howBack");

  step = "chapter 2: night 1";
  await c.click("#bCont");
  ok(await S(c, "return S.ch === 2 && S.night === 1 && S.ai.join() === '3,0,0,0'"), "Chapter 2 Night 1 levels");
  await c.waitForSelector("#msg:not([hidden])", { timeout: 4000 });
  await c.waitForTimeout(2500);
  ok((await c.textContent("#msgText")).startsWith("Hey, it's me again"), "the old guard calls again");
  await c.click("#msgOk");
  for (const id of ["#bDoorR", "#bLightR", "#bWin", "#bVent"]) ok(await c.isHidden(id), `${id} not in the booth`);
  for (const id of ["#bDoorL", "#bLightL", "#bFeed", "#bLamp", "#bHue0", "#bHue1", "#bHue2"]) ok(await c.isVisible(id), `${id} in the booth`);
  ok(await on(c, "#bLamp"), "projector starts on");
  await c.click("#bLamp");
  ok(!(await S(c, "return S.lamp")), "projector off by mouse");
  await c.keyboard.press("KeyS");
  ok(await S(c, "return S.lamp"), "S turns the projector back on");
  await c.keyboard.press("KeyQ");
  ok(await S(c, "return S.doorL"), "Q shuts the left door");
  await c.keyboard.press("KeyQ");
  await c.keyboard.press("KeyE");
  ok(await S(c, "return S.power < 99"), "popcorn with nobody there costs power");
  await c.waitForTimeout(150);
  ok((await c.textContent("#cap")).includes("rolled away"), "caption says the popcorn was wasted");

  step = "chapter 2: visitors";
  await S(c, "S.ai = [0,0,0,0]; S.power = 100; S.bop.i = 4; S.gulp.i = 3; S.hue.i = 2; S.hue.col = 0; S.lightL = true;");
  await c.waitForTimeout(400);
  await shot(c, "22-ch2-office-visitors");
  await S(c, "S.ai = [0,0,0,1]; S.lightL = false; S.lumi.i = 2; S.lumi.lampT = 0; S.bop.i = 0;");
  await c.waitForTimeout(300);
  await shot(c, "23-ch2-office-lumi");
  await S(c, "S.lamp = false;");
  await c.waitForTimeout(300);
  await shot(c, "24-ch2-office-dark");
  await c.waitForTimeout(2300);
  ok(await S(c, "return S.lumi.i === 0"), "Lumi leaves after a couple of seconds in the dark");
  await S(c, "S.lamp = true;");
  await c.keyboard.press("KeyG");
  await c.waitForTimeout(150);
  ok(await S(c, "return S.hue.i === 2 && S.hue.winT >= 2.5"), "wrong colour keeps Hue there and brings her closer");
  ok((await c.textContent("#cap")).includes("Wrong color"), "wrong colour caption");
  await c.click("#bHue0");
  ok(await S(c, "return S.hue.i === 0"), "matching colour sends Hue away");
  await c.click("#bFeed");
  ok(await S(c, "return S.gulp.i === 0"), "popcorn sends Gulp back from the chute");
  await S(c, "S.gulp.i = 2;");
  await c.keyboard.press("Space");
  await c.keyboard.press("KeyE");
  ok(await S(c, "return !S.cams && S.gulp.i === 0"), "E with the tablet up drops it and tosses popcorn at Gulp on the Aisle");

  step = "chapter 2: cameras";
  await c.keyboard.press("Space");
  ok((await c.textContent('#camMap button[data-cam="6"]')).includes("The Aisle"), "camera map uses the cinema names");
  const setups2 = {
    1: "S.bop.i = 0;", 2: "S.gulp.i = 1; S.hue.i = 1;", 3: "S.bop.i = 1;", 4: "S.gulp.i = 0;", 5: "S.bop.i = 3;",
    6: "S.gulp.i = 2;", 7: "S.bop.i = 2;", 8: "S.hue.i = 0;", 9: "S.lumi.i = 1;",
  };
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await S(c, setups2[n]);
    await c.click(`#camMap button[data-cam="${n}"]`);
    await c.waitForTimeout(150);
    await shot(c, `25-ch2-cam${n}`);
  }
  await c.click("#bCam");

  step = "chapter 2: scares";
  for (const [who, setup, tip] of [
    ["Gulp", "S.ai = [0,5,0,0]; S.gulp.i = 3; S.gulp.chuteT = 99;", "POPCORN"],
    ["Hue", "S.ai = [0,0,5,0]; S.hue.i = 2; S.hue.col = 2; S.hue.winT = 99;", "matches"],
    ["Lumi", "S.ai = [0,0,0,5]; S.lumi.i = 2; S.lumi.lampT = 99;", "PROJECTOR off"],
    ["Bopper", "S.ai = [5,0,0,0]; S.bop.i = 4; S.bop.doorT = 99; S.doorL = false;", "LEFT LIGHT"],
  ]) {
    await S(c, "S.gulp.i = 0; S.hue.i = 0; S.lumi.i = 0; S.bop.i = 0;");
    await S(c, setup);
    await c.waitForTimeout(260);
    await shot(c, `26-ch2-scare-${who.toLowerCase()}`);
    await c.waitForSelector("#over:not([hidden])", { timeout: 4000 });
    ok((await c.textContent("#overT")).includes(`${who} got you`), `${who} catches you`);
    ok((await c.textContent("#overTip")).includes(tip), `${who} tip`);
    await c.click("#oRetry");
    await c.click("#msgOk").catch(() => {});
  }

  step = "chapter 2: dawn and saves";
  await S(c, "S.ai = [0,0,0,0]; S.t = __ct.NIGHT_LEN - 0.2;");
  await c.waitForSelector("#won:not([hidden])", { timeout: 6000 });
  const sv = await F(c, () => JSON.parse(localStorage.getItem("closingtime.test")));
  ok(sv.c2.night === 2 && sv.night === 3, "Chapter 2 progress saved without touching Chapter 1");
  await c.click("#wTitle");
  ok((await c.textContent("#bCont")).includes("Night 2"), "Chapter 2 continues at Night 2");
  await c.click("#bCh1");
  ok((await c.textContent("#bCont")).includes("Night 3"), "Chapter 1 still at Night 3");
  await c.click("#bCh2");
  await c.click("#bCustom");
  ok((await c.locator(".card .nm").allTextContents()).join() === "Bopper,Gulp,Hue,Lumi", "Chapter 2 Custom Night cast");
  ok((await c.locator(".card .lv").allTextContents()).join() === "3,0,0,0", "Chapter 2 Custom starts gentle");
  ok((await c.textContent("#customHint")).includes("cinema"), "Chapter 2 custom hint");
  await c.click('.preset[data-v="10"]');
  await shot(c, "27-ch2-custom");
  await c.click("#cGo");
  ok(await S(c, "return S.ch === 2 && S.ai.join() === '10,10,10,10'"), "Chapter 2 custom levels used");
  await S(c, "S.t = __ct.NIGHT_LEN - 0.2;");
  await c.waitForSelector("#won:not([hidden])", { timeout: 6000 });
  ok((await c.textContent("#wonP")).includes("Gulp 10"), "custom win lists the Chapter 2 cast");
  ok(await F(c, () => JSON.parse(localStorage.getItem("closingtime.test")).c2.custom === true), "Chapter 2 custom star saved");
  await c.close();

  step = "chapter 2: 1366x768";
  const c3 = await open({ width: 1366, height: 768 }, { ch: 2 });
  ok(await on(c3, "#bCh2"), "remembers Chapter 2");
  await c3.click("#bCont");
  await c3.click("#msgOk").catch(() => {});
  for (const id of ["#bDoorL", "#bFeed", "#bLamp", "#bHue0", "#bHue2", "#bCam"]) {
    const bb = await c3.locator(id).boundingBox();
    ok(bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.width <= 1366 && bb.y + bb.height <= 768, `${id} on screen`);
  }
  await shot(c3, "28-ch2-small");
  await c3.close();

  step = "1366x768";
  const p3 = await open({ width: 1366, height: 768 });
  await p3.click("#bCont");
  await p3.click("#msgOk").catch(() => {});
  for (const id of ["#bDoorL", "#bLightR", "#bCam", "#bPause"]) {
    const bb = await p3.locator(id).boundingBox();
    ok(bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.width <= 1366 && bb.y + bb.height <= 768, `${id} on screen`);
  }
  await shot(p3, "17-small");
  await p3.close();
  const p4 = await open({ width: 1366, height: 768 });
  await p4.click("#bCustom");
  for (const id of ["#cGo", "#cBack"]) {
    const bb = await p4.locator(id).boundingBox();
    ok(bb && bb.y + bb.height <= 768, `custom ${id} on screen at 1366x768`);
  }
  await shot(p4, "18-custom-small");
  await p4.close();

  ok(errors.length === 0, "no page errors: " + errors.join(" | "));
  console.log("play: all good");
} catch (e) {
  console.error(e.message);
  console.error(errors.join("\n"));
  process.exitCode = 1;
} finally {
  await browser.close();
}
