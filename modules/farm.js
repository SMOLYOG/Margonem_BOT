MBot.farm = (() => {
    const NO_MOBS_THRESHOLD = 10; // 10 * 400ms = 4s bez moba → próba bramy

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
            clientX: r.left + r.width  / 2,
            clientY: r.top  + r.height / 2
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
            if (attacked || MBot.combat.isInBattle()) {
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
