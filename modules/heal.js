MBot.heal = (() => {
    function readHP() {
        const life1 = document.getElementById("life1");
        if (!life1) return null;
        const tip   = life1.getAttribute("tip") || "";
        const match = tip.match(/([\d\s]+)\s*\/\s*([\d\s]+)/);
        if (!match) return null;
        const current = parseInt(match[1].replace(/\s/g, ""));
        const max     = parseInt(match[2].replace(/\s/g, ""));
        if (!max || isNaN(current)) return null;
        return Math.round((current / max) * 100);
    }

    return {
        readHP,

        autoHeal() {
            const hp = readHP();
            MBot.ui.updateHP(hp);

            if (hp === null || hp > MBot.bot.healThreshold) return;

            const now = Date.now();
            if (now - MBot.bot.lastHealTime < MBot.config.HEAL_COOLDOWN_MS) return;

            const { healSlotEl, healItemId } = MBot.bot;
            if (!healSlotEl || !healItemId) return;

            if (!window.g || !g.item || !g.item[healItemId]) {
                console.warn("[BOT] Przedmiot zniknął z EQ (zużyty?).");
                MBot.bot.healSlotEl = null;
                MBot.bot.healItemId = null;
                MBot.storage.set("healItemId", null);
                MBot.inventory.clearPreview();
                MBot.inventory.render();
                return;
            }

            MBot.bot.lastHealTime = now;
            console.log(`[BOT] HP ${hp}% — używam: ${g.item[healItemId].name}`);

            if (typeof moveItemSafe === "function") {
                moveItemSafe(healItemId, "st=1");
            } else {
                $(healSlotEl).trigger("dblclick");
            }
        }
    };
})();
