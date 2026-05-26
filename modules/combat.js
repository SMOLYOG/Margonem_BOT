MBot.combat = (() => {
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
        const hero = document.getElementById('hero');
        if (!hero) return;

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

        if (nearest) clickElement(nearest);
        handleBattleUISI();
    }

    // ── NI helpers ────────────────────────────────────────────────────────
    // Typy NPC będące potworami do ataku: 2 = zwykły, 3 = agresywny, 9 = boss
    const MONSTER_TYPES = new Set([2, 3, 9]);

    function attackNearestNI(conditionFn) {
        if (!window.Engine) return;
        if (MBot.bot.inBattle) return;

        try {
            const hero = Engine.hero.autoPath.getCharacterPosition();

            let nearest = null;
            let minDist = Infinity;

            Engine.renderer.getList().forEach(o => {
                if (o.canvasObjectType !== 'NPC') return;
                if (!o.d || !MONSTER_TYPES.has(o.d.type)) return;
                if (MBot.config.FORBIDDEN_MOBS.some(n => (o.d.name || '').includes(n))) return;
                if (!conditionFn(o.d)) return;

                const d = Math.hypot(hero.x - o.d.x, hero.y - o.d.y);
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
            if (MBot.adapter.isNI) {
                attackNearestNI(conditionFn);
            } else {
                attackNearestSI(conditionFn);
            }
        }
    };
})();
