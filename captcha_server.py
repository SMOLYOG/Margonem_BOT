"""
Margonem CAPTCHA Solver Server
Uruchom: python captcha_server.py
Wymaga: pip install flask flask-cors opencv-python numpy
"""

import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

GRID_COLS = 3
GRID_ROWS = 2


def decode_image(b64_string):
    if b64_string.startswith("data:"):
        b64_string = b64_string.split(",", 1)[1]
    raw = base64.b64decode(b64_string)
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def classify_cell(cell):
    """
    Zwraca True jeśli komórka zawiera gwiazdkę '*', False jeśli daszek '^'.

    Strategia:
    - Progowanie Otsu → maska białych pikseli na ciemnym tle
    - Gwiazdka ma piksele rozmieszczone centralnie i bardziej poziomo
      (szerokość bounding-box > wysokość, lub środek ciężkości bliżej środka)
    - Daszek ma kształt ostrego trójkąta skierowanego ku górze:
      środek ciężkości jest wyraźnie powyżej środka komórki
    - Dodatkowa heurystyka: gwiazdka ma więcej konturów/ramion
    """
    gray = cv2.cvtColor(cell, cv2.COLOR_BGR2GRAY)

    # Progowanie Otsu
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Wykryj kontury
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        # Brak konturów - spróbuj odwrócone progowanie
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return False

    # Weź największy kontur
    main_contour = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(main_contour)

    if area < 20:
        return False

    x, y, w, h = cv2.boundingRect(main_contour)
    cell_h, cell_w = cell.shape[:2]

    # Środek ciężkości konturu
    M = cv2.moments(main_contour)
    if M["m00"] == 0:
        return False

    cy = M["m01"] / M["m00"]
    cell_center_y = cell_h / 2.0

    # Daszek '^': środek ciężkości jest w górnej połowie (cy < center_y * 0.85)
    # Gwiazdka '*': środek ciężkości bliżej centrum
    centroid_ratio = cy / cell_h

    # Stosunek szerokości do wysokości bounding-boxa
    aspect = w / h if h > 0 else 1.0

    # Gwiazdka jest szersza (aspekt ≥ 1.0) lub ma centroid w środku (0.35–0.65)
    # Daszek jest węższy i centroid jest wyżej (< 0.45)
    if centroid_ratio < 0.42 and aspect < 1.2:
        return False  # daszek
    return True  # gwiazdka


@app.route("/solve", methods=["POST"])
def solve():
    data = request.get_json(force=True)
    b64 = data.get("image", "")

    if not b64:
        return jsonify({"error": "Brak pola 'image'"}), 400

    img = decode_image(b64)
    if img is None:
        return jsonify({"error": "Nie można zdekodować obrazu"}), 400

    h, w = img.shape[:2]
    cell_w = w // GRID_COLS
    cell_h = h // GRID_ROWS

    results = []
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            x1 = col * cell_w
            y1 = row * cell_h
            x2 = x1 + cell_w
            y2 = y1 + cell_h
            cell = img[y1:y2, x1:x2]
            idx = row * GRID_COLS + col
            if classify_cell(cell):
                results.append(idx)

    return jsonify({"indices": results})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print("Margonem CAPTCHA Solver nasłuchuje na http://localhost:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)