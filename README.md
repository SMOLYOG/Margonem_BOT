# Margonem Bot

Tampermonkey userscript for [Margonem.pl](https://margonem.pl) — automatic mob farming, multi-step route chains, and auto heal.  
Supports both **old interface (SI)** and **new interface (NI)**.

---

## Quick Install

1. Install **Tampermonkey** — [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/pl/firefox/addon/tampermonkey/)
2. Click **Install Script** below and confirm in Tampermonkey:

   > [`release/MargonemBot.user.js`](https://raw.githubusercontent.com/SMOLYOG/Margonem_BOT/main/release/MargonemBot.user.js)

3. Open Margonem.pl — the bot panel appears in the top-right corner.

Modules are loaded automatically from GitHub on every run. Updates apply instantly without reinstalling.

---

## Features

| Mode | Description |
|------|-------------|
| **Farm** | Attack mobs filtered by level range or name. Optional auto-gateway when the map is clear. |
| **Route** | Multi-step chain — define mobs + exit gateway per map, bot loops indefinitely. Auto-restarts after page reload. |
| **Heal** | Use a healing item from inventory automatically when HP drops below a configurable threshold. |

---

## Farm

1. Go to the **Farm** tab
2. Set optional filters: min/max mob level, mob name
3. Optionally enable **Auto-gateway** and enter part of the gateway name
4. Click **▶ Start**

---

## Route

Define a chain of maps — the bot kills mobs on each map, crosses the gateway, and continues to the next step in a loop.

### Setup:

1. Go to the first map, open the **Route** tab
2. Click **Skanuj moby** → check the mobs to kill
3. Click **Skanuj bramy** → pick the exit gateway
4. Click **+ Dodaj etap**
5. Manually walk to the next map and repeat steps 2–4
6. Click **▶ Start**

### Passthrough step (no combat):

Leave mobs unchecked, select only a gateway, and click **+ Dodaj etap** — appears as `⚡ przejście`.

### Example route:

```
#1  Żuk, Kruk       →  Jaskinia Rozpaczy
#2  ⚡ przejście    →  Równina Wschodnia
#3  Bandyta, Rycerz →  Powrót do Miasta
```

The bot restarts from step #1 and loops indefinitely.  
After each gateway the page reloads — the bot **resumes automatically** at the correct step.

---

## Heal

1. Open the **Heal** tab
2. Click the healing item slot in the inventory panel
3. Set the HP threshold (default 30%)
4. Click **Zapisz ustawienia**

Heal runs in the background regardless of farm/route mode.

---

## Project Structure

```
release/
├── MargonemBot.user.js   ← install this in Tampermonkey
└── modules/
    ├── config.js
    ├── storage.js
    ├── adapter.js
    ├── bot.js
    ├── ui.js
    ├── inventory.js
    ├── combat.js
    ├── heal.js
    ├── farm.js
    ├── route.js
    └── captcha.js

modules/                  ← development source
```

---

## Known Limitations

- **Auto-CAPTCHA** — in development, not available in this release
- Bot requires the game tab to be active (browser cannot be minimized)
- NI (new interface): Farm and Heal work; Route is in testing

---

## Version

`1.0.0` — Farm · Route · Heal | Auto-CAPTCHA: coming soon
