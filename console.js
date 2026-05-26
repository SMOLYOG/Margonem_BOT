(() => {
    // Usuń poprzednią instancję jeśli istnieje
    const old = document.getElementById('mbot-root');
    if (old) {
        old.remove();
        document.getElementById('mbot-style')?.remove();
        if (window.MBot?.bot) MBot.bot.stop();
    }

    window.MBot = {};

    MBot.config = {
        FORBIDDEN_MOBS: ["Silny jeleń","Weszo","Rumianek","Lawenda","Pokrzywa","Mniszek","Tymianek","Szałwia"],
        TICK_MS: 400,
        HEAL_COOLDOWN_MS: 2000,
        STORAGE_KEY: "margonem_bot_v8"
    };

    MBot.storage = (() => {
        const KEY = MBot.config.STORAGE_KEY;
        const DEFAULTS = { healThreshold: 30, mobMinLevel: "", mobMaxLevel: "", mobName: "", healItemId: null };
        function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
        return {
            get(key) { const s = load(); return key in s ? s[key] : (DEFAULTS[key] ?? null); },
            set(key, value) { const d = load(); d[key] = value; localStorage.setItem(KEY, JSON.stringify(d)); },
            setMany(obj) { const d = load(); Object.assign(d, obj); localStorage.setItem(KEY, JSON.stringify(d)); }
        };
    })();

    MBot.adapter = (() => {
        const IFACE = document.getElementById('GAME_CANVAS') ? 'ni' : 'si';
        function extractNameFromTip(tip) {
            if (!tip) return null;
            const tmp = document.createElement('div');
            tmp.innerHTML = tip;
            const n = tmp.querySelector('.tip-item-stat-item-name');
            if (n) return n.textContent.trim();
            const b = tmp.querySelector('b');
            return b ? b.textContent.trim() : null;
        }
        return {
            IFACE, isNI: IFACE === 'ni', isSI: IFACE === 'si', extractNameFromTip,
            readHP() {
                if (IFACE === 'ni') {
                    try { const { hp, maxhp } = Engine.hero.d.warrior_stats; return maxhp ? Math.round((hp/maxhp)*100) : null; }
                    catch { return null; }
                }
                const el = document.getElementById('life1');
                if (!el) return null;
                const m = (el.getAttribute('tip')||'').match(/([\d\s]+)\s*\/\s*([\d\s]+)/);
                if (!m) return null;
                const c = parseInt(m[1].replace(/\s/g,'')), mx = parseInt(m[2].replace(/\s/g,''));
                return (!mx||isNaN(c)) ? null : Math.round((c/mx)*100);
            },
            useItem(id) {
                if (IFACE === 'ni') { window._g(`moveitem&st=1&id=${id}`); return; }
                if (typeof moveItemSafe === 'function') moveItemSafe(id, 'st=1');
                else { const el = document.getElementById('item'+id); if (el) $(el).trigger('dblclick'); }
            },
            itemExists(id) {
                if (IFACE === 'ni') { try { return Engine.items.fetchLocationItems('g').some(i=>String(i.id)===String(id)); } catch { return false; } }
                return !!(window.g?.item?.[id]);
            },
            getInventoryItems() {
                if (IFACE === 'ni') {
                    try { return Engine.items.fetchLocationItems('g').map(i=>({id:String(i.id),name:i.name,imgSrc:null,amount:i._cachedStats?.amount??null,el:null})); }
                    catch { return []; }
                }
                const r=[];
                document.querySelectorAll('div.item[data-type="t_item"]').forEach(el=>{
                    const img=el.querySelector('img'),small=el.querySelector('small');
                    r.push({id:el.id?el.id.replace('item',''):null,name:extractNameFromTip(el.getAttribute('tip')),imgSrc:img?img.src:null,amount:small?small.textContent.trim():null,el});
                });
                return r;
            },
            onBattleClose(fn) {
                if (IFACE==='ni'&&window.API?.addCallbackToEvent)
                    window.API.addCallbackToEvent('close_battle',()=>setTimeout(()=>{MBot.bot.inBattle=false;fn();},250));
            }
        };
    })();

    MBot.bot = {
        mode:null, intervalId:null, healSlotEl:null,
        healItemId: MBot.storage.get("healItemId"),
        healThreshold: MBot.storage.get("healThreshold") ?? 30,
        targetHeroes:[], targetElites:[], lastHealTime:0, inBattle:false,
        start(mode,fn){ this.stop(); this.mode=mode; this.intervalId=setInterval(fn,MBot.config.TICK_MS); MBot.ui.setStatus(mode); },
        stop(){ clearInterval(this.intervalId); this.intervalId=null; this.mode=null; this.inBattle=false; MBot.ui.setStatus("off"); MBot.ui.updateHP(null); }
    };

    MBot.ui = (() => {
        const CSS = `
            #mbot-root{position:fixed;top:20px;right:20px;width:300px;background:#1a1a1a;border:1px solid #3a3a3a;border-radius:10px;z-index:99999;color:#e0e0e0;font-family:Arial,sans-serif;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,.7);user-select:none}
            #mbot-header{background:#111;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-radius:10px 10px 0 0;cursor:grab}
            #mbot-header.minimized{border-radius:10px}#mbot-header:active{cursor:grabbing}
            #mbot-header-title{font-weight:bold;font-size:13px;letter-spacing:1px}
            #mbot-header-controls{display:flex;align-items:center;gap:8px}
            #mbot-status-dot{font-size:10px;color:#666}
            #mbot-minimize{background:#2a2a2a;border:1px solid #444;color:#ccc;border-radius:4px;width:22px;height:22px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;padding:0;line-height:1}
            #mbot-minimize:hover{background:#3a3a3a}
            #mbot-body{border-top:1px solid #2a2a2a}
            #mbot-tabs{display:flex;gap:4px;padding:8px 8px 0;background:#161616;border-bottom:1px solid #2a2a2a}
            .mbot-tab{flex:1;background:#252525;border:1px solid #3a3a3a;border-bottom:none;color:#999;border-radius:5px 5px 0 0;padding:5px 4px;cursor:pointer;font-size:11px;transition:background .12s}
            .mbot-tab:hover{background:#333;color:#ccc}.mbot-tab.active{background:#1a1a1a;color:#e0e0e0;border-color:#484848}
            .mbot-panel{padding:10px;display:none}.mbot-panel.active{display:block}
            .mbot-row{display:flex;align-items:center;gap:6px;margin-bottom:6px}
            .mbot-row label{color:#aaa;white-space:nowrap;flex-shrink:0}
            .mbot-label{display:block;color:#aaa;margin-bottom:3px;font-size:11px}
            #mbot-root input[type=number],#mbot-root input[type=text]{background:#2a2a2a;border:1px solid #444;color:#e0e0e0;border-radius:4px;padding:3px 6px;font-size:11px;flex:1}
            .mbot-btn-row{display:flex;gap:6px;margin-top:8px}
            .mbot-btn-start{flex:1;background:#1a3a1a;border:1px solid #3a7a3a;color:#8f8;border-radius:5px;padding:5px;cursor:pointer;font-size:11px}
            .mbot-btn-start:hover{background:#2a4a2a}
            .mbot-btn-stop{flex:1;background:#3a1a1a;border:1px solid #7a3a3a;color:#f88;border-radius:5px;padding:5px;cursor:pointer;font-size:11px}
            .mbot-btn-stop:hover{background:#4a2a2a}
            .mbot-btn-save{flex:1;background:#1a2a3a;border:1px solid #3a5a7a;color:#8af;border-radius:5px;padding:5px;cursor:pointer;font-size:11px}
            .mbot-btn-save:hover{background:#1a3a4a}
            #mbot-footer{display:flex;justify-content:space-between;align-items:center;padding:5px 10px;background:#111;border-top:1px solid #2a2a2a;border-radius:0 0 10px 10px;font-size:10px}
            #mbot-mode-label{color:#666}#mbot-hp-label{color:#888}
            .mbot-sep{border-top:1px solid #2a2a2a;margin:8px 0}
            #heal-selected{background:#2a2a2a;border:1px solid #444;border-radius:5px;padding:5px 8px;margin-bottom:8px;min-height:32px;display:flex;align-items:center;gap:8px}
            #inv-grid{display:grid;grid-template-columns:repeat(5,50px);gap:4px;margin:6px 0;max-height:216px;overflow-y:auto}
            #inv-grid .slot{width:50px;height:50px;background:#2a2a2a;border:1px solid #444;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;overflow:hidden;transition:border-color .12s;box-sizing:border-box}
            #inv-grid .slot:hover{border-color:#888}#inv-grid .slot.selected{border:2px solid #4caf50;background:#1a2e1a}
            #inv-grid .slot img{width:80%;height:80%;object-fit:contain;pointer-events:none}
            #inv-grid .slot .amount{position:absolute;bottom:1px;right:2px;font-size:9px;color:#fff;text-shadow:0 0 3px #000;pointer-events:none}
            #heal-save-notice{font-size:10px;color:#4caf50;margin-top:4px;display:none}
        `;
        const HTML = `<div id="mbot-root"><div id="mbot-header"><span id="mbot-header-title">⚔️ Margonem Bot</span><div id="mbot-header-controls"><span id="mbot-status-dot">● OFF</span><button id="mbot-minimize">─</button></div></div><div id="mbot-body"><div id="mbot-tabs"><button class="mbot-tab active" data-tab="farm">🤺 Farm</button><button class="mbot-tab" data-tab="search">🧿 Search</button><button class="mbot-tab" data-tab="heal">💊 Heal</button></div><div id="mbot-panel-farm" class="mbot-panel active"><div class="mbot-row"><label>Min lvl</label><input type="number" id="mob-min-level" placeholder="—"></div><div class="mbot-row"><label>Max lvl</label><input type="number" id="mob-max-level" placeholder="—"></div><div class="mbot-row"><label>Nazwa</label><input type="text" id="mob-name" placeholder="dowolna..."></div><div class="mbot-btn-row"><button class="mbot-btn-start" id="start-farm">▶ Start</button><button class="mbot-btn-stop" id="stop-farm">■ Stop</button></div></div><div id="mbot-panel-search" class="mbot-panel"><label class="mbot-label">Heroes (po przecinku):</label><input type="text" id="heroes-input" placeholder="np. Smok, Lich..."><label class="mbot-label" style="margin-top:8px;">Elites (po przecinku):</label><input type="text" id="elites-input" placeholder="np. Wilk Elite..."><div class="mbot-btn-row"><button class="mbot-btn-start" id="start-search">▶ Start</button><button class="mbot-btn-stop" id="stop-search">■ Stop</button></div></div><div id="mbot-panel-heal" class="mbot-panel"><div id="heal-selected"><img id="heal-item-img" src="" style="width:22px;height:22px;object-fit:contain;display:none;"><span id="heal-item-label" style="font-size:11px;color:#888;">Nie wybrano — kliknij slot</span></div><div class="mbot-row" style="justify-content:space-between;margin-bottom:4px;"><span style="color:#aaa;font-size:11px;">Ekwipunek:</span><button id="refresh-inv" class="mbot-btn-save" style="flex:0;padding:2px 10px;">🔄 Odśwież</button></div><div id="inv-grid"></div><div class="mbot-sep"></div><div class="mbot-row"><label>Lecz gdy HP ≤</label><input type="number" id="heal-threshold" min="1" max="99" style="flex:0;width:50px;"><span style="color:#888;">%</span></div><div class="mbot-btn-row"><button class="mbot-btn-save" id="save-heal-settings">💾 Zapisz ustawienia</button></div><div id="heal-save-notice">✓ Ustawienia zapisane</div></div><div id="mbot-footer"><span id="mbot-mode-label">● OFF</span><span id="mbot-hp-label">HP: —</span></div></div></div>`;

        return {
            build() {
                const s = document.createElement('style');
                s.id = 'mbot-style'; s.textContent = CSS;
                document.head.appendChild(s);
                document.body.insertAdjacentHTML('beforeend', HTML);
                this._initTabs(); this._initDrag(); this._initMinimize();
            },
            _initTabs() {
                document.querySelectorAll('.mbot-tab').forEach(btn => btn.addEventListener('click', () => {
                    this.switchTab(btn.dataset.tab);
                    if (btn.dataset.tab === 'heal') MBot.inventory.render();
                }));
            },
            switchTab(name) {
                document.querySelectorAll('.mbot-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
                document.querySelectorAll('.mbot-panel').forEach(p => p.classList.toggle('active', p.id === `mbot-panel-${name}`));
            },
            _initDrag() {
                const root = document.getElementById('mbot-root'), header = document.getElementById('mbot-header');
                let dragging=false, ox=0, oy=0;
                header.addEventListener('mousedown', e => { if(e.target.id==='mbot-minimize')return; dragging=true; const r=root.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top; e.preventDefault(); });
                document.addEventListener('mousemove', e => { if(!dragging)return; root.style.right='auto'; root.style.left=Math.max(0,e.clientX-ox)+'px'; root.style.top=Math.max(0,e.clientY-oy)+'px'; });
                document.addEventListener('mouseup', () => { dragging=false; });
            },
            _initMinimize() {
                const btn=document.getElementById('mbot-minimize'), body=document.getElementById('mbot-body'), header=document.getElementById('mbot-header');
                btn.addEventListener('click', () => { const h=body.style.display==='none'; body.style.display=h?'':'none'; btn.textContent=h?'─':'□'; header.classList.toggle('minimized',!h); });
            },
            setStatus(mode) {
                const map={off:{text:'● OFF',color:'#666'},farm:{text:'● FARM',color:'#4caf50'},search:{text:'● SEARCH',color:'#64b5f6'}};
                const cfg=map[mode]||map.off;
                ['mbot-status-dot','mbot-mode-label'].forEach(id=>{const el=document.getElementById(id);el.textContent=cfg.text;el.style.color=cfg.color;});
            },
            updateHP(hp) {
                const el=document.getElementById('mbot-hp-label');
                if(hp===null){el.textContent='HP: —';el.style.color='#888';return;}
                el.textContent=`HP: ${hp}%`; el.style.color=hp<=30?'#f55':hp<=60?'#fa4':'#8f8';
            }
        };
    })();

    MBot.inventory = (() => {
        function updatePreview(name,imgSrc){
            const label=document.getElementById('heal-item-label'),img=document.getElementById('heal-item-img');
            label.textContent=name||'Wybrany przedmiot'; label.style.color='#8f8';
            if(imgSrc){img.src=imgSrc;img.style.display='inline';}else img.style.display='none';
        }
        function buildSlot(item,grid){
            const slot=document.createElement('div'); slot.className='slot'; slot.title=item.name||item.id;
            if(item.id&&item.id===MBot.bot.healItemId){slot.classList.add('selected');if(item.el)MBot.bot.healSlotEl=item.el;updatePreview(item.name,item.imgSrc);}
            if(item.imgSrc){const i=document.createElement('img');i.src=item.imgSrc;slot.appendChild(i);}
            else if(item.name){const a=document.createElement('span');a.textContent=item.name.slice(0,2).toUpperCase();a.style.cssText='font-size:10px;color:#ccc;text-align:center;word-break:break-all;';slot.appendChild(a);}
            if(item.amount&&String(item.amount)!=='1'){const b=document.createElement('span');b.className='amount';b.textContent=item.amount;slot.appendChild(b);}
            slot.addEventListener('click',()=>{
                grid.querySelectorAll('.slot').forEach(s=>s.classList.remove('selected')); slot.classList.add('selected');
                MBot.bot.healSlotEl=item.el||null; MBot.bot.healItemId=item.id; MBot.storage.set('healItemId',item.id); updatePreview(item.name,item.imgSrc);
            });
            return slot;
        }
        return {
            extractNameFromTip: tip => MBot.adapter.extractNameFromTip(tip),
            clearPreview(){document.getElementById('heal-item-label').textContent='⚠️ Przedmiot zużyty — wybierz nowy';document.getElementById('heal-item-label').style.color='#f88';document.getElementById('heal-item-img').style.display='none';},
            render(){
                const grid=document.getElementById('inv-grid'); grid.innerHTML='';
                const items=MBot.adapter.getInventoryItems();
                if(!items.length){grid.innerHTML=`<div style="grid-column:span 5;color:#666;font-size:11px;padding:4px;">${MBot.adapter.isNI?'Brak przedmiotów w ekwipunku.':'Brak przedmiotów — otwórz ekwipunek w grze.'}</div>`;return;}
                items.forEach(item=>grid.appendChild(buildSlot(item,grid)));
            }
        };
    })();

    MBot.combat = (() => {
        function clickElement(el){const r=el.getBoundingClientRect();el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));}
        function handleBattleUISI(){
            const ab=document.getElementById('autobattleButton');if(ab&&ab.style.display!=='none')ab.click();
            const bc=document.getElementById('battleclose');if(bc&&bc.style.display!=='none')bc.click();
            const lb=document.getElementById('loots_button');if(lb&&lb.style.display!=='none'&&lb.innerText.trim()){try{lb.click();}catch(e){}}
        }
        function attackNearestSI(conditionFn){
            const hero=document.getElementById('hero');if(!hero)return;
            const hr=hero.getBoundingClientRect(),hx=hr.left+hr.width/2,hy=hr.top+hr.height/2;
            let nearest=null,minDist=Infinity;
            document.querySelectorAll('.npc').forEach(mob=>{
                const tip=mob.getAttribute('tip');
                if(!tip||!conditionFn(tip))return;
                if(MBot.config.FORBIDDEN_MOBS.some(n=>tip.includes(n)))return;
                const r=mob.getBoundingClientRect(),d=Math.hypot(hx-(r.left+r.width/2),hy-(r.top+r.height/2));
                if(d<minDist){minDist=d;nearest=mob;}
            });
            if(nearest)clickElement(nearest);
            handleBattleUISI();
        }
        const MONSTER_TYPES=new Set([2,3,9]);
        function attackNearestNI(conditionFn){
            if(!window.Engine||MBot.bot.inBattle)return;
            try{
                const hx=Engine.hero.d.x,hy=Engine.hero.d.y;
                if(hx==null||hy==null)return;
                let nearest=null,minDist=Infinity;
                Engine.renderer.getList().slice().forEach(o=>{
                    if(!o||o.canvasObjectType!=='NPC')return;
                    if(!o.d||!MONSTER_TYPES.has(o.d.type))return;
                    if(MBot.config.FORBIDDEN_MOBS.some(n=>(o.d.name||'').includes(n)))return;
                    if(!conditionFn(o.d))return;
                    const d=Math.hypot(hx-o.d.x,hy-o.d.y);
                    if(d<minDist){minDist=d;nearest=o;}
                });
                if(nearest){MBot.bot.inBattle=true;window._g(`fight&a=attack&id=${nearest.d.id}`);}
            }catch(err){console.warn('[BOT NI]',err);}
        }
        return { attackNearest(fn){if(MBot.adapter.isNI)attackNearestNI(fn);else attackNearestSI(fn);} };
    })();

    MBot.heal = {
        autoHeal(){
            const hp=MBot.adapter.readHP(); MBot.ui.updateHP(hp);
            if(hp===null||hp>MBot.bot.healThreshold)return;
            const now=Date.now();
            if(now-MBot.bot.lastHealTime<MBot.config.HEAL_COOLDOWN_MS)return;
            const {healItemId}=MBot.bot; if(!healItemId)return;
            if(!MBot.adapter.itemExists(healItemId)){
                MBot.bot.healSlotEl=null;MBot.bot.healItemId=null;MBot.storage.set('healItemId',null);
                MBot.inventory.clearPreview();MBot.inventory.render();return;
            }
            MBot.bot.lastHealTime=now;
            console.log(`[BOT] HP ${hp}% — leczę`);
            MBot.adapter.useItem(healItemId);
        }
    };

    MBot.farm = (() => {
        function getF(){return{minLevel:parseInt(document.getElementById('mob-min-level').value)||null,maxLevel:parseInt(document.getElementById('mob-max-level').value)||null,mobName:(document.getElementById('mob-name').value||'').toLowerCase().trim()};}
        function condNI(min,max,name){return d=>{if(!d.name)return false;if(min&&(d.lvl||0)<min)return false;if(max&&(d.lvl||0)>max)return false;if(name&&!d.name.toLowerCase().includes(name))return false;return true;};}
        function condSI(min,max,name){return tip=>{if(/Teleport|Grota|Wejście/.test(tip))return false;const m=tip.match(/<span[^>]*>(\d+)\s*lvl/);if(!m)return false;const l=parseInt(m[1]);if(min&&l<min)return false;if(max&&l>max)return false;if(name){const n=MBot.adapter.extractNameFromTip(tip)||'';if(!n.toLowerCase().includes(name))return false;}return true;};}
        function tick(){const{minLevel,maxLevel,mobName}=getF();MBot.combat.attackNearest(MBot.adapter.isNI?condNI(minLevel,maxLevel,mobName):condSI(minLevel,maxLevel,mobName));MBot.heal.autoHeal();}
        return{start(){const{minLevel,maxLevel,mobName}=getF();MBot.storage.setMany({mobMinLevel:minLevel??'',mobMaxLevel:maxLevel??'',mobName});MBot.bot.start('farm',tick);}};
    })();

    MBot.search = (() => {
        function condNI(){const{targetHeroes,targetElites}=MBot.bot;return d=>{if(!d.name)return false;const l=d.name.toLowerCase();return targetHeroes.some(h=>l.includes(h))||targetElites.some(e=>l.includes(e));};}
        function condSI(){const{targetHeroes,targetElites}=MBot.bot;return tip=>{const l=tip.toLowerCase();return targetHeroes.some(h=>l.includes(h))||targetElites.some(e=>l.includes(e));};}
        function tick(){MBot.combat.attackNearest(MBot.adapter.isNI?condNI():condSI());MBot.heal.autoHeal();}
        return{start(){MBot.bot.targetHeroes=document.getElementById('heroes-input').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);MBot.bot.targetElites=document.getElementById('elites-input').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);MBot.bot.start('search',tick);}};
    })();

    // ── init ──────────────────────────────────────────────────────────────
    MBot.ui.build();
    if (MBot.adapter.isNI) {
        document.getElementById('mbot-header-title').textContent = '⚔️ Margonem Bot [NI]';
        ['start-farm', 'start-search'].forEach(id => {
            const btn = document.getElementById(id);
            btn.disabled = true;
            btn.style.opacity = '0.35';
            btn.title = 'Niedostępne w Nowym Interfejsie';
        });
        ['mbot-panel-farm', 'mbot-panel-search'].forEach(id => {
            const note = document.createElement('div');
            note.style.cssText = 'color:#f88;font-size:11px;margin-top:8px;padding:6px 8px;background:#2a1a1a;border:1px solid #7a3a3a;border-radius:5px;line-height:1.4;';
            note.textContent = '⚠️ Farm i Search działają tylko w Starym Interfejsie. Nowy Interfejs renderuje mapę na canvas — brak dostępu do DOM mobów.';
            document.getElementById(id).appendChild(note);
        });

        const switchBtn = document.createElement('button');
        switchBtn.textContent = '⇄ Przełącz na Stary UI';
        switchBtn.style.cssText = 'width:100%;margin-top:4px;background:#1a2a3a;border:1px solid #3a5a7a;color:#8af;border-radius:5px;padding:5px;cursor:pointer;font-size:11px;';
        switchBtn.addEventListener('click', () => {
            if (typeof window._g === 'function') {
                window._g('changeInterface&type=old');
            }
        });
        document.getElementById('mbot-footer').appendChild(switchBtn);
    }

    const mobMin=MBot.storage.get('mobMinLevel'),mobMax=MBot.storage.get('mobMaxLevel'),mobName=MBot.storage.get('mobName');
    if(mobMin) document.getElementById('mob-min-level').value=mobMin;
    if(mobMax) document.getElementById('mob-max-level').value=mobMax;
    if(mobName) document.getElementById('mob-name').value=mobName;
    document.getElementById('heal-threshold').value=MBot.bot.healThreshold;

    MBot.adapter.onBattleClose(()=>MBot.heal.autoHeal());

    document.getElementById('start-farm')        .addEventListener('click',()=>MBot.farm.start());
    document.getElementById('stop-farm')         .addEventListener('click',()=>MBot.bot.stop());
    document.getElementById('start-search')      .addEventListener('click',()=>MBot.search.start());
    document.getElementById('stop-search')       .addEventListener('click',()=>MBot.bot.stop());
    document.getElementById('refresh-inv')       .addEventListener('click',()=>MBot.inventory.render());
    document.getElementById('save-heal-settings').addEventListener('click',()=>{
        const t=parseInt(document.getElementById('heal-threshold').value)||30;
        MBot.bot.healThreshold=t; MBot.storage.set('healThreshold',t);
        const n=document.getElementById('heal-save-notice'); n.style.display='block';
        setTimeout(()=>{n.style.display='none';},2000);
    });

    console.log('[BOT] Margonem Bot v8.4 uruchomiony —', MBot.adapter.IFACE.toUpperCase());
})();
