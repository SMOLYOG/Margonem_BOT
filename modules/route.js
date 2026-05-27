MBot.route = (() => {
    const NO_MOBS_THRESHOLD = 10;

    let _steps = [];       // [{mobs: Set<string>, gateway: string|null}]
    let _currentStep = 0;

    function _gatewayName(tip) {
        const tmp = document.createElement('div');
        tmp.innerHTML = tip;
        const bold = tmp.querySelector('b');
        return (bold ? bold.textContent : tmp.textContent).trim() || '(brama)';
    }

    function _buildConditionSI(mobs) {
        return tip => {
            if (/Teleport|Grota|Wejście/.test(tip)) return false;
            if (mobs.size === 0) return false;
            const name = (MBot.adapter.extractNameFromTip(tip) || '').toLowerCase();
            return mobs.has(name);
        };
    }

    function _buildConditionNI(mobs) {
        return d => {
            if (!d.name || mobs.size === 0) return false;
            return mobs.has(d.name.toLowerCase());
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

    function _saveState() {
        MBot.storage.setMany({
            routeSteps: _steps.map(s => ({ mobs: [...s.mobs], gateway: s.gateway })),
            routeCurrentStep: _currentStep
        });
    }

    function _tryGateway(gatewayKey) {
        if (!gatewayKey) return;
        const gateways = [...document.querySelectorAll('.gw')];
        const target = gateways.find(gw => _gatewayName(gw.getAttribute('tip') || '') === gatewayKey);
        if (!target) {
            console.warn('[BOT Route] Nie znaleziono bramy:', gatewayKey);
            return;
        }
        const nextStep = (_currentStep + 1) % _steps.length;
        // Save next step BEFORE click — in case gateway causes full page reload
        MBot.storage.set('routeCurrentStep', nextStep);
        console.log('[BOT Route] Brama:', gatewayKey, '→ etap', nextStep + 1, '/', _steps.length);
        MBot.bot.transitioning = true;
        try { _clickEl(target); } catch(e) {}
        setTimeout(() => {
            _currentStep = nextStep;
            MBot.bot.transitioning = false;
        }, 4000);
    }

    function tick() {
        if (MBot.bot.transitioning) return;
        const step = _steps[_currentStep];
        if (!step) return;

        const conditionFn = MBot.adapter.isNI
            ? _buildConditionNI(step.mobs)
            : _buildConditionSI(step.mobs);
        const attacked = MBot.combat.attackNearest(conditionFn);
        MBot.heal.autoHeal();

        const inOrJustAfterBattle = Date.now() - MBot.bot.lastAttackTime < 8000;
        if (attacked || inOrJustAfterBattle) {
            MBot.bot.noMobsTicks = 0;
        } else {
            MBot.bot.noMobsTicks++;
            if (MBot.bot.noMobsTicks >= NO_MOBS_THRESHOLD) {
                MBot.bot.noMobsTicks = 0;
                _tryGateway(step.gateway);
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

        addStep(names, gateway) {
            _steps.push({
                mobs: new Set(names.map(n => n.toLowerCase())),
                gateway: gateway || null
            });
            _saveState();
        },

        removeStep(index) {
            _steps.splice(index, 1);
            if (_currentStep >= _steps.length && _steps.length > 0) _currentStep = _steps.length - 1;
            if (_steps.length === 0) _currentStep = 0;
            _saveState();
        },

        clearSteps() {
            _steps = [];
            _currentStep = 0;
            _saveState();
        },

        getSteps() {
            return _steps.map((s, i) => ({
                index: i,
                mobs: [...s.mobs],
                gateway: s.gateway,
                active: i === _currentStep && MBot.bot.mode === 'route'
            }));
        },

        loadFromStorage() {
            const saved = MBot.storage.get('routeSteps') || [];
            const savedStep = MBot.storage.get('routeCurrentStep') || 0;
            _steps = saved.map(s => ({
                mobs: new Set((s.mobs || []).map(n => n.toLowerCase())),
                gateway: s.gateway || null
            }));
            _currentStep = Math.min(savedStep, Math.max(0, _steps.length - 1));
        },

        start() {
            if (_steps.length === 0) {
                console.warn('[BOT Route] Brak etapów — dodaj etapy najpierw');
                return;
            }
            _saveState();
            MBot.bot.start('route', tick);
        }
    };
})();
