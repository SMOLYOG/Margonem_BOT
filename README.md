<div align="center">

# ⚔️ Margonem Bot

**Tampermonkey userscript do automatycznego grania na [Margonem.pl](https://margonem.pl)**

![version](https://img.shields.io/badge/wersja-1.1.0-blue)
![platform](https://img.shields.io/badge/platforma-SI%20%7C%20NI-green)
![license](https://img.shields.io/badge/licencja-MIT-gray)

</div>

---

## Funkcje

| Moduł | Co robi |
|-------|---------|
| 🤺 **Farm** | Atakuje moby według filtrów poziomu i nazwy. Opcjonalnie przechodzi przez bramę gdy mapa jest czysta. |
| 🗺️ **Route** | Wieloetapowy łańcuszek map — bot bije moby, przechodzi przez bramę i wraca do etapu #1 w pętli. Auto-restart po przeładowaniu strony. |
| 💊 **Heal** | Używa wybranego itemu leczącego automatycznie gdy HP spada poniżej ustawionego progu. |
| 🔐 **CAPTCHA** | Auto-rozwiązywanie CAPTCHA przez lokalny skrypt Python (`captcha_clicker.py`). |

---

## Instalacja

### Opcja A — bundle (jeden plik, bez zależności)

1. Zainstaluj **Tampermonkey** → [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/pl/firefox/addon/tampermonkey/)
2. Utwórz nowy skrypt w Tampermonkey i wklej zawartość [`release/MargonemBot.bundle.user.js`](release/MargonemBot.bundle.user.js)
3. Zapisz — panel bota pojawi się w prawym górnym rogu

### Opcja B — z @require (auto-aktualizacje modułów)

1. Zainstaluj Tampermonkey
2. Utwórz nowy skrypt i wklej zawartość [`release/MargonemBot.user.js`](release/MargonemBot.user.js)
3. Moduły pobierane są automatycznie z GitHub przy każdym uruchomieniu

---

## Auto-CAPTCHA

Wymaga lokalnego serwera Python do fizycznego klikania myszą.

```bash
pip install flask pyautogui
python captcha_clicker.py
```

Serwer nasłuchuje na `localhost:8765`. Bot automatycznie wykrywa CAPTCHA, identyfikuje właściwy symbol z pytania i wysyła koordynaty do klikalnika.

> **Ważne:** nie minimalizuj okna przeglądarki gdy bot rozwiązuje CAPTCHA — pyautogui klika w realne piksele na ekranie.

---

## Użycie

### Farm

1. Otwórz zakładkę **🤺 Farm**
2. Ustaw opcjonalnie: min/max poziom, nazwę moba
3. Włącz **Auto-brama** jeśli chcesz przejść dalej gdy mapa jest czysta
4. Kliknij **▶ Start**

### Route

1. Wejdź na pierwszą mapę → otwórz zakładkę **🗺️ Route**
2. **Skanuj moby** → zaznacz checkboxami moby do bicia
3. **Skanuj bramy** → wybierz bramę wyjściową
4. **+ Dodaj etap** → przejdź ręcznie na kolejną mapę i powtórz
5. Po dodaniu wszystkich etapów kliknij **▶ Start**

**Etap przejścia** (bez walki): nie zaznaczaj mobów, wybierz tylko bramę.

```
#1  Żuk, Kruk       →  Jaskinia Rozpaczy
#2  ⚡ przejście    →  Równina Wschodnia
#3  Bandyta, Rycerz →  Powrót do Miasta
↩️  powrót do #1 ...
```

### Heal

1. Otwórz zakładkę **💊 Heal**
2. Kliknij **🔄 Odśwież** → wybierz slot z itemem leczącym
3. Ustaw próg HP → **💾 Zapisz ustawienia**

Heal działa w tle niezależnie od trybu farm/route.

---

## Struktura projektu

```
release/
├── MargonemBot.bundle.user.js   ← wszystko w jednym pliku (zalecane do testów)
├── MargonemBot.user.js          ← wersja z @require
└── modules/                     ← moduły ładowane przez @require
    ├── config.js · storage.js · adapter.js · bot.js
    ├── ui.js · inventory.js · combat.js · heal.js
    ├── farm.js · route.js · captcha.js

captcha_clicker.py               ← serwer Python do klikania CAPTCHA
debug_captcha.js                 ← skrypt testowy do F12
```

---

<div align="center">

`v1.1.0` · Farm · Route · Heal · Auto-CAPTCHA · SI + NI

</div>
