MBot.farm = (() => {
    function getFilters() {
        return {
            minLevel: parseInt(document.getElementById('mob-min-level').value) || null,
            maxLevel: parseInt(document.getElementById('mob-max-level').value) || null,
            mobName:  (document.getElementById('mob-name').value || '').toLowerCase().trim()
        };
    }

    // conditionFn dla NI: dostaje obiekt d (dane NPC z Engine)
    function buildConditionNI(minLevel, maxLevel, mobName) {
        return d => {
            if (!d.name) return false;
            if (minLevel && (d.lvl || 0) < minLevel) return false;
            if (maxLevel && (d.lvl || 0) > maxLevel) return false;
            if (mobName && !d.name.toLowerCase().includes(mobName)) return false;
            return true;
        };
    }

    // conditionFn dla SI: dostaje string HTML z atrybutu tip
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
            MBot.storage.setMany({
                mobMinLevel: minLevel ?? '',
                mobMaxLevel: maxLevel ?? '',
                mobName
            });
            MBot.bot.start('farm', tick);
        }
    };
})();
