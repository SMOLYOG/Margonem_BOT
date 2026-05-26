MBot.inventory = (() => {
    function extractNameFromTip(tip) {
        if (!tip) return null;
        const tmp = document.createElement("div");
        tmp.innerHTML = tip;
        const nameEl = tmp.querySelector(".tip-item-stat-item-name");
        if (nameEl) return nameEl.textContent.trim();
        const b = tmp.querySelector("b");
        return b ? b.textContent.trim() : null;
    }

    function updatePreview(name, imgSrc) {
        const label = document.getElementById("heal-item-label");
        const img   = document.getElementById("heal-item-img");
        label.textContent = name || "Wybrany przedmiot";
        label.style.color = "#8f8";
        if (imgSrc) { img.src = imgSrc; img.style.display = "inline"; }
        else { img.style.display = "none"; }
    }

    function clearPreview() {
        document.getElementById("heal-item-label").textContent = "⚠️ Przedmiot zużyty — wybierz nowy";
        document.getElementById("heal-item-label").style.color = "#f88";
        document.getElementById("heal-item-img").style.display = "none";
    }

    return {
        extractNameFromTip,
        clearPreview,

        render() {
            const grid = document.getElementById("inv-grid");
            grid.innerHTML = "";

            const items = document.querySelectorAll('div.item[data-type="t_item"]');
            if (!items.length) {
                grid.innerHTML = `<div style="grid-column:span 5;color:#666;font-size:11px;padding:4px;">
                    Brak przedmiotów — otwórz ekwipunek w grze.
                </div>`;
                return;
            }

            items.forEach(el => {
                const rawId  = el.id ? el.id.replace("item", "") : null;
                const name   = extractNameFromTip(el.getAttribute("tip"));
                const img    = el.querySelector("img");
                const imgSrc = img ? img.src : null;
                const small  = el.querySelector("small");
                const amount = small ? small.textContent.trim() : null;

                const slot = document.createElement("div");
                slot.className = "slot";
                slot.title = name || el.id;

                // Przywróć zaznaczenie z zapisanego ID
                if (rawId && rawId === MBot.bot.healItemId) {
                    slot.classList.add("selected");
                    MBot.bot.healSlotEl = el;
                    updatePreview(name, imgSrc);
                }

                if (imgSrc) {
                    const i = document.createElement("img");
                    i.src = imgSrc;
                    slot.appendChild(i);
                }

                if (amount && amount !== "1") {
                    const badge = document.createElement("span");
                    badge.className = "amount";
                    badge.textContent = amount;
                    slot.appendChild(badge);
                }

                slot.addEventListener("click", () => {
                    grid.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
                    slot.classList.add("selected");
                    MBot.bot.healSlotEl = el;
                    MBot.bot.healItemId = rawId;
                    MBot.storage.set("healItemId", rawId);
                    updatePreview(name, imgSrc);
                });

                grid.appendChild(slot);
            });
        }
    };
})();
