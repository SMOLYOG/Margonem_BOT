"""
captcha_clicker.py — lokalny serwer do klikania CAPTCHA przez pyautogui.

Instalacja:
    pip install pyautogui flask

Uruchomienie:
    python captcha_clicker.py

Nasłuchuje na http://localhost:8765/captcha (POST JSON):
{
  "tiles":   [{"x": 512, "y": 400}, ...],
  "confirm": {"x": 640, "y": 520}
}
"""

from flask import Flask, request, jsonify
import pyautogui
import time

app = Flask(__name__)
pyautogui.FAILSAFE = True   # ruch myszki w lewy górny róg = stop


def _cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

app.after_request(_cors)


@app.route("/captcha", methods=["POST", "OPTIONS"])
def captcha():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json(force=True, silent=True) or {}
    tiles   = data.get("tiles", [])
    confirm = data.get("confirm")

    if not tiles:
        return jsonify({"error": "brak kafelków"}), 400

    for tile in tiles:
        pyautogui.click(tile["x"], tile["y"])
        time.sleep(0.25)

    if confirm:
        time.sleep(0.4)
        pyautogui.click(confirm["x"], confirm["y"])

    return jsonify({"ok": True, "clicked": len(tiles)})


if __name__ == "__main__":
    print("captcha_clicker nasłuchuje na http://localhost:8765")
    app.run(port=8765, debug=False)
