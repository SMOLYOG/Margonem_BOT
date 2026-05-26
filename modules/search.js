MBot.search = (() => {
    function tick() {
        const { targetHeroes, targetElites } = MBot.bot;
        MBot.combat.attackNearest(tip => {
            const lt = tip.toLowerCase();
            return targetHeroes.some(h => lt.includes(h)) ||
                   targetElites.some(e => lt.includes(e));
        });
        MBot.heal.autoHeal();
    }

    return {
        start() {
            MBot.bot.targetHeroes = document.getElementById("heroes-input").value
                .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
            MBot.bot.targetElites = document.getElementById("elites-input").value
                .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
            MBot.bot.start("search", tick);
        }
    };
})();
