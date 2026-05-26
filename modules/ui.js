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
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
            margin: 6px 0;
            max-height: 180px;
            overflow-y: auto;
        }
        #inv-grid .slot {
            aspect-ratio: 1;
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
                        <button class="mbot-btn-stop"  id="stop-farm">■ Stop</button>
                    </div>
                </div>

                <div id="mbot-panel-search" class="mbot-panel">
                    <label class="mbot-label">Heroes (po przecinku):</label>
                    <input type="text" id="heroes-input" placeholder="np. Smok, Lich...">
                    <label class="mbot-label" style="margin-top:8px;">Elites (po przecinku):</label>
                    <input type="text" id="elites-input" placeholder="np. Wilk Elite...">
                    <div class="mbot-btn-row">
                        <button class="mbot-btn-start" id="start-search">▶ Start</button>
                        <button class="mbot-btn-stop"  id="stop-search">■ Stop</button>
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
