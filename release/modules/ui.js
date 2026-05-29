MBot.ui = (() => {
    const CSS = `
        #mbot-root {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: #1a1a1a;
            border: 1px solid #3a3a3a;
            border-radius: 10px;
            z-index: 99999;
            color: #e0e0e0;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.7);
            user-select: none;
        }
        #mbot-header {
            background: #111;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 10px 10px 0 0;
            cursor: grab;
        }
        #mbot-header.minimized { border-radius: 10px; }
        #mbot-header:active { cursor: grabbing; }
        #mbot-header-title { font-weight: bold; font-size: 13px; letter-spacing: 1px; }
        #mbot-header-controls { display: flex; align-items: center; gap: 8px; }
        #mbot-status-dot { font-size: 10px; color: #666; }
        #mbot-minimize {
            background: #2a2a2a;
            border: 1px solid #444;
            color: #ccc;
            border-radius: 4px;
            width: 22px;
            height: 22px;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
        }
        #mbot-minimize:hover { background: #3a3a3a; }
        #mbot-body { border-top: 1px solid #2a2a2a; }
        #mbot-tabs {
            display: flex;
            gap: 4px;
            padding: 8px 8px 0;
            background: #161616;
            border-bottom: 1px solid #2a2a2a;
        }
        .mbot-tab {
            flex: 1;
            background: #252525;
            border: 1px solid #3a3a3a;
            border-bottom: none;
            color: #999;
            border-radius: 5px 5px 0 0;
            padding: 5px 4px;
            cursor: pointer;
            font-size: 11px;
            transition: background 0.12s;
        }
        .mbot-tab:hover { background: #333; color: #ccc; }
        .mbot-tab.active { background: #1a1a1a; color: #e0e0e0; border-color: #484848; }
        .mbot-panel { padding: 10px; display: none; }
        .mbot-panel.active { display: block; }
        .mbot-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
        }
        .mbot-row label { color: #aaa; white-space: nowrap; flex-shrink: 0; }
        .mbot-label { display: block; color: #aaa; margin-bottom: 3px; font-size: 11px; }
        #mbot-root input[type=number],
        #mbot-root input[type=text] {
            background: #2a2a2a;
            border: 1px solid #444;
            color: #e0e0e0;
            border-radius: 4px;
            padding: 3px 6px;
            font-size: 11px;
            flex: 1;
        }
        .mbot-btn-row { display: flex; gap: 6px; margin-top: 8px; }
        .mbot-btn-start {
            flex: 1;
            background: #1a3a1a;
            border: 1px solid #3a7a3a;
            color: #8f8;
            border-radius: 5px;
            padding: 5px;
            cursor: pointer;
            font-size: 11px;
        }
        .mbot-btn-start:hover { background: #2a4a2a; }
        .mbot-btn-stop {
            flex: 1;
            background: #3a1a1a;
            border: 1px solid #7a3a3a;
            color: #f88;
            border-radius: 5px;
            padding: 5px;
            cursor: pointer;
            font-size: 11px;
        }
        .mbot-btn-stop:hover { background: #4a2a2a; }
        .mbot-btn-save {
            flex: 1;
            background: #1a2a3a;
            border: 1px solid #3a5a7a;
            color: #8af;
            border-radius: 5px;
            padding: 5px;
            cursor: pointer;
            font-size: 11px;
        }
        .mbot-btn-save:hover { background: #1a3a4a; }
        #mbot-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 10px;
            background: #111;
            border-top: 1px solid #2a2a2a;
            border-radius: 0 0 10px 10px;
            font-size: 10px;
        }
        #mbot-mode-label { color: #666; }
        #mbot-hp-label { color: #888; }
        .mbot-sep { border-top: 1px solid #2a2a2a; margin: 8px 0; }
        #heal-selected {
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 5px;
            padding: 5px 8px;
            margin-bottom: 8px;
            min-height: 32px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        #inv-grid {
            display: grid;
            grid-template-columns: repeat(5, 50px);
            gap: 4px;
            margin: 6px 0;
            max-height: 216px;
            overflow-y: auto;
        }
        #inv-grid .slot {
            width: 50px;
            height: 50px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: border-color 0.12s;
            box-sizing: border-box;
        }
        #inv-grid .slot:hover { border-color: #888; }
        #inv-grid .slot.selected { border: 2px solid #4caf50; background: #1a2e1a; }
        #inv-grid .slot img { width: 80%; height: 80%; object-fit: contain; pointer-events: none; }
        #inv-grid .slot .amount {
            position: absolute;
            bottom: 1px;
            right: 2px;
            font-size: 9px;
            color: #fff;
            text-shadow: 0 0 3px #000;
            pointer-events: none;
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
        #route-steps-list {
            max-height: 110px; overflow-y: auto; margin-bottom: 4px; min-height: 22px;
        }
        .route-step {
            display: flex; align-items: center; gap: 4px;
            padding: 3px 5px; border-radius: 3px; margin-bottom: 2px;
            background: #222; border: 1px solid #333; font-size: 10px; color: #ccc;
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
                    <div class="mbot-row" style="gap:8px;">
                        <input type="checkbox" id="autobattle-enabled" style="margin:0;width:auto;flex:0;cursor:pointer;">
                        <label for="autobattle-enabled" style="white-space:normal;line-height:1.3;cursor:pointer;color:#aaa;">Szybka walka (autobattle)</label>
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
                        <input type="text" id="gateway-dest" placeholder="dowolna..." title="Część nazwy mapy docelowej z tip bramy">
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
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                        <span style="font-size:10px;color:#666;">Etapy</span>
                        <div style="display:flex;gap:4px;">
                            <button class="mbot-btn-save" id="route-step-prev" style="flex:0;padding:2px 8px;font-size:11px;" title="Poprzedni etap">‹</button>
                            <button class="mbot-btn-save" id="route-step-next" style="flex:0;padding:2px 8px;font-size:11px;" title="Następny etap">›</button>
                        </div>
                    </div>
                    <div id="route-steps-list"><span class="route-hint">Brak etapów — dodaj powyżej</span></div>
                    <div class="mbot-btn-row" style="margin-top:4px;">
                        <button class="mbot-btn-start" id="start-route">▶ Start</button>
                        <button class="mbot-btn-stop"  id="stop-route">■ Stop</button>
                        <button class="mbot-btn-stop"  id="clear-route" style="flex:0;padding:5px 10px;" title="Wyczyść wszystkie etapy">🗑</button>
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
                    <button class="mbot-btn-start active" id="captcha-toggle" data-active="1">■ Wyłącz auto-CAPTCHA</button>
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
                off:    { text: "● OFF",    color: "#666"    },
                farm:   { text: "● FARM",   color: "#4caf50" },
                route:  { text: "● ROUTE",  color: "#ffa726" },
                search: { text: "● SEARCH", color: "#64b5f6" }
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
