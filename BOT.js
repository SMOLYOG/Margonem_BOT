// ==UserScript==
// @name         Margonem Bot - Tabs + Auto Heal + Item Heal
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Auto farm + hero/elite search + auto heal with items in Margonem!
// @author       
// @match        https://gordion.margonem.pl/
// @grant        none
// ==/UserScript==

(function () {
    let botMode = null;
    let intervalId = null;
    let targetHeroes = [];
    let targetElites = [];
    let healItemName = "";
    let healThreshold = 30;

    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.top = "20px";
    ui.style.right = "20px";
    ui.style.width = "250px";
    ui.style.background = "#222";
    ui.style.padding = "10px";
    ui.style.border = "2px solid #888";
    ui.style.borderRadius = "10px";
    ui.style.zIndex = 9999;
    ui.style.color = "#fff";
    ui.style.fontFamily = "Arial";
    ui.innerHTML = `
        <button id="tab-farm" style="width:100%; margin-bottom:5px;">🤺 Mob Farming</button>
        <div id="farm-options" style="display:none;">
            <label>Min Level: <input type="number" id="mob-min-level" style="width:60px;"></label><br><br>
            <label>Max Level: <input type="number" id="mob-max-level" style="width:60px;"></label><br><br>
            <label>Name: <input type="text" id="mob-name" style="width:100px;"></label><br><br>
            <button id="start-farm">Start</button>
            <button id="stop-farm">Stop</button>
        </div>
        <hr>
        <button id="tab-search" style="width:100%; margin-bottom:5px;">🧿 Hero Search</button>
        <div id="search-options" style="display:none;">
            <label>Heroes (comma separated):</label>
            <input type="text" id="heroes-input" style="width:100%;"><br><br>

            <label>Elites (comma separated):</label>
            <input type="text" id="elites-input" style="width:100%;"><br><br>

            <button id="start-search">Start</button>
            <button id="stop-search">Stop</button>
        </div>
        <hr>
        <button id="tab-heal" style="width:100%; margin-bottom:5px;">💊 Auto Heal</button>
        <div id="heal-options" style="display:none;">
            <label>Item name for heal:</label>
            <input type="text" id="heal-item-name" style="width:100%;"><br><br>
            <label>Health % threshold:</label>
            <input type="number" id="heal-threshold" style="width:60px;" value="30"><br><br>
            <button id="save-heal-settings">Save</button>
        </div>
    `;
    document.body.appendChild(ui);

    document.getElementById("tab-farm").onclick = () => toggleSection('farm-options');
    document.getElementById("tab-search").onclick = () => toggleSection('search-options');
    document.getElementById("tab-heal").onclick = () => toggleSection('heal-options');

    function toggleSection(id) {
        const el = document.getElementById(id);
        el.style.display = el.style.display === "none" ? "block" : "none";
    }

    document.getElementById("start-farm").onclick = startFarm;
    document.getElementById("stop-farm").onclick = stopBot;
    document.getElementById("start-search").onclick = startSearch;
    document.getElementById("stop-search").onclick = stopBot;
    document.getElementById("save-heal-settings").onclick = saveHealSettings;

    function startFarm() {
        stopBot();
        botMode = 'farm';
        intervalId = setInterval(farmMobs, 400);
        console.log("[BOT] Started mob farming!");
    }

    function startSearch() {
        stopBot();
        targetHeroes = document.getElementById("heroes-input").value.split(',').map(hero => hero.trim().toLowerCase());
        targetElites = document.getElementById("elites-input").value.split(',').map(elite => elite.trim().toLowerCase());
        botMode = 'search';
        intervalId = setInterval(searchElites, 400);
        console.log("[BOT] Started searching for heroes and elites!");
    }

    function stopBot() {
        clearInterval(intervalId);
        intervalId = null;
        console.log("[BOT] Bot stopped.");
    }

    function saveHealSettings() {
        healItemName = document.getElementById("heal-item-name").value.trim();
        healThreshold = parseInt(document.getElementById("heal-threshold").value) || 30;
        console.log("[BOT] Heal settings saved!");
    }

    function farmMobs() {
        const minLevel = parseInt(document.getElementById("mob-min-level").value) || null;
        const maxLevel = parseInt(document.getElementById("mob-max-level").value) || null;
        const targetName = (document.getElementById("mob-name").value || "").toLowerCase();

        attackNearest((tip) => {
            if (tip.includes("Teleport") || tip.includes("Grota") || tip.includes("Wejście")) return false;

            const match = tip.match(/<span.*?>(\d+)\s*lvl/);
            if (match) {
                const level = parseInt(match[1]);
                if ((minLevel && level < minLevel) || (maxLevel && level > maxLevel)) return false;
            } else {
                return false;
            }

            if (targetName) {
                const nameMatch = tip.match(/<b>(.*?)<\/b>/i);
                const name = nameMatch ? nameMatch[1].toLowerCase() : "";
                if (!name.includes(targetName)) return false;
            }

            return true;
        });

        autoHeal();
    }

    function searchElites() {
        attackNearest((tip) => {
            const lowerTip = tip.toLowerCase();
            const isHero = targetHeroes.some(hero => lowerTip.includes(hero));
            const isElite = targetElites.some(elite => lowerTip.includes(elite));
            return isHero || isElite;
        });

        autoHeal();
    }

    function attackNearest(conditionFn) {
        const mobs = document.querySelectorAll(".npc");
        const hero = document.getElementById("hero");
        if (!hero) return;

        const heroRect = hero.getBoundingClientRect();
        const heroX = heroRect.left + heroRect.width / 2;
        const heroY = heroRect.top + heroRect.height / 2;

        let nearest = null;
        let minDist = Infinity;

        mobs.forEach((mob) => {
            const tip = mob.getAttribute("tip");
            if (!tip || !conditionFn(tip)) return;

            const forbiddenNames = [
                "Silny jeleń", "Weszo",
                "Rumianek", "Lawenda", "Pokrzywa", "Mniszek", "Tymianek", "Szałwia"
            ];
            if (forbiddenNames.some(name => tip.includes(name))) return;

            const rect = mob.getBoundingClientRect();
            const mobX = rect.left + rect.width / 2;
            const mobY = rect.top + rect.height / 2;
            const dist = Math.hypot(heroX - mobX, heroY - mobY);
            if (dist < minDist) {
                minDist = dist;
                nearest = mob;
            }
        });

        if (nearest) {
            clickElement(nearest);
        }

        const autobattle = document.getElementById("autobattleButton");
        if (autobattle && autobattle.style.display !== "none") autobattle.click();

        const battleClose = document.getElementById("battleclose");
        if (battleClose && battleClose.style.display !== "none") battleClose.click();

        const loots = document.getElementById("loots_button");
        if (loots && loots.style.display !== "none" && loots.innerText.trim() !== "") {
            try {
                loots.click();
            } catch (e) {
                console.warn("Error clicking loots_button:", e.message);
            }
        }
    }

    function clickElement(el) {
        const rect = el.getBoundingClientRect();
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        });
        el.dispatchEvent(event);
    }

    function autoHeal() {
        const hpSpan = document.getElementById("hpProcent");
        if (!hpSpan) return;

        const healthPercent = parseInt(hpSpan.innerText.replace('%', '').trim());

        if (healthPercent <= healThreshold) {
            console.log("[BOT] Health is below threshold. Healing...");
            if (healItemName) {
                const item = findItemInInventory(healItemName);
                if (item) {
                    item.click();
                }
            }
        }
    }

    function findItemInInventory(itemName) {
        const items = document.querySelectorAll(".item-icon");
        for (const item of items) {
            const title = item.getAttribute("title");
            if (title && title.toLowerCase().includes(itemName.toLowerCase())) {
                return item;
            }
        }
        return null;
    }
})();
