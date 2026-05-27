MBot.captcha = (() => {
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Read the question to determine which symbol the captcha is asking for.
    // e.g. "Zaznacz wszystkie odpowiedzi z gwiazdką" → '*'
    function _targetSymbol() {
        const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
        if (/gwiazdk/.test(q))           return '*';
        if (/wykrzyknik/.test(q))        return '!';
        if (/dolar/.test(q))             return '$';
        if (/et\b|małp|ampersand/.test(q)) return '&';
        if (/hash|krzyż|płotek/.test(q)) return '#';
        if (/\bat\b/.test(q))            return '@';
        // Fallback: find the symbol that wraps most buttons
        const counts = {};
        document.querySelectorAll('.captcha__buttons .btn.btn-wood span.gfont').forEach(s => {
            const n = s.getAttribute('name') || '';
            if (n.length >= 3) { const c = n[0]; if (n.endsWith(c)) counts[c] = (counts[c] || 0) + 1; }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '*';
    }

    function _isTarget(btn) {
        const span = btn.querySelector('span.gfont');
        if (!span) return false;
        const name = span.getAttribute('name') || '';
        const sym = _targetSymbol();
        return name.length >= 3 && name.startsWith(sym) && name.endsWith(sym);
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

            const sym       = _targetSymbol();
            _log(`Symbol docelowy: "${sym}"`);
            const buttons   = container.querySelectorAll('.btn.btn-wood');
            const targets   = [...buttons].filter(_isTarget);
            const names     = targets.map(b => b.querySelector('span.gfont').getAttribute('name'));
            const letters   = names.map(_letter);
            _log(`Docelowe: ${names.join(', ')} → litery: ${letters.join(', ')}`);

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
