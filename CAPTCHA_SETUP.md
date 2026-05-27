# Margonem CAPTCHA Solver — Instrukcja instalacji

## 1. Wymagania

Python 3.8+ musi być zainstalowany.

## 2. Instalacja zależności

```bash
pip install flask flask-cors opencv-python numpy
```

## 3. Uruchomienie serwera

```bash
python captcha_server.py
```

Serwer nasłuchuje na `http://localhost:5000`. Zostaw go uruchomionego w tle podczas grania.

## 4. Weryfikacja serwera

```bash
curl http://localhost:5000/health
# → {"status": "ok"}
```

## 5. Instalacja userscriptu (Tampermonkey)

**Wariant A — bundle (zalecany):**
Wgraj plik `bundle.user.js` bezpośrednio do Tampermonkey.

**Wariant B — z GitHuba:**
Użyj `main.js` jako skryptu w Tampermonkey — moduł `captcha.js` jest doczytywany przez `@require`.

## 6. Jak to działa

1. Bot obserwuje DOM w poszukiwaniu okna CAPTCHA (MutationObserver).
2. Gdy CAPTCHA się pojawi, obrazek jest renderowany na ukryty `<canvas>` i kodowany Base64.
3. Obraz jest wysyłany POST do `localhost:5000/solve`.
4. Serwer Python dzieli obraz na siatkę 2×3 (6 przycisków) i analizuje każdą komórkę.
5. Gwiazdka `*` jest odróżniana od daszka `^` przez analizę konturów i środka ciężkości kształtu.
6. Serwer zwraca indeksy przycisków z gwiazdkami (`[0, 2, 4]` itp.).
7. Bot klika odpowiednie przyciski, a następnie "Potwierdzam".

## 7. Dostosowanie selektorów DOM

Jeśli CAPTCHA nie jest wykrywana, otwórz konsolę przeglądarki (F12) i sprawdź:
- Jak nazywa się element zawierający okno CAPTCHA (`id` lub `class`)?
- Jak wygląda selektor przycisków wewnątrz CAPTCHA?

Następnie zaktualizuj selektory w `modules/captcha.js` (funkcje `_findCaptchaRoot` i `_solve`).
