<div align="center">

# ⚔️ Margonem Bot

**Automatyczne farmienie · Wieloetapowy Route · Auto Heal · Auto CAPTCHA**

![version](https://img.shields.io/badge/wersja-1.1.0-blue)
![platform](https://img.shields.io/badge/SI%20%7C%20NI-supported-green)

</div>

---

## Szybka instalacja

1. Zainstaluj **Tampermonkey** → [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/pl/firefox/addon/tampermonkey/)
2. Utwórz nowy skrypt w Tampermonkey
3. Wklej zawartość `MargonemBot.bundle.user.js` i zapisz
4. Wejdź na **margonem.pl** — panel pojawi się w prawym górnym rogu

> Alternatywnie: użyj `MargonemBot.user.js` który ładuje moduły z GitHub przez `@require` (auto-aktualizacje).

---

## Auto-CAPTCHA — wymagania

```bash
pip install flask pyautogui
python captcha_clicker.py
```

Uruchom przed wejściem do gry. Serwer nasłuchuje na `localhost:8765`.

---

## 🤺 Farm

| Krok | Akcja |
|------|-------|
| 1 | Otwórz zakładkę **Farm** |
| 2 | Ustaw filtry: min/max poziom, nazwa moba *(opcjonalne)* |
| 3 | Włącz **Auto-brama** i wpisz część nazwy mapy docelowej *(opcjonalne)* |
| 4 | Kliknij **▶ Start** |

---

## 🗺️ Route

Definiujesz łańcuszek map. Bot bije moby, przechodzi bramę, przechodzi do następnego etapu — w kółko. Po przeładowaniu strony (brama) **wznawia automatycznie**.

### Konfiguracja

```
Mapa A → [Skanuj moby] → zaznacz moby → [Skanuj bramy] → wybierz bramę → [+ Dodaj etap]
Mapa B → powtórz
Mapa C → powtórz
         [▶ Start]
```

### Etap przejścia (bez walki)

Nie zaznaczaj mobów — wybierz tylko bramę. Pojawi się jako `⚡ przejście`.

### Przykład

```
#1  Żuk, Kruk       →  Jaskinia Rozpaczy
#2  ⚡ przejście    →  Równina Wschodnia
#3  Bandyta, Rycerz →  Powrót do Miasta
↩️  wraca do #1...
```

---

## 💊 Heal

| Krok | Akcja |
|------|-------|
| 1 | Otwórz zakładkę **Heal** |
| 2 | Kliknij **🔄 Odśwież** → kliknij slot z itemem leczącym |
| 3 | Ustaw próg HP *(domyślnie 30%)* |
| 4 | Kliknij **💾 Zapisz ustawienia** |

Heal działa w tle — niezależnie od Farm/Route.

---

## 🔐 CAPTCHA

Bot sam wykrywa okno CAPTCHA, odczytuje który symbol jest wymagany z pytania (`gwiazdka`, `wykrzyknik`, `dolar` itp.), i wysyła koordynaty odpowiednich kafelków do `captcha_clicker.py`, który klika je prawdziwymi zdarzeniami systemowymi.

> Nie minimalizuj okna przeglądarki podczas rozwiązywania CAPTCHA.

---

## Znane ograniczenia

- Karta z grą musi być aktywna (przeglądarka nie może być zminimalizowana)
- Auto-CAPTCHA wymaga uruchomionego `captcha_clicker.py`
- NI (nowy interfejs): Farm i Heal działają stabilnie, Route w testach
