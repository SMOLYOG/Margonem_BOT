(function() {
    const q = (document.querySelector('.captcha__question')?.textContent || '').toLowerCase();
    let sym = '*';
    if (/gwiazdk/.test(q))              sym = '*';
    else if (/wykrzyknik/.test(q))      sym = '!';
    else if (/dolar/.test(q))           sym = '$';
    else if (/et\b|małp|ampersand/.test(q)) sym = '&';
    else if (/hash|krzyż|płotek/.test(q))   sym = '#';
    console.log('[DEBUG] Pytanie:', q);
    console.log('[DEBUG] Symbol docelowy:', sym);

    const buttons = [...document.querySelectorAll('.captcha__buttons .btn.btn-wood')];
    const targets = buttons.filter(b => {
        const n = b.querySelector('span.gfont')?.getAttribute('name') || '';
        return n.length >= 3 && n.startsWith(sym) && n.endsWith(sym);
    });
    const letters = targets.map(b => b.querySelector('span.gfont').getAttribute('name').slice(1,-1));
    console.log('[DEBUG] Docelowe litery:', letters);

    const orig = window._g;
    window._g = function(...args) {
        console.log('[DEBUG] >>> _g URL:', String(args[0]).slice(0, 500));
        return orig?.apply(this, args);
    };

    const w = new CaptchaAnswerWaiter();
    w.setCaptchaAnswer(letters);
    w.startSendToServerWaitToCaptcha();

    setTimeout(() => { window._g = orig; console.log('[DEBUG] _g przywrócone'); }, 3000);
})();
