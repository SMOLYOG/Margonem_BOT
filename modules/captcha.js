MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _isAsterisk(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        return name.startsWith('*') && name.endsWith('*');
    }

    function _letter(name) { return name.slice(1, -1); }

    function _findExistingInstance() {
        // Szukaj istniejącej instancji CaptchaAnswerWaiter w globalach
        for (const key of Object.keys(window)) {
            try {
                const val = window[key];
                if (val && typeof val === 'object' && typeof val.setCaptchaAnswer === 'function') {
                    _log('Instancja CaptchaAnswerWaiter znaleziona: window.' + key);
                    return val;
                }
            } catch(e) {}
        }
        return null;
    }

    async function _solveCaptcha() {
        if (_solving) return;
        _solving = true;
        _log('=== Rozwiązuję CAPTCHA ===');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }

            const buttons   = container.querySelectorAll('.btn.btn-wood');
            const asterisks = [...buttons].filter(_isAsterisk);
            const names     = asterisks.map(b => b.querySelector('span.gfont').getAttribute('name'));
            const letters   = names.map(_letter);
            _log(`Gwiazdki: ${names.join(', ')}`);

            // ── 1. Szukaj istniejącej instancji w globalach ───────────────
            let waiter = _findExistingInstance();

            // ── 2. Jeśli nie ma — stwórz nową ────────────────────────────
            if (!waiter && typeof window.CaptchaAnswerWaiter === 'function') {
                try {
                    waiter = new window.CaptchaAnswerWaiter();
                    _log('Nowa instancja: ' + Object.keys(waiter).join(', '));
                } catch(e) { _log('new CaptchaAnswerWaiter error: ' + e.message); }
            }

            if (waiter) {
                // Zaloguj source kluczowych metod
                _log('setCaptchaAnswer:\n' + waiter.setCaptchaAnswer?.toString().slice(0, 400));
                _log('startSend:\n'        + waiter.startSendToServerWaitToCaptcha?.toString().slice(0, 400));
                _log('init:\n'             + waiter.init?.toString().slice(0, 200));

                try { if (waiter.init) waiter.init(); } catch(e) { _log('init err: ' + e.message); }

                // Próba A: setCaptchaAnswer raz per kafelek (litera bez gwiazdek)
                _log('--- Próba A: po jednej literze ---');
                let ok = false;
                try {
                    for (const letter of letters) {
                        _log('  setCaptchaAnswer(' + letter + ')');
                        waiter.setCaptchaAnswer(letter);
                        await _delay(150);
                    }
                    await _delay(300);
                    _log('  startSendToServerWaitToCaptcha()');
                    waiter.startSendToServerWaitToCaptcha();
                    _log('✓ Próba A wysłana');
                    ok = true;
                } catch(e) { _log('Próba A błąd: ' + e.message); }

                if (!ok) {
                    // Próba B: setCaptchaAnswer raz per kafelek (pełna nazwa *x*)
                    _log('--- Próba B: po jednej pełnej nazwie ---');
                    try {
                        for (const name of names) {
                            _log('  setCaptchaAnswer(' + name + ')');
                            waiter.setCaptchaAnswer(name);
                            await _delay(150);
                        }
                        await _delay(300);
                        waiter.startSendToServerWaitToCaptcha();
                        _log('✓ Próba B wysłana');
                        ok = true;
                    } catch(e) { _log('Próba B błąd: ' + e.message); }
                }

                if (!ok) {
                    // Próba C: setCaptchaAnswer z tablicą liter
                    _log('--- Próba C: tablica liter ---');
                    try {
                        waiter.setCaptchaAnswer(letters);
                        await _delay(300);
                        waiter.startSendToServerWaitToCaptcha();
                        _log('✓ Próba C wysłana');
                        ok = true;
                    } catch(e) { _log('Próba C błąd: ' + e.message); }
                }

                if (!ok) {
                    // Próba D: setCaptchaAnswer z elementem DOM przycisku
                    _log('--- Próba D: z elementem DOM ---');
                    try {
                        for (let i = 0; i < asterisks.length; i++) {
                            waiter.setCaptchaAnswer(letters[i], asterisks[i]);
                            await _delay(150);
                        }
                        await _delay(300);
                        waiter.startSendToServerWaitToCaptcha();
                        _log('✓ Próba D wysłana');
                        ok = true;
                    } catch(e) { _log('Próba D błąd: ' + e.message); }
                }

                if (ok) {
                    await _delay(5000);
                    _solving = false;
                    return;
                }
            }

            // ── Fallback: sprawdź klasy CSS przycisków po kliknięciu ──────
            _log('=== Fallback DOM ===');
            // Sprawdź jakie klasy mają przyciski przed kliknięciem
            const firstBtn = buttons[0];
            _log('btn classes przed: ' + firstBtn?.className);

            for (const btn of asterisks) {
                const label = btn.querySelector('.label') || btn;
                const r = label.getBoundingClientRect();
                const opts = { bubbles: true, cancelable: true, view: window,
                    clientX: r.left + r.width/2, clientY: r.top + r.height/2 };
                if (window.jQuery) try { window.jQuery(label).trigger('click'); } catch(e) {}
                try { label.click(); } catch(e) {}
                label.dispatchEvent(new MouseEvent('click', opts));
                btn.dispatchEvent(new MouseEvent('click', opts));
                await _delay(100);
            }

            _log('btn classes po: ' + firstBtn?.className);

            await _delay(400);
            const confirmBtn = document.querySelector('.captcha__confirm .btn.btn-wood');
            if (confirmBtn) {
                _log('Klikam "Potwierdzam"');
                const lbl = confirmBtn.querySelector('.label') || confirmBtn;
                if (window.jQuery) try { window.jQuery(lbl).trigger('click'); } catch(e) {}
                try { lbl.click(); } catch(e) {}
                const r = lbl.getBoundingClientRect();
                lbl.dispatchEvent(new MouseEvent('click', {
                    bubbles: true, cancelable: true, view: window,
                    clientX: r.left + r.width/2, clientY: r.top + r.height/2
                }));
            }
        } catch (err) {
            _log('Błąd główny: ' + err.message);
        }
        await _delay(5000);
        _solving = false;
    }

    async function _handleSolveNow(span) {
        _solving = true;
        _log('Klikam "Rozwiąż teraz"...');
        const el = span.closest('.label') || span.parentElement || span;
        if (window.jQuery) try { window.jQuery(el).trigger('click'); } catch(e) {}
        try { el.click(); } catch(e) {}
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window,
            clientX: r.left + r.width/2, clientY: r.top + r.height/2
        }));
        for (let i = 0; i < 30; i++) {
            await _delay(250);
            if (document.querySelector('.captcha__buttons')) {
                await _delay(1500);
                _solving = false;
                await _solveCaptcha();
                return;
            }
        }
        _log('Timeout: .captcha__buttons nie pojawiło się');
        _solving = false;
    }

    function _check() {
        if (_solving) return;
        const solveNow = [...document.querySelectorAll('span.gfont')].find(
            s => s.getAttribute('name') === 'Rozwiąż teraz'
        );
        if (solveNow && solveNow.offsetParent !== null) {
            _handleSolveNow(solveNow);
            return;
        }
        const container = document.querySelector('.captcha__buttons');
        if (container && container.offsetParent !== null) {
            _solveCaptcha();
        }
    }

    return {
        start() {
            if (_observer) return;
            _log('Obserwator CAPTCHA uruchomiony');
            _observer = new MutationObserver(_check);
            _observer.observe(document.body, { childList: true, subtree: true });
            _check();
        },
        stop() {
            if (_observer) { _observer.disconnect(); _observer = null; _log('Obserwator zatrzymany'); }
        }
    };
})();
