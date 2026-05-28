MBot.storage = (() => {
    const KEY = MBot.config.STORAGE_KEY;

    const DEFAULTS = {
        healThreshold: 30,
        mobMinLevel: "",
        mobMaxLevel: "",
        mobName: "",
        heroesInput: "",
        elitesInput: "",
        healItemId: null,
        healItemName: null,
        botMode: null,
        gatewayEnabled: false,
        gatewayDest: "",
        routeSteps: [],
        routeCurrentStep: 0
    };

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
        catch { return {}; }
    }

    return {
        get(key) {
            const stored = load();
            return key in stored ? stored[key] : (DEFAULTS[key] ?? null);
        },
        set(key, value) {
            const data = load();
            data[key] = value;
            localStorage.setItem(KEY, JSON.stringify(data));
        },
        setMany(obj) {
            const data = load();
            Object.assign(data, obj);
            localStorage.setItem(KEY, JSON.stringify(data));
        }
    };
})();
