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
