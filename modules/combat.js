MBot.combat = (() => {
    // ── Ban detection ─────────────────────────────────────────────────────
    // Wzorzec: "X sekund" w nowym elemencie DOM → ban na atakowanie
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

    // ── SI helpers ────────────────────────────────────────────────────────
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
        handleBattleUISI();
        if (Date.now() < MBot.bot.banUntil) return false;
        if (Date.now() - MBot.bot.lastAttackTime < MBot.config.ATTACK_COOLDOWN_MS) return false;

        const hero = document.getElementById('hero');
        if (!hero) return false;

        const hr = hero.getBoundingClientRect();
        const hx = hr.left + hr.width  / 2;
        const hy = hr.top  + hr.height / 2;

        let nearest = null;
        let minDist = Infinity;

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

        if (nearest) {
            MBot.bot.lastAttackTime = Date.now();
            clickElement(nearest);
            return true;
        }
        return false;
    }

    // ── NI helpers ────────────────────────────────────────────────────────
    const MONSTER_TYPES = new Set([2, 3, 9]);

    function attackNearestNI(conditionFn) {
        if (!window.Engine) return;
        if (MBot.bot.inBattle) return;
        if (Date.now() < MBot.bot.banUntil) return;

        try {
            const hx = Engine.hero.d.x;
            const hy = Engine.hero.d.y;
            if (hx == null || hy == null) return;

            let nearest = null;
            let minDist = Infinity;

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

    // ── Publiczne API ─────────────────────────────────────────────────────
    return {
        attackNearest(conditionFn) {
            if (MBot.adapter.isNI) { attackNearestNI(conditionFn); return false; }
            return attackNearestSI(conditionFn);
        }
    };
})();
