MBot.captcha = (() => {
    const CLICKER_URL = 'http://localhost:8765/captcha';
    let _observer = null;
    let _solving = false;

    function _log(msg) { console.log('[MBot CAPTCHA]', msg); }
    function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

    // Determine which symbol the captcha is asking for from the question text.
    function _targetSymbol() {
        const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
        if (/gwiazdk/.test(q))              return '*';
        if (/wykrzyknik/.test(q))           return '!';
        if (/dolar/.test(q))                return '$';
        if (/et\b|małp|ampersand/.test(q))  return '&';
        if (/hash|krzyż|płotek/.test(q))    return '#';
        if (/\bat\b/.test(q))               return '@';
        // Fallback: most common wrapper character among buttons
        const counts = {};
        document.querySelectorAll('.captcha__buttons .btn.btn-wood span.gfont').forEach(s => {
            const n = s.getAttribute('name') || '';
            if (n.length >= 3) { const c = n[0]; if (n.endsWith(c)) counts[c] = (counts[c] || 0) + 1; }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '*';
    }

    function _isTarget(btn, sym) {
        const n = btn.querySelector('span.gfont')?.getAttribute('name') || '';
        return n.length >= 3 && n.startsWith(sym) && n.endsWith(sym);
    }

    // Center point of an element in absolute screen coordinates (for pyautogui).
    function _center(el) {
        const r  = el.getBoundingClientRect();
        const ox = window.screenX + Math.round((window.outerWidth  - window.innerWidth)  / 2);
        const oy = window.screenY +            (window.outerHeight - window.innerHeight);
        return { x: Math.round(r.left + r.width / 2) + ox, y: Math.round(r.top + r.height / 2) + oy };
    }

    async function _solveCaptcha() {
        if (_solving) return;
        _solving = true;
        _log('=== Rozwiązuję CAPTCHA ===');
        try {
            const container = document.querySelector('.captcha__buttons');
            if (!container) { _log('Brak .captcha__buttons'); _solving = false; return; }

            const sym     = _targetSymbol();
            _log(`Symbol: "${sym}"`);

            const buttons = [...container.querySelectorAll('.btn.btn-wood')];
            const targets = buttons.filter(b => _isTarget(b, sym));
            const names   = targets.map(b => b.querySelector('span.gfont').getAttribute('name'));
            _log(`Docelowe: ${names.join(', ')}`);

            if (targets.length === 0) { _log('Brak pasujących kafelków'); _solving = false; return; }

            // Confirm button
            const confirmSpan = [...document.querySelectorAll('.captcha__confirm span.gfont')]
                .find(s => s.getAttribute('name') === 'Potwierdzam');
            const confirmBtn = confirmSpan?.closest('.btn');

            const payload = {
                tiles:   targets.map(_center),
                confirm: confirmBtn ? _center(confirmBtn) : null,
            };
            _log('Wysyłam do captcha_clicker: ' + JSON.stringify(payload.tiles));

            try {
                const res = await fetch(CLICKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const json = await res.json();
                _log('Odpowiedź: ' + JSON.stringify(json));
            } catch (e) {
                _log('Błąd fetch (czy captcha_clicker.py działa?): ' + e.message);
            }

            // Wait and check if captcha closed
            await _delay(4000);
            if (!document.querySelector('.captcha__buttons') ||
                document.querySelector('.captcha__buttons')?.offsetParent === null) {
                _log('✓ Captcha rozwiązana!');
            } else {
                _log('Captcha nadal otwarta.');
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
        const r = el.getBoundingClientRect();
        ['mousedown', 'mouseup', 'click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, {
                bubbles: true, cancelable: true, view: window,
                clientX: r.left + r.width / 2, clientY: r.top + r.height / 2,
            }));
        });
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
        const solveNow = [...document.querySelectorAll('span.gfont')]
            .find(s => s.getAttribute('name') === 'Rozwiąż teraz' && s.offsetParent !== null);
        if (solveNow) { _handleSolveNow(solveNow); return; }
        const container = document.querySelector('.captcha__buttons');
        if (container && container.offsetParent !== null) _solveCaptcha();
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
        },
    };
})();
