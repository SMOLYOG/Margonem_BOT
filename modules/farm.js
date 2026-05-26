MBot.farm = (() => {
    function getFilters() {
        return {
            minLevel: parseInt(document.getElementById("mob-min-level").value) || null,
            maxLevel: parseInt(document.getElementById("mob-max-level").value) || null,
            mobName:  (document.getElementById("mob-name").value || "").toLowerCase().trim()
        };
    }

    function tick() {
        const { minLevel, maxLevel, mobName } = getFilters();

        MBot.combat.attackNearest(tip => {
            if (/Teleport|Grota|Wejście/.test(tip)) return false;
            const lvlMatch = tip.match(/<span[^>]*>(\d+)\s*lvl/);
            if (!lvlMatch) return false;
            const lvl = parseInt(lvlMatch[1]);
            if (minLevel && lvl < minLevel) return false;
            if (maxLevel && lvl > maxLevel) return false;
            if (mobName) {
                const name = MBot.inventory.extractNameFromTip(tip) || "";
                if (!name.toLowerCase().includes(mobName)) return false;
            }
            return true;
        });

        MBot.heal.autoHeal();
    }

    return {
        start() {
            const { minLevel, maxLevel, mobName } = getFilters();
            MBot.storage.setMany({
                mobMinLevel: minLevel ?? "",
                mobMaxLevel: maxLevel ?? "",
                mobName
            });
            MBot.bot.start("farm", tick);
        }
    };
})();
