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

    // Przechwytuje _g żeby zobaczyć co gra wysyła do serwera
    function _interceptG(callback) {
        const orig = window._g;
        window._g = function(...args) {
            const url = String(args[0] || '');
            if (/captcha/i.test(url)) {
                _log('>>> _g URL: ' + url.slice(0, 500));
                callback(url);
            }
            return orig?.apply(this, args);
        };
        return () => { window._g = orig; };
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
            _log(`Gwiazdki: ${names.join(', ')} → litery: ${letters.join(', ')}`);

            if (typeof window.CaptchaAnswerWaiter !== 'function') {
                _log('Brak CaptchaAnswerWaiter!');
                _solving = false;
                return;
            }

            // Zaloguj co gra wysyła do serwera (diagnostyka formatu)
            let capturedUrl = null;
            const restore = _interceptG(url => { capturedUrl = url; });

            try {
                const waiter = new window.CaptchaAnswerWaiter();

                // Próba 1: tablica liter ['a','b','d']
                _log('Próba: setCaptchaAnswer(' + JSON.stringify(letters) + ')');
                waiter.setCaptchaAnswer(letters);
                await _delay(100);
                waiter.startSendToServerWaitToCaptcha();
                await _delay(500);
                _log('Przechwycony URL: ' + (capturedUrl || 'brak — _g nie wywołany'));

            } finally {
                restore();
            }

            // Czekaj na zamknięcie captchy
            await _delay(4000);
            if (!document.querySelector('.captcha__buttons') ||
                document.querySelector('.captcha__buttons')?.offsetParent === null) {
                _log('✓ Captcha rozwiązana!');
            } else {
                _log('Captcha nadal otwarta. Sprawdź URL w logu powyżej.');
            }

        } catch (err) {
            _log('Błąd: ' + err.message);
        }
        await _delay(2000);
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
            clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
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
