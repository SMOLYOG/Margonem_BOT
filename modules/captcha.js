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

            const waiter = new window.CaptchaAnswerWaiter();

            // setCaptchaAnswer: function(n){t=n} — jedno wywołanie z całą tablicą
            // Próbujemy kolejno: tablica liter, tablica pełnych nazw, string przecinkowy
            const formats = [
                { label: 'tablica liter',       val: letters },
                { label: 'tablica nazw (*x*)',   val: names },
                { label: 'string liter (,)',      val: letters.join(',') },
                { label: 'string nazw (,)',       val: names.join(',') },
                { label: 'string liter bez sep',  val: letters.join('') },
            ];

            for (const fmt of formats) {
                _log(`Próba [${fmt.label}]: setCaptchaAnswer(${JSON.stringify(fmt.val)})`);
                waiter.setCaptchaAnswer(fmt.val);
                await _delay(200);
                waiter.startSendToServerWaitToCaptcha();
                _log('  → wysłano, czekam 3s na reakcję gry...');
                await _delay(3000);

                // Sprawdź czy captcha zniknęła
                if (!document.querySelector('.captcha__buttons') ||
                    document.querySelector('.captcha__buttons')?.offsetParent === null) {
                    _log('✓ Captcha rozwiązana! Format: ' + fmt.label);
                    _solving = false;
                    return;
                }
                _log('  Captcha nadal otwarta — próbuję następny format');
                // Stwórz nową instancję dla kolejnej próby (stara może być "zużyta")
                try { Object.assign(waiter, new window.CaptchaAnswerWaiter()); } catch(e) {}
            }

            _log('Wszystkie formaty nieudane — captcha może wymagać innej metody');
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
