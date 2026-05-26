// ==UserScript==
// @name         Margonem Bot v8
// @namespace    http://tampermonkey.net/
// @version      8.4
// @description  Auto farm + hero/elite search + auto heal | SI + NI | z persystencją ustawień
// @author
// @match        https://gordion.margonem.pl/
// @match        https://*.margonem.pl/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Zapobiega podwójnemu uruchomieniu
    if (document.getElementById('mbot-root')) return;

    // ── config ────────────────────────────────────────────────────────────
    window.MBot = window.MBot || {};

    MBot.config = {
        FORBIDDEN_MOBS: [
            "Silny jeleń", "Weszo",
            "Rumianek", "Lawenda", "Pokrzywa", "Mniszek", "Tymianek", "Szałwia"
        ],
        TICK_MS: 400,
        HEAL_COOLDOWN_MS: 2000,
        STORAGE_KEY: "margonem_bot_v8"
    };

    // ── storage ───────────────────────────────────────────────────────────
    MBot.storage = (() => {
        const KEY = MBot.config.STORAGE_KEY;
        const DEFAULTS = {
            healThreshold: 30,
            mobMinLevel: "",
            mobMaxLevel: "",
            mobName: "",
            heroesInput: "",
            elitesInput: "",
            healItemId: null
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

    // ── adapter ───────────────────────────────────────────────────────────
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
                if (IFACE === 'ni') { window._g(`moveitem&st=1&id=${itemId}`); return; }
                if (typeof moveItemSafe === 'function') {
                    moveItemSafe(itemId, 'st=1');
                } else {
                    const el = document.getElementById('item' + itemId);
                    if (el) $(el).trigger('dblclick');
                }
            },

            itemExists(itemId) {
                if (IFACE === 'ni') {
                    try { return Engine.items.fetchLocationItems('g').some(i => String(i.id) === String(itemId)); }
                    catch { return false; }
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
                        setTimeout(() => { MBot.bot.inBattle = false; fn(); }, 250);
                    });
                }
            }
        };
    })();

    // ── bot state ─────────────────────────────────────────────────────────
    MBot.bot = {
        mode: null,
        intervalId: null,
        healSlotEl: null,
        healItemId: MBot.storage.get("healItemId"),
        healThreshold: MBot.storage.get("healThreshold") ?? 30,
        targetHeroes: [],
        targetElites: [],
        lastHealTime: 0,
        inBattle: false,

        start(mode, fn) {
            this.stop();
            this.mode = mode;
            this.intervalId = setInterval(fn, MBot.config.TICK_MS);
            MBot.ui.setStatus(mode);
        },

        stop() {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.mode = null;
            this.inBattle = false;
            MBot.ui.setStatus("off");
            MBot.ui.updateHP(null);
        }
    };

    // ── ui ────────────────────────────────────────────────────────────────
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
                        <button class="mbot-tab" data-tab="search">🧿 Search</button>
                        <button class="mbot-tab" data-tab="heal">💊 Heal</button>
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
                            <button class="mbot-btn-stop" id="stop-farm">■ Stop</button>
                        </div>
                    </div>
                    <div id="mbot-panel-search" class="mbot-panel">
                        <label class="mbot-label">Heroes (po przecinku):</label>
                        <input type="text" id="heroes-input" placeholder="np. Smok, Lich...">
                        <label class="mbot-label" style="margin-top:8px;">Elites (po przecinku):</label>
                        <input type="text" id="elites-input" placeholder="np. Wilk Elite...">
                        <div class="mbot-btn-row">
                            <button class="mbot-btn-start" id="start-search">▶ Start</button>
                            <button class="mbot-btn-stop" id="stop-search">■ Stop</button>
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

            setStatus(mode) {
                const dot   = document.getElementById("mbot-status-dot");
                const label = document.getElementById("mbot-mode-label");
                const map = {
                    off:    { text: "● OFF",    color: "#666"    },
                    farm:   { text: "● FARM",   color: "#4caf50" },
                    search: { text: "● SEARCH", color: "#64b5f6" }
                };
                const cfg = map[mode] || map.off;
                dot.textContent   = cfg.text; dot.style.color   = cfg.color;
                label.textContent = cfg.text; label.style.color = cfg.color;
            },

            updateHP(hp) {
                const el = document.getElementById("mbot-hp-label");
                if (hp === null) { el.textContent = "HP: —"; el.style.color = "#888"; return; }
                el.textContent = `HP: ${hp}%`;
                el.style.color = hp <= 30 ? "#f55" : hp <= 60 ? "#fa4" : "#8f8";
            }
        };
    })();

    // ── inventory ─────────────────────────────────────────────────────────
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

    // ── combat ────────────────────────────────────────────────────────────
    MBot.combat = (() => {
        function clickElement(el) {
            const r = el.getBoundingClientRect();
            el.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
                clientX: r.left + r.width  / 2,
                clientY: r.top  + r.height / 2
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
            const hero = document.getElementById('hero');
            if (!hero) return;
            const hr = hero.getBoundingClientRect();
            const hx = hr.left + hr.width  / 2;
            const hy = hr.top  + hr.height / 2;
            let nearest = null, minDist = Infinity;
            document.querySelectorAll('.npc').forEach(mob => {
                const tip = mob.getAttribute('tip');
                if (!tip || !conditionFn(tip)) return;
                if (MBot.config.FORBIDDEN_MOBS.some(n => tip.includes(n))) return;
                const r  = mob.getBoundingClientRect();
                const dx = hx - (r.left + r.width  / 2);
                const dy = hy - (r.top  + r.height / 2);
                const d  = Math.hypot(dx, dy);
                if (d < minDist) { minDist = d; nearest = mob; }
            });
            if (nearest) clickElement(nearest);
            handleBattleUISI();
        }

        const MONSTER_TYPES = new Set([2, 3, 9]);

        function attackNearestNI(conditionFn) {
            if (!window.Engine) return;
            if (MBot.bot.inBattle) return;
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
                if (nearest) {
                    MBot.bot.inBattle = true;
                    window._g(`fight&a=attack&id=${nearest.d.id}`);
                }
            } catch (err) {
                console.warn('[BOT NI] attackNearest error:', err);
            }
        }

        return {
            attackNearest(conditionFn) {
                if (MBot.adapter.isNI) attackNearestNI(conditionFn);
                else attackNearestSI(conditionFn);
            }
        };
    })();

    // ── heal ──────────────────────────────────────────────────────────────
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

    // ── farm ──────────────────────────────────────────────────────────────
    MBot.farm = (() => {
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

        function tick() {
            const { minLevel, maxLevel, mobName } = getFilters();
            const conditionFn = MBot.adapter.isNI
                ? buildConditionNI(minLevel, maxLevel, mobName)
                : buildConditionSI(minLevel, maxLevel, mobName);
            MBot.combat.attackNearest(conditionFn);
            MBot.heal.autoHeal();
        }

        return {
            start() {
                const { minLevel, maxLevel, mobName } = getFilters();
                MBot.storage.setMany({ mobMinLevel: minLevel ?? '', mobMaxLevel: maxLevel ?? '', mobName });
                MBot.bot.start('farm', tick);
            }
        };
    })();

    // ── search ────────────────────────────────────────────────────────────
    MBot.search = (() => {
        function buildConditionNI() {
            const { targetHeroes, targetElites } = MBot.bot;
            return d => {
                if (!d.name) return false;
                const lt = d.name.toLowerCase();
                return targetHeroes.some(h => lt.includes(h)) ||
                       targetElites.some(e => lt.includes(e));
            };
        }

        function buildConditionSI() {
            const { targetHeroes, targetElites } = MBot.bot;
            return tip => {
                const lt = tip.toLowerCase();
                return targetHeroes.some(h => lt.includes(h)) ||
                       targetElites.some(e => lt.includes(e));
            };
        }

        function tick() {
            const conditionFn = MBot.adapter.isNI ? buildConditionNI() : buildConditionSI();
            MBot.combat.attackNearest(conditionFn);
            MBot.heal.autoHeal();
        }

        return {
            start() {
                MBot.bot.targetHeroes = document.getElementById('heroes-input').value
                    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                MBot.bot.targetElites = document.getElementById('elites-input').value
                    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                MBot.bot.start('search', tick);
            }
        };
    })();

    // ── init ──────────────────────────────────────────────────────────────
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

    MBot.adapter.onBattleClose(() => MBot.heal.autoHeal());

    document.getElementById('start-farm')        .addEventListener('click', () => MBot.farm.start());
    document.getElementById('stop-farm')         .addEventListener('click', () => MBot.bot.stop());
    document.getElementById('start-search')      .addEventListener('click', () => MBot.search.start());
    document.getElementById('stop-search')       .addEventListener('click', () => MBot.bot.stop());
    document.getElementById('refresh-inv')       .addEventListener('click', () => MBot.inventory.render());
    document.getElementById('save-heal-settings').addEventListener('click', () => {
        const threshold = parseInt(document.getElementById('heal-threshold').value) || 30;
        MBot.bot.healThreshold = threshold;
        MBot.storage.set('healThreshold', threshold);
        const notice = document.getElementById('heal-save-notice');
        notice.style.display = 'block';
        setTimeout(() => { notice.style.display = 'none'; }, 2000);
    });

})();
