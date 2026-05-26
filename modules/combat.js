MBot.combat = (() => {
    function clickElement(el) {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true,
            clientX: r.left + r.width  / 2,
            clientY: r.top  + r.height / 2
        }));
    }

    function handleBattleUI() {
        const autobattle = document.getElementById('autobattleButton');
        if (autobattle && autobattle.style.display !== 'none') autobattle.click();

        const battleClose = document.getElementById('battleclose');
        if (battleClose && battleClose.style.display !== 'none') battleClose.click();

        const loots = document.getElementById('loots_button');
        if (loots && loots.style.display !== 'none' && loots.innerText.trim()) {
            try { loots.click(); } catch (e) {}
        }
    }

    return {
        // Dostępne tylko w SI — w NI brak API do wykrywania pozycji mobów
        attackNearest(conditionFn) {
            if (MBot.adapter.isNI) return;

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
            handleBattleUI();
        }
    };
})();
