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

    // Wyciągnij literę z nazwy "*x*" → "x"
    function _letterOf(name) { return name.slice(1, -1); }

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
            const letters   = names.map(_letterOf);
            _log(`Gwiazdki: ${names.join(', ')} → litery: ${letters.join(', ')}`);

            // ── Strategia 1: bezpośrednie API gry ────────────────────────
            const CAW = window.CaptchaAnswerWaiter;
            if (typeof CAW === 'function') {
                try {
                    const waiter = new CAW();
                    // Zaloguj sourcę metod żeby zobaczyć jakich args potrzebują
                    _log('init src: '    + waiter.init?.toString().slice(0, 200));
                    _log('setAns src: '  + waiter.setCaptchaAnswer?.toString().slice(0, 200));
                    _log('sendSrv src: ' + waiter.startSendToServerWaitToCaptcha?.toString().slice(0, 200));

                    // Próbuj różne formy argumentów
                    const tries = [names, letters, names.join(','), letters.join(',')];
                    for (const arg of tries) {
                        try {
                            _log('Próba setCaptchaAnswer(' + JSON.stringify(arg) + ')');
                            if (waiter.init) waiter.init();
                            waiter.setCaptchaAnswer(arg);
                            await _delay(300);
                            waiter.startSendToServerWaitToCaptcha();
                            _log('✓ API call wysłany');
                            await _delay(5000);
                            _solving = false;
                            return;
                        } catch(e) { _log('  błąd: ' + e.message); }
                    }
                } catch(e) { _log('CaptchaAnswerWaiter error: ' + e.message); }
            }

            // ── Strategia 2: dodaj CSS klasę "selected" do przycisków ────
            // (game może śledzić stan przez klasę)
            _log('Strategia 2: CSS class toggle...');
            for (const btn of asterisks) {
                btn.classList.add('selected', 'active', 'pressed', 'checked');
                const span = btn.querySelector('span.gfont');
                if (span) span.classList.add('selected', 'active');
            }

            // ── Strategia 3: klikanie DOM (ostatni fallback) ─────────────
            _log('Strategia 3: DOM click...');
            for (const btn of asterisks) {
                const label = btn.querySelector('.label') || btn;
                const r = label.getBoundingClientRect();
                const x = r.left + r.width / 2, y = r.top + r.height / 2;
                const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
                if (window.jQuery) try { window.jQuery(label).trigger('click'); } catch(e) {}
                try { label.click(); } catch(e) {}
                label.dispatchEvent(new MouseEvent('click', opts));
                btn.dispatchEvent(new MouseEvent('click', opts));
                await _delay(200);
            }

            await _delay(500);

            // Potwierdz
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
        const label = span.closest('.label') || span.parentElement;
        const el = label || span;
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
