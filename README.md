# Closing Time

An original night-guard survival game. You're the night guard at Rollaway Rink after closing, and the skate band
robots wander around until 6 AM. Watch the cameras, shut the doors, keep the power up, and get through five nights.
Then there's a Custom Night. Everything is original: the rink, Bopper the hippo DJ, Pippa the skating doll, Rattles the robot raccoon and
Zoom the roller-derby cheetah. A **Less scary** toggle on the title screen softens the jumpscares.

**Chapter 2** (pick it on the title screen, open from the start) moves the night shift to the **Starlite Cinema**: five
more nights and a Custom Night, with its own saved progress. Bopper comes back in 3D glasses and works the same left
door. Three new ones each bring a move that isn't a door:

- **Gulp**, a pelican usher, waddles down the Aisle (Cam 6) to the popcorn chute. POPCORN sends him back if he's on the
  Aisle or at the chute; popcorn with nobody there costs 2% power.
- **Hue**, a chameleon, shows up at the window glowing red, green or blue. The matching color button sends her back, and
  a wrong one cuts her wait by 2.5 s. Her color only shows while the PROJECTOR is on.
- **Lumi**, a glow moth, comes down from the Rafters (Cam 9) faster while the light or the tablet is on. At the projector
  she leaves after 2 s with the projector, the light and the tablet all off.

The projector is the tension: Hue needs it on, Lumi needs it off.

## Run it

- `bun server.ts` (or `npm start`) serves it on http://127.0.0.1:4857
- `npm run check` runs both gates. If Chromium closes itself on launch, run `TMPDIR=$HOME/.cache/pw-tmp npm run check`.
- Deploy: `npx -y wrangler@4 deploy`, then compare `sha256sum public/index.html` with `curl -s https://closing-time.mattgwagner.workers.dev | sha256sum`.

## Controls

Every action is a button on screen. Keys are optional (an office key while the tablet is up drops it first): `Q`/`E` left and right door, `A`/`D` left and right hall light,
`W` window light, `S` vent hatch, `Space` cameras, `1`–`9` pick a camera, `Esc`/`P` pause.
Chapter 2: `Q` door, `A` light, `E` popcorn, `S` projector, `R`/`G`/`B` Hue's colors.

## How it's built

Everything is in `public/index.html`: Canvas 2D and Web Audio, no image or audio files. The stage is a fixed
1600×900 scaled to fit the window, and the menus and controls are DOM buttons on top of the canvas.

- **The rules** (`newNight`, `step`) are pure logic with no DOM, driven by a seeded random number generator, so the bot can
  simulate whole nights. A night is 6 × `HOUR` (45 s). Each character gets a movement chance on its own clock and moves
  when `rnd() * 20 < level`. `NIGHTS` holds the levels for Nights 1–5.
  - **Bopper:** walks Stage → Snack Bar → Skate Rental → West Hall → the left door, waits `bopWait`, then leaves if the door
    is shut.
  - **Pippa:** moves only while her current camera isn't being watched. At the window, 2.2 s of window light sends her back.
  - **Rattles:** crawls the vent in three stages. At the grate, the hatch has to be shut when his wait runs out.
  - **Zoom:** rolls up the Pit Stop garage door when Cam 4 goes unwatched. Watching it holds him for a moment.
    At stage 3 he races the East Hall. A shut right door makes him bang, which costs power.
- **Power** drains `DRAIN × usage` per second, where usage is 1 plus one for each door, hall light, window light, hatch
  and the tablet. At 0 the doors open, the music box plays, and Bopper comes in unless 6 AM gets there first.
- **Sound cues** have captions, so the game can be played muted.
- **Chapter 2** runs on the same `step`: `S.ch` picks the cast (`step2`, `feed`, `paint`), `NIGHTS2`, a per-night
  `DRAIN2` (0.13 on Night 1 up to 0.2, so leaving the one door shut all week runs dry), `SCENES2`, `drawOffice2`. Bopper's
  logic (`bopStep`) is shared. Everything that differs on screen (names, calls, tips, how to play, controls, keys) is in `CH`.
- **Saves:** `closingtime.v1` holds `{night, beat, custom, max, soft, ch, c2: {night, beat, custom, max}}`. Chapter 1
  progress stays at the top level so older saves keep working. `?test` uses `closingtime.test`, exposes `window.__ct`,
  and `?seed=N` makes a run repeatable.

## Tests

- `e2e/bot.mjs`: the balance gate, run for both chapters. A careful bot player (it reacts only to what you can see or hear, with human
  reaction times) has to survive Nights 1–4 at least 95% of the time and Night 5 at least 80%. Shutting everything all
  night has to run out of power on Nights 4–5. Doing nothing has to lose Night 1, and every character has to be able to
  catch you.
- `e2e/play.mjs`: a real mouse-and-keyboard playthrough at 1920×1080. It covers the title, how to play, the old guard's call,
  every office control by mouse and by key, all nine cameras, each character's scare and its tip, door saves, Zoom's
  bang, pause, a power-out, dawn and progress saving, Less scary, beating the week, Custom Night, and a 1366×768 fit check. Then Chapter 2: the chapter picker and separate
  saves, the booth controls, Hue's right and wrong colors, Lumi leaving in the dark, popcorn on the Aisle, all nine cinema
  cameras, each scare and tip, Custom Night and the 1366×768 fit.
  Screenshots go to `shots/`.
