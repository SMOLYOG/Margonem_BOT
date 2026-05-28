(function() {
    // 1. Determine target symbol from question text
    const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
    let sym = '*';
    if (/gwiazdk/.test(q))                 sym = '*';
    else if (/wykrzyknik/.test(q))         sym = '!';
    else if (/dolar/.test(q))              sym = '$';
    else if (/et\b|małp|ampersand/.test(q)) sym = '&';
    else if (/hash|krzyż|płotek/.test(q))  sym = '#';
    console.log('[DEBUG] Pytanie:', q);
    console.log('[DEBUG] Symbol:', sym);

    // 2. Find target buttons
    const buttons = [...document.querySelectorAll('.captcha__buttons .btn.btn-wood')];
    const targets = buttons.filter(b => {
        const n = b.querySelector('span.gfont')?.getAttribute('name') || '';
        return n.length >= 3 && n.startsWith(sym) && n.endsWith(sym);
    });
    const letters = targets.map(b => b.querySelector('span.gfont').getAttribute('name').slice(1, -1));
    console.log('[DEBUG] Docelowe litery:', letters);

    // 3. Intercept _g to log what gets sent
    const orig = window._g;
    window._g = function(...args) {
        console.log('[DEBUG] >>> _g URL:', String(args[0]).slice(0, 500));
        return orig?.apply(this, args);
    };

    // 4. Set the answer via CaptchaAnswerWaiter
    const w = new CaptchaAnswerWaiter();
    w.setCaptchaAnswer(letters);
    console.log('[DEBUG] setCaptchaAnswer ustawione:', letters);

    // 5. Click the confirm button ("Potwierdzam") via DOM
    function clickEl(el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        ['mousedown','mouseup','click'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy }));
        });
    }

    const confirmSpan = [...document.querySelectorAll('.captcha__confirm span.gfont')]
        .find(s => s.getAttribute('name') === 'Potwierdzam');
    const confirmBtn = confirmSpan?.closest('.btn');

    if (confirmBtn) {
        console.log('[DEBUG] Klikam Potwierdzam...');
        clickEl(confirmBtn);
    } else {
        console.warn('[DEBUG] Nie znaleziono przycisku Potwierdzam — używam startSendToServerWaitToCaptcha');
        w.startSendToServerWaitToCaptcha();
    }

    setTimeout(() => { window._g = orig; console.log('[DEBUG] _g przywrócone'); }, 5000);
})();
