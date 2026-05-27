MBot.route = (() => {
    const NO_MOBS_THRESHOLD = 10;

    let _selectedMobs = new Set();
    let _selectedGateway = null;

    function _gatewayName(tip) {
        const tmp = document.createElement('div');
        tmp.innerHTML = tip;
        const bold = tmp.querySelector('b');
        return (bold ? bold.textContent : tmp.textContent).trim() || '(brama)';
    }

    function _buildConditionSI() {
        return tip => {
            if (/Teleport|Grota|Wejście/.test(tip)) return false;
            if (_selectedMobs.size === 0) return false;
            const name = (MBot.adapter.extractNameFromTip(tip) || '').toLowerCase();
            return _selectedMobs.has(name);
        };
    }

    function _buildConditionNI() {
        return d => {
            if (!d.name || _selectedMobs.size === 0) return false;
            return _selectedMobs.has(d.name.toLowerCase());
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

    function _tryGateway() {
        const gateways = [...document.querySelectorAll('.gw')];
        const target = _selectedGateway
            ? gateways.find(gw => _gatewayName(gw.getAttribute('tip') || '') === _selectedGateway)
            : gateways[0];
        if (!target) return;
        console.log('[BOT Route] Przechodzę przez bramę:', _selectedGateway || '(pierwsza)');
        MBot.bot.transitioning = true;
        try { _clickEl(target); } catch(e) {}
        setTimeout(() => { MBot.bot.transitioning = false; }, 4000);
    }

    function tick() {
        if (MBot.bot.transitioning) return;
        const conditionFn = MBot.adapter.isNI ? _buildConditionNI() : _buildConditionSI();
        const attacked = MBot.combat.attackNearest(conditionFn);
        MBot.heal.autoHeal();

        // Nie liczymy "braku ataku" podczas walki — walka jest w toku
        if (attacked || MBot.combat.isInBattle()) {
            MBot.bot.noMobsTicks = 0;
        } else {
            MBot.bot.noMobsTicks++;
            if (MBot.bot.noMobsTicks >= NO_MOBS_THRESHOLD) {
                MBot.bot.noMobsTicks = 0;
                _tryGateway();
            }
        }
    }

    return {
        scanMobs() {
            const mobs = new Map();
            document.querySelectorAll('.npc').forEach(mob => {
                const tip = mob.getAttribute('tip') || '';
                if (/Teleport|Grota|Wejście/.test(tip)) return;
                if (MBot.config.FORBIDDEN_MOBS.some(n => tip.includes(n))) return;
                const name = MBot.adapter.extractNameFromTip(tip);
                if (!name) return;
                mobs.set(name, (mobs.get(name) || 0) + 1);
            });
            return mobs;
        },

        scanGateways() {
            return [...document.querySelectorAll('.gw')].map(gw => ({
                key:   _gatewayName(gw.getAttribute('tip') || ''),
                label: _gatewayName(gw.getAttribute('tip') || '')
            }));
        },

        setSelectedMobs(names) {
            _selectedMobs = new Set(names.map(n => n.toLowerCase()));
        },

        setSelectedGateway(key) {
            _selectedGateway = key || null;
        },

        start() {
            if (_selectedMobs.size === 0) {
                console.warn('[BOT Route] Nie wybrano mobów — skanuj i zaznacz najpierw');
                return;
            }
            MBot.bot.start('route', tick);
        }
    };
})();
