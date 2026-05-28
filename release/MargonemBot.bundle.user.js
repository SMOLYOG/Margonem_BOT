// ==UserScript==
// @name         Margonem Bot (bundle)
// @namespace    https://github.com/SMOLYOG/Margonem_BOT
// @version      1.1.0
// @description  Auto farm | Wieloetapowy Route | Auto Heal | Auto CAPTCHA | SI + NI
// @author       SMOLYOG
// @match        https://*.margonem.pl/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (document.getElementById('mbot-root')) return;

    // ═══════════════════════════════════════════════════════ config ══
    window.MBot = window.MBot || {};

    MBot.config = {
        FORBIDDEN_MOBS: [
            "Silny jeleń", "Weszo",
            "Rumianek", "Lawenda", "Pokrzywa", "Mniszek", "Tymianek", "Szałwia"
        ],
        TICK_MS: 400,
        HEAL_COOLDOWN_MS: 2000,
        ATTACK_COOLDOWN_MS: 1500,
        STORAGE_KEY: "margonem_bot_v8"
    };

    // ═══════════════════════════════════════════════════════ storage ══
    MBot.storage = (() => {
        const KEY = MBot.config.STORAGE_KEY;

        const DEFAULTS = {
            healThreshold: 30,
            mobMinLevel: "",
            mobMaxLevel: "",
            mobName: "",
            healItemId: null,
            botMode: null,
            gatewayEnabled: false,
            gatewayDest: "",
            routeSteps: [],
            routeCurrentStep: 0,
            captchaEnabled: 1
        };

        function load() {
            try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
            catch { return {}; }
        }

        return {
            get(key) {
                const stored = load();
                return key in stored ? stored[key] : (DEFAULTS[key] ?? null);
            },
            set(key, value) {
                const data = load();
                data[key] = value;
                localStorage.setItem(KEY, JSON.stringify(data));
            },
            setMany(obj) {
                const data = load();
                Object.assign(data, obj);
                localStorage.setItem(KEY, JSON.stringify(data));
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ adapter ══
    MBot.adapter = (() => {
        const IFACE = document.getElementById('GAME_CANVAS') ? 'ni' : 'si';

        function extractNameFromTip(tip) {
            if (!tip) return null;
            const tmp = document.createElement('div');
            tmp.innerHTML = tip;
            const nameEl = tmp.querySelector('.tip-item-stat-item-name');
            if (nameEl) return nameEl.textContent.trim();
            const b = tmp.querySelector('b');
            return b ? b.textContent.trim() : null;
        }

        return {
            IFACE,
            isNI: IFACE === 'ni',
            isSI: IFACE === 'si',
            extractNameFromTip,

            readHP() {
                if (IFACE === 'ni') {
                    try {
                        const { hp, maxhp } = Engine.hero.d.warrior_stats;
                        if (!maxhp) return null;
                        return Math.round((hp / maxhp) * 100);
                    } catch { return null; }
                }
                const life1 = document.getElementById('life1');
                if (!life1) return null;
                const match = (life1.getAttribute('tip') || '').match(/([\d\s]+)\s*\/\s*([\d\s]+)/);
                if (!match) return null;
                const current = parseInt(match[1].replace(/\s/g, ''));
                const max     = parseInt(match[2].replace(/\s/g, ''));
                if (!max || isNaN(current)) return null;
                return Math.round((current / max) * 100);
            },

            useItem(itemId) {
                if (IFACE === 'ni') {
                    window._g(`moveitem&st=1&id=${itemId}`);
                    return;
                }
                if (typeof moveItemSafe === 'function') {
                    moveItemSafe(itemId, 'st=1');
                } else {
                    const el = document.getElementById('item' + itemId);
                    if (el) $(el).trigger('dblclick');
                }
            },

            itemExists(itemId) {
                if (IFACE === 'ni') {
                    try {
                        return Engine.items.fetchLocationItems('g').some(i => String(i.id) === String(itemId));
                    } catch { return false; }
                }
                return !!(window.g?.item?.[itemId]);
            },

            getInventoryItems() {
                if (IFACE === 'ni') {
                    try {
                        return Engine.items.fetchLocationItems('g').map(item => ({
                            id: String(item.id),
                            name: item.name,
                            imgSrc: null,
                            amount: item._cachedStats?.amount ?? null,
                            el: null
                        }));
                    } catch { return []; }
                }
                const result = [];
                document.querySelectorAll('div.item[data-type="t_item"]').forEach(el => {
                    const rawId = el.id ? el.id.replace('item', '') : null;
                    const img   = el.querySelector('img');
                    const small = el.querySelector('small');
                    result.push({
                        id: rawId,
                        name: extractNameFromTip(el.getAttribute('tip')),
                        imgSrc: img ? img.src : null,
                        amount: small ? small.textContent.trim() : null,
                        el
                    });
                });
                return result;
            },

            onBattleClose(fn) {
                if (IFACE === 'ni' && window.API?.addCallbackToEvent) {
                    window.API.addCallbackToEvent('close_battle', () => {
                        setTimeout(() => {
                            MBot.bot.inBattle = false;
                            fn();
                        }, 250);
                    });
                }
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ bot ══
    MBot.bot = {
        mode: null,
        intervalId: null,
        healSlotEl: null,
        healItemId: MBot.storage.get("healItemId"),
        healThreshold: MBot.storage.get("healThreshold") ?? 30,
        targetHeroes: [],
        targetElites: [],
        lastHealTime: 0,
        lastAttackTime: 0,
        inBattle: false,
        noMobsTicks: 0,
        transitioning: false,
        banUntil: 0,

        start(mode, fn) {
            this.stop();
            this.mode = mode;
            this.intervalId = setInterval(fn, MBot.config.TICK_MS);
            MBot.storage.set('botMode', mode);
            MBot.ui.setStatus(mode);
        },

        stop() {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.mode = null;
            this.inBattle = false;
            this.noMobsTicks = 0;
            this.transitioning = false;
            MBot.storage.set('botMode', null);
            MBot.ui.setStatus("off");
            MBot.ui.updateHP(null);
        }
    };

    // ═══════════════════════════════════════════════════════ ui ══
    MBot.ui = (() => {
        const CSS = `
        #mbot-root {
            position: fixed; top: 20px; right: 20px; width: 300px;
            background: #1a1a1a; border: 1px solid #3a3a3a; border-radius: 10px;
            z-index: 99999; color: #e0e0e0; font-family: Arial, sans-serif;
            font-size: 12px; box-shadow: 0 6px 24px rgba(0,0,0,0.7); user-select: none;
        }
        #mbot-header {
            background: #111; padding: 8px 12px; display: flex; align-items: center;
            justify-content: space-between; border-radius: 10px 10px 0 0; cursor: grab;
        }
        #mbot-header.minimized { border-radius: 10px; }
        #mbot-header:active { cursor: grabbing; }
        #mbot-header-title { font-weight: bold; font-size: 13px; letter-spacing: 1px; }
        #mbot-header-controls { display: flex; align-items: center; gap: 8px; }
        #mbot-status-dot { font-size: 10px; color: #666; }
        #mbot-minimize {
            background: #2a2a2a; border: 1px solid #444; color: #ccc; border-radius: 4px;
            width: 22px; height: 22px; cursor: pointer; font-size: 13px;
            display: flex; align-items: center; justify-content: center; padding: 0; line-height: 1;
        }
        #mbot-minimize:hover { background: #3a3a3a; }
        #mbot-body { border-top: 1px solid #2a2a2a; }
        #mbot-tabs {
            display: flex; gap: 4px; padding: 8px 8px 0;
            background: #161616; border-bottom: 1px solid #2a2a2a;
        }
        .mbot-tab {
            flex: 1; background: #252525; border: 1px solid #3a3a3a; border-bottom: none;
            color: #999; border-radius: 5px 5px 0 0; padding: 5px 4px; cursor: pointer;
            font-size: 11px; transition: background 0.12s;
        }
        .mbot-tab:hover { background: #333; color: #ccc; }
        .mbot-tab.active { background: #1a1a1a; color: #e0e0e0; border-color: #484848; }
        .mbot-panel { padding: 10px; display: none; }
        .mbot-panel.active { display: block; }
        .mbot-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .mbot-row label { color: #aaa; white-space: nowrap; flex-shrink: 0; }
        .mbot-label { display: block; color: #aaa; margin-bottom: 3px; font-size: 11px; }
        #mbot-root input[type=number], #mbot-root input[type=text] {
            background: #2a2a2a; border: 1px solid #444; color: #e0e0e0;
            border-radius: 4px; padding: 3px 6px; font-size: 11px; flex: 1;
        }
        .mbot-btn-row { display: flex; gap: 6px; margin-top: 8px; }
        .mbot-btn-start {
            flex: 1; background: #1a3a1a; border: 1px solid #3a7a3a; color: #8f8;
            border-radius: 5px; padding: 5px; cursor: pointer; font-size: 11px;
        }
        .mbot-btn-start:hover { background: #2a4a2a; }
        .mbot-btn-stop {
            flex: 1; background: #3a1a1a; border: 1px solid #7a3a3a; color: #f88;
            border-radius: 5px; padding: 5px; cursor: pointer; font-size: 11px;
        }
        .mbot-btn-stop:hover { background: #4a2a2a; }
        .mbot-btn-save {
            flex: 1; background: #1a2a3a; border: 1px solid #3a5a7a; color: #8af;
            border-radius: 5px; padding: 5px; cursor: pointer; font-size: 11px;
        }
        .mbot-btn-save:hover { background: #1a3a4a; }
        #mbot-footer {
            display: flex; justify-content: space-between; align-items: center;
            padding: 5px 10px; background: #111; border-top: 1px solid #2a2a2a;
            border-radius: 0 0 10px 10px; font-size: 10px;
        }
        #mbot-mode-label { color: #666; }
        #mbot-hp-label { color: #888; }
        .mbot-sep { border-top: 1px solid #2a2a2a; margin: 8px 0; }
        #heal-selected {
            background: #2a2a2a; border: 1px solid #444; border-radius: 5px;
            padding: 5px 8px; margin-bottom: 8px; min-height: 32px;
            display: flex; align-items: center; gap: 8px;
        }
        #inv-grid {
            display: grid; grid-template-columns: repeat(5, 50px);
            gap: 4px; margin: 6px 0; max-height: 216px; overflow-y: auto;
        }
        #inv-grid .slot {
            width: 50px; height: 50px; background: #2a2a2a; border: 1px solid #444;
            border-radius: 4px; display: flex; align-items: center; justify-content: center;
            cursor: pointer; position: relative; overflow: hidden;
            transition: border-color 0.12s; box-sizing: border-box;
        }
        #inv-grid .slot:hover { border-color: #888; }
        #inv-grid .slot.selected { border: 2px solid #4caf50; background: #1a2e1a; }
        #inv-grid .slot img { width: 80%; height: 80%; object-fit: contain; pointer-events: none; }
        #inv-grid .slot .amount {
            position: absolute; bottom: 1px; right: 2px; font-size: 9px;
            color: #fff; text-shadow: 0 0 3px #000; pointer-events: none;
        }
        #heal-save-notice { font-size: 10px; color: #4caf50; margin-top: 4px; display: none; }
        #route-mob-list {
            max-height: 110px; overflow-y: auto; background: #222;
            border: 1px solid #3a3a3a; border-radius: 4px;
            padding: 4px 6px; margin-bottom: 4px; min-height: 28px;
        }
        .route-hint { font-size: 10px; color: #555; }
        #route-mob-list label { display:flex; align-items:center; gap:5px; padding:1px 0; cursor:pointer; }
        #route-mob-list input[type=checkbox] { margin:0; cursor:pointer; flex-shrink:0; }
        #route-mob-list span { font-size:10px; color:#ddd; }
        #route-gateway-select {
            width: 100%; background: #2a2a2a; border: 1px solid #444;
            color: #e0e0e0; border-radius: 4px; padding: 3px 6px;
            font-size: 11px; box-sizing: border-box; margin-bottom: 4px;
        }
        #route-steps-list { max-height: 110px; overflow-y: auto; margin-bottom: 4px; min-height: 22px; }
        .route-step {
            display: flex; align-items: center; gap: 4px; padding: 3px 5px;
            border-radius: 3px; margin-bottom: 2px; background: #222;
            border: 1px solid #333; font-size: 10px; color: #ccc;
        }
        .route-step.active-step { border-color: #ffa726; background: #2a1a00; color: #ffd580; }
        .route-step-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .route-step-del {
            background: none; border: none; color: #f55; cursor: pointer;
            font-size: 13px; padding: 0 2px; line-height: 1; flex-shrink: 0;
        }
        #mbot-ban-bar {
            display: none; text-align: center; padding: 3px 8px;
            background: #3a1a1a; color: #f55; font-size: 10px; font-weight: bold;
            border-top: 1px solid #7a3a3a;
        }
        #captcha-toggle { width: 100%; }
        #captcha-toggle.active { background: #1a3a1a; border-color: #3a7a3a; color: #8f8; }
        .captcha-info { font-size: 10px; color: #666; margin-top: 8px; line-height: 1.4; }
        `;

        const HTML = `
        <div id="mbot-root">
            <div id="mbot-header">
                <span id="mbot-header-title">⚔️ Margonem Bot</span>
                <div id="mbot-header-controls">
                    <span id="mbot-status-dot">● OFF</span>
                    <button id="mbot-minimize">─</button>
                </div>
            </div>
            <div id="mbot-body">
                <div id="mbot-tabs">
                    <button class="mbot-tab active" data-tab="farm">🤺 Farm</button>
                    <button class="mbot-tab" data-tab="route">🗺️ Route</button>
                    <button class="mbot-tab" data-tab="heal">💊 Heal</button>
                    <button class="mbot-tab" data-tab="captcha">🔐 CAPTCHA</button>
                </div>
                <div id="mbot-panel-farm" class="mbot-panel active">
                    <div class="mbot-row">
                        <label>Min lvl</label>
                        <input type="number" id="mob-min-level" placeholder="—">
                    </div>
                    <div class="mbot-row">
                        <label>Max lvl</label>
                        <input type="number" id="mob-max-level" placeholder="—">
                    </div>
                    <div class="mbot-row">
                        <label>Nazwa</label>
                        <input type="text" id="mob-name" placeholder="dowolna...">
                    </div>
                    <div class="mbot-btn-row">
                        <button class="mbot-btn-start" id="start-farm">▶ Start</button>
                        <button class="mbot-btn-stop"  id="stop-farm">■ Stop</button>
                    </div>
                    <div class="mbot-sep"></div>
                    <div class="mbot-row" style="gap:8px;">
                        <input type="checkbox" id="gateway-enabled" style="margin:0;width:auto;flex:0;cursor:pointer;">
                        <label for="gateway-enabled" style="white-space:normal;line-height:1.3;cursor:pointer;color:#aaa;">Auto-brama gdy mapa czysta</label>
                    </div>
                    <div class="mbot-row">
                        <label>Mapa docelowa</label>
                        <input type="text" id="gateway-dest" placeholder="dowolna...">
                    </div>
                </div>
                <div id="mbot-panel-route" class="mbot-panel">
                    <div class="mbot-btn-row" style="margin-bottom:6px;">
                        <button class="mbot-btn-save" id="scan-mobs">📍 Skanuj moby</button>
                        <button class="mbot-btn-save" id="scan-gateways">🚪 Skanuj bramy</button>
                    </div>
                    <div id="route-mob-list"><span class="route-hint">Kliknij "Skanuj moby"</span></div>
                    <label class="mbot-label" style="margin-top:4px;">Przejście po etapie:</label>
                    <select id="route-gateway-select">
                        <option value="">— zostań na mapie —</option>
                    </select>
                    <button class="mbot-btn-save" id="add-route-step" style="width:100%;margin-bottom:2px;">+ Dodaj etap</button>
                    <div class="mbot-sep" style="margin:5px 0;"></div>
                    <div id="route-steps-list"><span class="route-hint">Brak etapów — dodaj powyżej</span></div>
                    <div class="mbot-btn-row" style="margin-top:4px;">
                        <button class="mbot-btn-start" id="start-route">▶ Start</button>
                        <button class="mbot-btn-stop"  id="stop-route">■ Stop</button>
                        <button class="mbot-btn-stop"  id="clear-route" style="flex:0;padding:5px 10px;" title="Wyczyść">🗑</button>
                    </div>
                </div>
                <div id="mbot-panel-heal" class="mbot-panel">
                    <div id="heal-selected">
                        <img id="heal-item-img" src="" style="width:22px;height:22px;object-fit:contain;display:none;">
                        <span id="heal-item-label" style="font-size:11px;color:#888;">Nie wybrano — kliknij slot</span>
                    </div>
                    <div class="mbot-row" style="justify-content:space-between;margin-bottom:4px;">
                        <span style="color:#aaa;font-size:11px;">Ekwipunek:</span>
                        <button id="refresh-inv" class="mbot-btn-save" style="flex:0;padding:2px 10px;">🔄 Odśwież</button>
                    </div>
                    <div id="inv-grid"></div>
                    <div class="mbot-sep"></div>
                    <div class="mbot-row">
                        <label>Lecz gdy HP ≤</label>
                        <input type="number" id="heal-threshold" min="1" max="99" style="flex:0;width:50px;">
                        <span style="color:#888;">%</span>
                    </div>
                    <div class="mbot-btn-row">
                        <button class="mbot-btn-save" id="save-heal-settings">💾 Zapisz ustawienia</button>
                    </div>
                    <div id="heal-save-notice">✓ Ustawienia zapisane</div>
                </div>
                <div id="mbot-panel-captcha" class="mbot-panel">
                    <button class="mbot-btn-start active" id="captcha-toggle">■ Wyłącz auto-CAPTCHA</button>
                    <div class="captcha-info">
                        Wymaga: <b>captcha_clicker.py</b> na localhost:8765.<br>
                        Auto-kliknie "Rozwiąż teraz", wykryje<br>
                        odpowiedni symbol i potwierdzi.
                    </div>
                </div>
                <div id="mbot-ban-bar"></div>
                <div id="mbot-footer">
                    <span id="mbot-mode-label">● OFF</span>
                    <span id="mbot-hp-label">HP: —</span>
                </div>
            </div>
        </div>
        `;

        return {
            build() {
                const styleEl = document.createElement("style");
                styleEl.textContent = CSS;
                document.head.appendChild(styleEl);
                document.body.insertAdjacentHTML("beforeend", HTML);
                this._initTabs();
                this._initDrag();
                this._initMinimize();
            },
            _initTabs() {
                document.querySelectorAll(".mbot-tab").forEach(btn => {
                    btn.addEventListener("click", () => {
                        this.switchTab(btn.dataset.tab);
                        if (btn.dataset.tab === "heal") MBot.inventory.render();
                    });
                });
            },
            switchTab(name) {
                document.querySelectorAll(".mbot-tab").forEach(b =>
                    b.classList.toggle("active", b.dataset.tab === name)
                );
                document.querySelectorAll(".mbot-panel").forEach(p =>
                    p.classList.toggle("active", p.id === `mbot-panel-${name}`)
                );
            },
            _initDrag() {
                const root   = document.getElementById("mbot-root");
                const header = document.getElementById("mbot-header");
                let dragging = false, ox = 0, oy = 0;
                header.addEventListener("mousedown", e => {
                    if (e.target.id === "mbot-minimize") return;
                    dragging = true;
                    const rect = root.getBoundingClientRect();
                    ox = e.clientX - rect.left;
                    oy = e.clientY - rect.top;
                    e.preventDefault();
                });
                document.addEventListener("mousemove", e => {
                    if (!dragging) return;
                    root.style.right = "auto";
                    root.style.left  = Math.max(0, e.clientX - ox) + "px";
                    root.style.top   = Math.max(0, e.clientY - oy) + "px";
                });
                document.addEventListener("mouseup", () => { dragging = false; });
            },
            _initMinimize() {
                const btn    = document.getElementById("mbot-minimize");
                const body   = document.getElementById("mbot-body");
                const header = document.getElementById("mbot-header");
                btn.addEventListener("click", () => {
                    const isHidden = body.style.display === "none";
                    body.style.display = isHidden ? "" : "none";
                    btn.textContent = isHidden ? "─" : "□";
                    header.classList.toggle("minimized", !isHidden);
                });
            },
            renderRouteMobs(mobs) {
                const container = document.getElementById('route-mob-list');
                if (!mobs || !mobs.size) {
                    container.innerHTML = '<span class="route-hint">Brak mobów na mapie</span>';
                    return;
                }
                container.innerHTML = '';
                mobs.forEach((count, name) => {
                    const lbl = document.createElement('label');
                    const cb  = document.createElement('input');
                    cb.type = 'checkbox'; cb.value = name; cb.checked = true;
                    const txt = document.createElement('span');
                    txt.textContent = `${name} ×${count}`;
                    lbl.append(cb, txt);
                    container.appendChild(lbl);
                });
            },
            renderRouteSteps(steps) {
                const container = document.getElementById('route-steps-list');
                if (!steps || steps.length === 0) {
                    container.innerHTML = '<span class="route-hint">Brak etapów — dodaj powyżej</span>';
                    return;
                }
                container.innerHTML = '';
                steps.forEach(s => {
                    const div = document.createElement('div');
                    div.className = 'route-step' + (s.active ? ' active-step' : '');
                    const label = document.createElement('span');
                    label.className = 'route-step-label';
                    const mobStr = s.mobs.length > 0 ? s.mobs.join(', ') : '⚡ przejście';
                    const gwStr  = s.gateway || '(zostań)';
                    label.textContent = `#${s.index + 1}  ${mobStr}  →  ${gwStr}`;
                    label.title = label.textContent;
                    const del = document.createElement('button');
                    del.className = 'route-step-del';
                    del.dataset.index = s.index;
                    del.textContent = '×';
                    div.append(label, del);
                    container.appendChild(div);
                });
            },
            renderRouteGateways(gateways) {
                const sel = document.getElementById('route-gateway-select');
                sel.innerHTML = '<option value="">— zostań na mapie —</option>';
                (gateways || []).forEach(gw => {
                    const opt = document.createElement('option');
                    opt.value = gw.key;
                    opt.textContent = gw.label;
                    sel.appendChild(opt);
                });
            },
            showBan(ms) {
                const bar = document.getElementById('mbot-ban-bar');
                if (!bar) return;
                let rem = Math.ceil(ms / 1000);
                bar.style.display = 'block';
                bar.textContent = `⛔ Ban na bicie — ${rem}s`;
                const iv = setInterval(() => {
                    rem--;
                    if (rem <= 0) { clearInterval(iv); bar.style.display = 'none'; }
                    else { bar.textContent = `⛔ Ban na bicie — ${rem}s`; }
                }, 1000);
            },
            setStatus(mode) {
                const dot   = document.getElementById("mbot-status-dot");
                const label = document.getElementById("mbot-mode-label");
                const map = {
                    off:   { text: "● OFF",   color: "#666"    },
                    farm:  { text: "● FARM",  color: "#4caf50" },
                    route: { text: "● ROUTE", color: "#ffa726" }
                };
                const cfg = map[mode] || map.off;
                dot.textContent   = cfg.text;  dot.style.color   = cfg.color;
                label.textContent = cfg.text;  label.style.color = cfg.color;
            },
            updateHP(hp) {
                const el = document.getElementById("mbot-hp-label");
                if (hp === null) { el.textContent = "HP: —"; el.style.color = "#888"; return; }
                el.textContent = `HP: ${hp}%`;
                el.style.color = hp <= 30 ? "#f55" : hp <= 60 ? "#fa4" : "#8f8";
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ inventory ══
    MBot.inventory = (() => {
        function updatePreview(name, imgSrc) {
            const label = document.getElementById('heal-item-label');
            const img   = document.getElementById('heal-item-img');
            label.textContent = name || 'Wybrany przedmiot';
            label.style.color = '#8f8';
            if (imgSrc) { img.src = imgSrc; img.style.display = 'inline'; }
            else { img.style.display = 'none'; }
        }

        function buildSlot(item, grid) {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.title = item.name || item.id;

            if (item.id && item.id === MBot.bot.healItemId) {
                slot.classList.add('selected');
                if (item.el) MBot.bot.healSlotEl = item.el;
                updatePreview(item.name, item.imgSrc);
            }

            if (item.imgSrc) {
                const i = document.createElement('img');
                i.src = item.imgSrc;
                slot.appendChild(i);
            } else if (item.name) {
                const abbr = document.createElement('span');
                abbr.textContent = item.name.slice(0, 2).toUpperCase();
                abbr.style.cssText = 'font-size:10px;color:#ccc;text-align:center;word-break:break-all;';
                slot.appendChild(abbr);
            }

            if (item.amount && String(item.amount) !== '1') {
                const badge = document.createElement('span');
                badge.className = 'amount';
                badge.textContent = item.amount;
                slot.appendChild(badge);
            }

            slot.addEventListener('click', () => {
                grid.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                slot.classList.add('selected');
                MBot.bot.healSlotEl = item.el || null;
                MBot.bot.healItemId = item.id;
                MBot.storage.set('healItemId', item.id);
                updatePreview(item.name, item.imgSrc);
            });

            return slot;
        }

        return {
            extractNameFromTip: (tip) => MBot.adapter.extractNameFromTip(tip),
            clearPreview() {
                document.getElementById('heal-item-label').textContent = '⚠️ Przedmiot zużyty — wybierz nowy';
                document.getElementById('heal-item-label').style.color = '#f88';
                document.getElementById('heal-item-img').style.display = 'none';
            },
            render() {
                const grid = document.getElementById('inv-grid');
                grid.innerHTML = '';
                const items = MBot.adapter.getInventoryItems();
                if (!items.length) {
                    grid.innerHTML = `<div style="grid-column:span 5;color:#666;font-size:11px;padding:4px;">
                        ${MBot.adapter.isNI ? 'Brak przedmiotów w ekwipunku.' : 'Brak przedmiotów — otwórz ekwipunek w grze.'}
                    </div>`;
                    return;
                }
                items.forEach(item => grid.appendChild(buildSlot(item, grid)));
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ combat ══
    MBot.combat = (() => {
        const BAN_PATTERN = /(\d+)\s*sekund/i;

        function _applyBan(secs) {
            if (Date.now() < MBot.bot.banUntil) return;
            const ms = secs * 1000 + 500;
            MBot.bot.banUntil = Date.now() + ms;
            console.warn(`[BOT] Ban na atakowanie — pauza ${secs}s`);
            if (MBot.ui && MBot.ui.showBan) MBot.ui.showBan(ms);
        }

        (function _startBanWatcher() {
            new MutationObserver(mutations => {
                for (const m of mutations) {
                    for (const node of m.addedNodes) {
                        const text = node.textContent || '';
                        if (text.length > 300) continue;
                        const match = BAN_PATTERN.exec(text);
                        if (match) {
                            const secs = parseInt(match[1]);
                            if (secs >= 3 && secs <= 60) { _applyBan(secs); return; }
                        }
                    }
                }
            }).observe(document.body, { childList: true, subtree: true });
        })();

        function clickElement(el) {
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
                clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
            }));
        }

        function handleBattleUISI() {
            const autobattle = document.getElementById('autobattleButton');
            if (autobattle && autobattle.style.display !== 'none') autobattle.click();
            const battleClose = document.getElementById('battleclose');
            if (battleClose && battleClose.style.display !== 'none') battleClose.click();
            const loots = document.getElementById('loots_button');
            if (loots && loots.style.display !== 'none' && loots.innerText.trim()) {
                try { loots.click(); } catch (e) {}
            }
        }

        function attackNearestSI(conditionFn) {
            handleBattleUISI();
            if (Date.now() < MBot.bot.banUntil) return false;
            if (Date.now() - MBot.bot.lastAttackTime < MBot.config.ATTACK_COOLDOWN_MS) return false;
            const hero = document.getElementById('hero');
            if (!hero) return false;
            const hr = hero.getBoundingClientRect();
            const hx = hr.left + hr.width / 2;
            const hy = hr.top  + hr.height / 2;
            let nearest = null, minDist = Infinity;
            document.querySelectorAll('.npc').forEach(mob => {
                const tip = mob.getAttribute('tip');
                if (!tip || !conditionFn(tip)) return;
                if (MBot.config.FORBIDDEN_MOBS.some(n => tip.includes(n))) return;
                const r  = mob.getBoundingClientRect();
                const dx = hx - (r.left + r.width / 2);
                const dy = hy - (r.top  + r.height / 2);
                const d  = Math.hypot(dx, dy);
                if (d < minDist) { minDist = d; nearest = mob; }
            });
            if (nearest) { MBot.bot.lastAttackTime = Date.now(); clickElement(nearest); return true; }
            return false;
        }

        const MONSTER_TYPES = new Set([2, 3, 9]);

        function attackNearestNI(conditionFn) {
            if (!window.Engine) return;
            if (MBot.bot.inBattle) return;
            if (Date.now() < MBot.bot.banUntil) return;
            try {
                const hx = Engine.hero.d.x;
                const hy = Engine.hero.d.y;
                if (hx == null || hy == null) return;
                let nearest = null, minDist = Infinity;
                Engine.renderer.getList().slice().forEach(o => {
                    if (!o || o.canvasObjectType !== 'NPC') return;
                    if (!o.d || !MONSTER_TYPES.has(o.d.type)) return;
                    if (MBot.config.FORBIDDEN_MOBS.some(n => (o.d.name || '').includes(n))) return;
                    if (!conditionFn(o.d)) return;
                    const d = Math.hypot(hx - o.d.x, hy - o.d.y);
                    if (d < minDist) { minDist = d; nearest = o; }
                });
                if (nearest) { MBot.bot.inBattle = true; window._g(`fight&a=attack&id=${nearest.d.id}`); }
            } catch (err) { console.warn('[BOT NI] attackNearest error:', err); }
        }

        return {
            attackNearest(conditionFn) {
                if (MBot.adapter.isNI) { attackNearestNI(conditionFn); return false; }
                return attackNearestSI(conditionFn);
            },
            isInBattle() {
                if (MBot.adapter.isNI) return MBot.bot.inBattle;
                const ab = document.getElementById('autobattleButton');
                const bc = document.getElementById('battleclose');
                return (ab && ab.style.display !== 'none') || (bc && bc.style.display !== 'none');
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ heal ══
    MBot.heal = (() => {
        return {
            autoHeal() {
                const hp = MBot.adapter.readHP();
                MBot.ui.updateHP(hp);
                if (hp === null || hp > MBot.bot.healThreshold) return;
                const now = Date.now();
                if (now - MBot.bot.lastHealTime < MBot.config.HEAL_COOLDOWN_MS) return;
                const { healItemId } = MBot.bot;
                if (!healItemId) return;
                if (!MBot.adapter.itemExists(healItemId)) {
                    console.warn('[BOT] Przedmiot zniknął z EQ (zużyty?).');
                    MBot.bot.healSlotEl = null;
                    MBot.bot.healItemId = null;
                    MBot.storage.set('healItemId', null);
                    MBot.inventory.clearPreview();
                    MBot.inventory.render();
                    return;
                }
                MBot.bot.lastHealTime = now;
                console.log(`[BOT] HP ${hp}% — leczę (id: ${healItemId})`);
                MBot.adapter.useItem(healItemId);
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ farm ══
    MBot.farm = (() => {
        const NO_MOBS_THRESHOLD = 10;

        function getFilters() {
            return {
                minLevel: parseInt(document.getElementById('mob-min-level').value) || null,
                maxLevel: parseInt(document.getElementById('mob-max-level').value) || null,
                mobName:  (document.getElementById('mob-name').value || '').toLowerCase().trim()
            };
        }

        function buildConditionNI(minLevel, maxLevel, mobName) {
            return d => {
                if (!d.name) return false;
                if (minLevel && (d.lvl || 0) < minLevel) return false;
                if (maxLevel && (d.lvl || 0) > maxLevel) return false;
                if (mobName && !d.name.toLowerCase().includes(mobName)) return false;
                return true;
            };
        }

        function buildConditionSI(minLevel, maxLevel, mobName) {
            return tip => {
                if (/Teleport|Grota|Wejście/.test(tip)) return false;
                const lvlMatch = tip.match(/<span[^>]*>(\d+)\s*lvl/);
                if (!lvlMatch) return false;
                const lvl = parseInt(lvlMatch[1]);
                if (minLevel && lvl < minLevel) return false;
                if (maxLevel && lvl > maxLevel) return false;
                if (mobName) {
                    const name = MBot.adapter.extractNameFromTip(tip) || '';
                    if (!name.toLowerCase().includes(mobName)) return false;
                }
                return true;
            };
        }

        function _clickEl(el) {
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true, view: window,
                clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
            }));
        }

        function tryGateway() {
            if (!document.getElementById('gateway-enabled')?.checked) return;
            const filter = (document.getElementById('gateway-dest')?.value || '').toLowerCase().trim();
            const gateways = [...document.querySelectorAll('.gw')];
            const target = filter
                ? gateways.find(gw => (gw.getAttribute('tip') || '').toLowerCase().includes(filter))
                : gateways[0];
            if (!target) return;
            console.log('[BOT] Mapa czysta — przechodzę przez bramę:', target.getAttribute('tip'));
            MBot.bot.transitioning = true;
            try { _clickEl(target); } catch(e) {}
            setTimeout(() => { MBot.bot.transitioning = false; }, 4000);
        }

        function tick() {
            if (MBot.bot.transitioning) return;
            const { minLevel, maxLevel, mobName } = getFilters();
            const conditionFn = MBot.adapter.isNI
                ? buildConditionNI(minLevel, maxLevel, mobName)
                : buildConditionSI(minLevel, maxLevel, mobName);
            const attacked = MBot.combat.attackNearest(conditionFn);
            MBot.heal.autoHeal();
            if (!MBot.adapter.isNI) {
                const inOrJustAfterBattle = Date.now() - MBot.bot.lastAttackTime < 8000;
                if (attacked || inOrJustAfterBattle) {
                    MBot.bot.noMobsTicks = 0;
                } else {
                    MBot.bot.noMobsTicks++;
                    if (MBot.bot.noMobsTicks >= NO_MOBS_THRESHOLD) {
                        MBot.bot.noMobsTicks = 0;
                        tryGateway();
                    }
                }
            }
        }

        return {
            start() {
                const { minLevel, maxLevel, mobName } = getFilters();
                MBot.storage.setMany({
                    mobMinLevel: minLevel ?? '',
                    mobMaxLevel: maxLevel ?? '',
                    mobName,
                    gatewayEnabled: document.getElementById('gateway-enabled')?.checked ?? false,
                    gatewayDest: document.getElementById('gateway-dest')?.value ?? ''
                });
                MBot.bot.start('farm', tick);
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ route ══
    MBot.route = (() => {
        const NO_MOBS_THRESHOLD = 10;
        let _steps = [], _currentStep = 0;

        function _gatewayName(tip) {
            const tmp = document.createElement('div');
            tmp.innerHTML = tip;
            const bold = tmp.querySelector('b');
            return (bold ? bold.textContent : tmp.textContent).trim() || '(brama)';
        }

        function _buildConditionSI(mobs) {
            return tip => {
                if (/Teleport|Grota|Wejście/.test(tip)) return false;
                if (mobs.size === 0) return false;
                const name = (MBot.adapter.extractNameFromTip(tip) || '').toLowerCase();
                return mobs.has(name);
            };
        }

        function _buildConditionNI(mobs) {
            return d => {
                if (!d.name || mobs.size === 0) return false;
                return mobs.has(d.name.toLowerCase());
            };
        }

        function _clickEl(el) {
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true, view: window,
                clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
            }));
        }

        function _saveState() {
            MBot.storage.setMany({
                routeSteps: _steps.map(s => ({ mobs: [...s.mobs], gateway: s.gateway })),
                routeCurrentStep: _currentStep
            });
        }

        function _mapFingerprint() {
            return [...document.querySelectorAll('.gw')]
                .map(gw => _gatewayName(gw.getAttribute('tip') || '')).sort().join('|');
        }

        function _tryGateway(gatewayKey) {
            if (!gatewayKey) return;
            const gateways = [...document.querySelectorAll('.gw')];
            const target = gateways.find(gw => _gatewayName(gw.getAttribute('tip') || '') === gatewayKey);
            if (!target) { console.warn('[BOT Route] Nie znaleziono bramy:', gatewayKey); return; }
            const nextStep = (_currentStep + 1) % _steps.length;
            const fpBefore = _mapFingerprint();
            MBot.storage.set('routeCurrentStep', nextStep);
            if (nextStep === 0) {
                console.log('[BOT Route] ↩️ Pętla — wracam do etapu #1');
            } else {
                console.log('[BOT Route] Brama:', gatewayKey, '→ etap', nextStep + 1, '/', _steps.length);
            }
            MBot.bot.transitioning = true;
            try { _clickEl(target); } catch(e) {}
            setTimeout(() => {
                const fpAfter = _mapFingerprint();
                if (fpAfter === fpBefore) {
                    console.warn('[BOT Route] Mapa nie zmieniła się — cofam etap, ponawiam');
                    MBot.storage.set('routeCurrentStep', _currentStep);
                } else {
                    _currentStep = nextStep;
                    MBot.storage.set('routeCurrentStep', _currentStep);
                    MBot.ui.renderRouteSteps(MBot.route.getSteps());
                }
                MBot.bot.transitioning = false;
            }, 4000);
        }

        function tick() {
            if (MBot.bot.transitioning) return;
            const step = _steps[_currentStep];
            if (!step) return;
            if (step.mobs.size === 0) { MBot.heal.autoHeal(); _tryGateway(step.gateway); return; }
            const conditionFn = MBot.adapter.isNI ? _buildConditionNI(step.mobs) : _buildConditionSI(step.mobs);
            const attacked = MBot.combat.attackNearest(conditionFn);
            MBot.heal.autoHeal();
            const inOrJustAfterBattle = Date.now() - MBot.bot.lastAttackTime < 8000;
            if (attacked || inOrJustAfterBattle) {
                MBot.bot.noMobsTicks = 0;
            } else {
                MBot.bot.noMobsTicks++;
                if (MBot.bot.noMobsTicks >= NO_MOBS_THRESHOLD) {
                    MBot.bot.noMobsTicks = 0;
                    _tryGateway(step.gateway);
                }
            }
        }

        return {
            scanMobs() {
                const mobs = new Map();
                document.querySelectorAll('.npc').forEach(mob => {
                    const tip = mob.getAttribute('tip') || '';
                    if (/Teleport|Grota|Wejście/.test(tip)) return;
                    if (MBot.config.FORBIDDEN_MOBS.some(n => tip.includes(n))) return;
                    const name = MBot.adapter.extractNameFromTip(tip);
                    if (!name) return;
                    mobs.set(name, (mobs.get(name) || 0) + 1);
                });
                return mobs;
            },
            scanGateways() {
                return [...document.querySelectorAll('.gw')].map(gw => ({
                    key: _gatewayName(gw.getAttribute('tip') || ''),
                    label: _gatewayName(gw.getAttribute('tip') || '')
                }));
            },
            addStep(names, gateway) {
                _steps.push({ mobs: new Set(names.map(n => n.toLowerCase())), gateway: gateway || null });
                _saveState();
            },
            removeStep(index) {
                _steps.splice(index, 1);
                if (_currentStep >= _steps.length && _steps.length > 0) _currentStep = _steps.length - 1;
                if (_steps.length === 0) _currentStep = 0;
                _saveState();
            },
            clearSteps() { _steps = []; _currentStep = 0; _saveState(); },
            getSteps() {
                return _steps.map((s, i) => ({
                    index: i, mobs: [...s.mobs], gateway: s.gateway,
                    active: i === _currentStep && MBot.bot.mode === 'route'
                }));
            },
            loadFromStorage() {
                const saved = MBot.storage.get('routeSteps') || [];
                const savedStep = MBot.storage.get('routeCurrentStep') || 0;
                _steps = saved.map(s => ({
                    mobs: new Set((s.mobs || []).map(n => n.toLowerCase())),
                    gateway: s.gateway || null
                }));
                _currentStep = Math.min(savedStep, Math.max(0, _steps.length - 1));
            },
            start() {
                if (_steps.length === 0) { console.warn('[BOT Route] Brak etapów'); return; }
                _saveState();
                MBot.bot.start('route', tick);
            }
        };
    })();

    // ═══════════════════════════════════════════════════════ captcha ══
    MBot.captcha = (() => {
        const CLICKER_URL = 'http://localhost:8765/captcha';
        let _observer = null;
        let _solving = false;

        function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
        function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

        function _targetSymbol() {
            const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
            if (/gwiazdk/.test(q))              return '*';
            if (/wykrzyknik/.test(q))           return '!';
            if (/dolar/.test(q))                return '$';
            if (/et\b|małp|ampersand/.test(q))  return '&';
            if (/hash|krzyż|płotek/.test(q))    return '#';
            if (/\bat\b/.test(q))               return '@';
            const counts = {};
            document.querySelectorAll('.captcha__buttons .btn.btn-wood span.gfont').forEach(s => {
                const n = s.getAttribute('name') || '';
                if (n.length >= 3) { const c = n[0]; if (n.endsWith(c)) counts[c] = (counts[c] || 0) + 1; }
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '*';
        }

        function _isTarget(btn, sym) {
            const n = btn.querySelector('span.gfont')?.getAttribute('name') || '';
            return n.length >= 3 && n.startsWith(sym) && n.endsWith(sym);
        }

        function _center(el) {
            const r  = el.getBoundingClientRect();
            const ox = window.screenX;
            const oy = window.screenY + (window.outerHeight - window.innerHeight);
            return { x: Math.round(r.left + r.width / 2) + ox, y: Math.round(r.top + r.height / 2) + oy };
        }

        async function _solveCaptcha() {
            if (_solving) return;
            _solving = true;
            _log('=== Rozwiązuję CAPTCHA ===');
            try {
                const container = document.querySelector('.captcha__buttons');
                if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }
                const sym     = _targetSymbol();
                _log(`Symbol: "${sym}"`);
                const buttons = [...container.querySelectorAll('.btn.btn-wood')];
                const targets = buttons.filter(b => _isTarget(b, sym));
                const names   = targets.map(b => b.querySelector('span.gfont').getAttribute('name'));
                _log(`Docelowe: ${names.join(', ')}`);
                if (targets.length === 0) { _log('Brak pasujących kafelków'); _solving = false; return; }
                const confirmSpan = [...document.querySelectorAll('.captcha__confirm span.gfont')]
                    .find(s => s.getAttribute('name') === 'Potwierdzam');
                const confirmBtn = confirmSpan?.closest('.btn');
                const payload = { tiles: targets.map(_center), confirm: confirmBtn ? _center(confirmBtn) : null };
                _log('Wysyłam do captcha_clicker: ' + JSON.stringify(payload.tiles));
                try {
                    const res = await fetch(CLICKER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    const json = await res.json();
                    _log('Odpowiedź: ' + JSON.stringify(json));
                } catch (e) {
                    _log('Błąd fetch (czy captcha_clicker.py działa?): ' + e.message);
                }
                await _delay(4000);
                if (!document.querySelector('.captcha__buttons') ||
                    document.querySelector('.captcha__buttons')?.offsetParent === null) {
                    _log('✓ Captcha rozwiązana!');
                } else {
                    _log('Captcha nadal otwarta.');
                }
            } catch (err) { _log('Błąd: ' + err.message); }
            await _delay(2000);
            _solving = false;
        }

        async function _handleSolveNow(span) {
            _solving = true;
            _log('Klikam "Rozwiąż teraz"...');
            const el = span.closest('.label') || span.parentElement || span;
            const r = el.getBoundingClientRect();
            ['mousedown', 'mouseup', 'click'].forEach(type => {
                el.dispatchEvent(new MouseEvent(type, {
                    bubbles: true, cancelable: true, view: window,
                    clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
                }));
            });
            for (let i = 0; i < 30; i++) {
                await _delay(250);
                if (document.querySelector('.captcha__buttons')) {
                    await _delay(1500);
                    _solving = false;
                    await _solveCaptcha();
                    return;
                }
            }
            _log('Timeout: .captcha__buttons nie pojawiło się');
            _solving = false;
        }

        function _check() {
            if (_solving) return;
            const solveNow = [...document.querySelectorAll('span.gfont')]
                .find(s => s.getAttribute('name') === 'Rozwiąż teraz' && s.offsetParent !== null);
            if (solveNow) { _handleSolveNow(solveNow); return; }
            const container = document.querySelector('.captcha__buttons');
            if (container && container.offsetParent !== null) _solveCaptcha();
        }

        return {
            start() {
                if (_observer) return;
                _log('Obserwator CAPTCHA uruchomiony');
                _observer = new MutationObserver(_check);
                _observer.observe(document.body, { childList: true, subtree: true });
                _check();
            },
            stop() {
                if (_observer) { _observer.disconnect(); _observer = null; _log('Obserwator zatrzymany'); }
            },
        };
    })();

    // ═══════════════════════════════════════════════════════ init ══
    MBot.ui.build();

    if (MBot.adapter.isNI) {
        document.getElementById('mbot-header-title').textContent = '⚔️ Margonem Bot [NI]';
    }

    const mobMin  = MBot.storage.get('mobMinLevel');
    const mobMax  = MBot.storage.get('mobMaxLevel');
    const mobName = MBot.storage.get('mobName');
    if (mobMin)  document.getElementById('mob-min-level').value = mobMin;
    if (mobMax)  document.getElementById('mob-max-level').value = mobMax;
    if (mobName) document.getElementById('mob-name').value = mobName;

    document.getElementById('heal-threshold').value = MBot.bot.healThreshold;

    const gwEnabled = MBot.storage.get('gatewayEnabled');
    const gwDest    = MBot.storage.get('gatewayDest');
    if (gwEnabled) document.getElementById('gateway-enabled').checked = true;
    if (gwDest)    document.getElementById('gateway-dest').value = gwDest;

    MBot.route.loadFromStorage();
    MBot.ui.renderRouteSteps(MBot.route.getSteps());

    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    document.getElementById('start-farm').addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm') .addEventListener('click', () => MBot.bot.stop());

    document.getElementById('scan-mobs').addEventListener('click', () => {
        MBot.ui.renderRouteMobs(MBot.route.scanMobs());
    });
    document.getElementById('scan-gateways').addEventListener('click', () => {
        MBot.ui.renderRouteGateways(MBot.route.scanGateways());
    });
    document.getElementById('add-route-step').addEventListener('click', () => {
        const checked = [...document.querySelectorAll('#route-mob-list input[type=checkbox]:checked')]
            .map(cb => cb.value);
        const gw = document.getElementById('route-gateway-select').value;
        if (checked.length === 0 && !gw) return;
        MBot.route.addStep(checked, gw);
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
        MBot.ui.renderRouteMobs(null);
        MBot.ui.renderRouteGateways([]);
    });
    document.getElementById('route-steps-list').addEventListener('click', e => {
        const btn = e.target.closest('.route-step-del');
        if (!btn) return;
        MBot.route.removeStep(parseInt(btn.dataset.index));
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });
    document.getElementById('start-route').addEventListener('click', () => {
        MBot.route.start();
        MBot.ui.renderRouteSteps(MBot.route.getSteps());
    });
    document.getElementById('stop-route') .addEventListener('click', () => MBot.bot.stop());
    document.getElementById('clear-route').addEventListener('click', () => {
        MBot.route.clearSteps();
        MBot.ui.renderRouteSteps([]);
    });

    document.getElementById('refresh-inv').addEventListener('click', () => MBot.inventory.render());
    document.getElementById('save-heal-settings').addEventListener('click', () => {
        const threshold = parseInt(document.getElementById('heal-threshold').value) || 30;
        MBot.bot.healThreshold = threshold;
        MBot.storage.set('healThreshold', threshold);
        const notice = document.getElementById('heal-save-notice');
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 2000);
    });

    const captchaToggle = document.getElementById('captcha-toggle');
    let captchaActive = !!MBot.storage.get('captchaEnabled');

    function _setCaptchaState(active) {
        captchaActive = active;
        MBot.storage.set('captchaEnabled', active ? 1 : 0);
        if (active) {
            MBot.captcha.start();
            captchaToggle.textContent = '■ Wyłącz auto-CAPTCHA';
            captchaToggle.classList.add('active');
        } else {
            MBot.captcha.stop();
            captchaToggle.textContent = '▶ Włącz auto-CAPTCHA';
            captchaToggle.classList.remove('active');
        }
    }

    captchaToggle.addEventListener('click', () => _setCaptchaState(!captchaActive));
    _setCaptchaState(captchaActive);

    const savedMode = MBot.storage.get('botMode');
    if (savedMode === 'farm') {
        setTimeout(() => MBot.farm.start(), 2000);
    } else if (savedMode === 'route') {
        setTimeout(() => {
            MBot.ui.switchTab('route');
            MBot.route.start();
            MBot.ui.renderRouteSteps(MBot.route.getSteps());
        }, 2000);
    }

})();
