MBot.bot = {
    mode: null,
    intervalId: null,
    healSlotEl: null,
    healItemId: MBot.storage.get("healItemId"),
    healThreshold: MBot.storage.get("healThreshold") ?? 30,
    targetHeroes: [],
    targetElites: [],
    lastHealTime: 0,
    inBattle: false,
    noMobsTicks: 0,
    transitioning: false,

    start(mode, fn) {
        this.stop();
        this.mode = mode;
        this.intervalId = setInterval(fn, MBot.config.TICK_MS);
        MBot.storage.set('botMode', mode);
        MBot.ui.setStatus(mode);
    },

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.mode = null;
        this.inBattle = false;
        this.noMobsTicks = 0;
        this.transitioning = false;
        MBot.storage.set('botMode', null);
        MBot.ui.setStatus("off");
        MBot.ui.updateHP(null);
    }
};
