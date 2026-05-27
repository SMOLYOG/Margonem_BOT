# Margonem Bot

Bot do gry Margonem.pl — automatyczne farmienie, wieloetapowy route i auto heal.  
Działa zarówno ze **starym interfejsem (SI)** jak i **nowym interfejsem (NI)**.

---

## Instalacja

1. Zainstaluj rozszerzenie **Tampermonkey** ([Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) / [Firefox](https://addons.mozilla.org/pl/firefox/addon/tampermonkey/))
2. Otwórz plik `MargonemBot.user.js` z tego folderu
3. Kliknij **Zainstaluj skrypt** w Tampermonkey
4. Wejdź na Margonem.pl — panel bota pojawi się w prawym górnym rogu

> Skrypt automatycznie pobiera moduły z GitHub przy każdym uruchomieniu.  
> Aktualizacje modułów działają od razu bez reinstalacji skryptu.

---

## Funkcje

| Tryb | Opis |
|------|------|
| **Farm** | Atakuje moby według filtrów (poziom, nazwa). Opcjonalnie przechodzi przez bramę gdy mapa jest czysta. |
| **Route** | Wieloetapowy łańcuszek — każdy etap ma własne moby i bramę do przejścia. Automatycznie wznawia po przeładowaniu strony. |
| **Heal** | Automatyczne leczenie itemem z ekwipunku gdy HP spada poniżej progu. |

---

## Tryb Farm

1. Przejdź na zakładkę **Farm**
2. Opcjonalnie ustaw filtry: min/max poziom, nazwa moba
3. Opcjonalnie włącz **Auto-brama** i wpisz część nazwy bramy docelowej
4. Kliknij **▶ Start**

---

## Tryb Route (Expowisko)

Pozwala zdefiniować łańcuszek map — bot bije moby na każdej mapie, przechodzi przez bramę i przechodzi do kolejnego etapu w kółko.

### Jak ustawić route:

1. Wejdź na pierwszą mapę, przejdź na zakładkę **Route**
2. Kliknij **Skanuj moby** → zaznacz checkboxami moby do bicia
3. Kliknij **Skanuj bramy** → wybierz bramę przez którą wyjść
4. Kliknij **+ Dodaj etap**
5. Przejdź ręcznie na drugą mapę i powtórz kroki 2–4
6. Po dodaniu wszystkich etapów kliknij **▶ Start**

### Etap przejścia (bez walki):

Jeśli chcesz tylko przejść przez mapę bez bicia mobów:
- Nie zaznaczaj żadnych mobów
- Wybierz tylko bramę
- Kliknij **+ Dodaj etap** — pojawi się jako `⚡ przejście`

### Przykładowy route:

```
#1  Żuk, Kruk       →  Jaskinia Rozpaczy    (bije moby, potem brama)
#2  ⚡ przejście    →  Równina Wschodnia    (tylko przechodzi)
#3  Bandyta, Rycerz →  Powrót do Miasta     (bije moby, potem brama)
```

Bot wraca do etapu #1 i powtarza pętlę w nieskończoność.

### Auto-restart po bramie:

Po przejściu przez bramę strona się przeładowuje — bot **automatycznie wznawia** od właściwego etapu bez konieczności ręcznego klikania Start.

---

## Tryb Heal

1. Przejdź na zakładkę **Heal**
2. Kliknij na slot z itemem leczącym w ekwipunku
3. Ustaw próg HP (domyślnie 30%)
4. Kliknij **Zapisz ustawienia**

Heal działa w tle niezależnie od trybu farm/route.

---

## Znane ograniczenia

- **Auto-CAPTCHA** — w przygotowaniu, niedostępna w tej wersji
- Bot działa tylko gdy karta z grą jest aktywna (przeglądarka nie może być zminimalizowana)
- NI (nowy interfejs): farm/heal działa, route w testach

---

## Wersja

`1.0.0` — Farm, Route, Heal | Auto-CAPTCHA: wkrótce
