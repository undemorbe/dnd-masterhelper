#!/usr/bin/env python3
"""Локальный сервер для сайта мастера «Город, который нарисовали».

Раздаёт index.html и хранит заметки, трекеры и журнал в data/store.json
рядом с этим файлом. Запуск: python3 server.py  (или двойной клик по
«Запустить сайт.command»). Остановить: Ctrl+C в окне терминала.
"""
import json
import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
STORE = os.path.join(DATA_DIR, "store.json")
PORT = int(os.environ.get("DND_PORT", "8787"))
LOCK = threading.Lock()


def load():
    try:
        with open(STORE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save(data):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STORE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, STORE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _path(self):
        q = parse_qs(urlparse(self.path).query)
        p = (q.get("path") or [""])[0]
        parts = p.split("/")
        if len(parts) != 2 or not all(parts) or any(".." in x for x in parts):
            return None
        return p

    def do_GET(self):
        if urlparse(self.path).path == "/api/store":
            with LOCK:
                return self._json(200, load())
        if self.path.startswith("/data/"):
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_PUT(self):
        if urlparse(self.path).path != "/api/store":
            return self._json(404, {"error": "not found"})
        p = self._path()
        if not p:
            return self._json(400, {"error": "bad path"})
        n = int(self.headers.get("Content-Length") or 0)
        try:
            value = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return self._json(400, {"error": "bad json"})
        with LOCK:
            data = load()
            data[p] = value
            save(data)
        return self._json(200, {"ok": True})

    def do_DELETE(self):
        if urlparse(self.path).path != "/api/store":
            return self._json(404, {"error": "not found"})
        p = self._path()
        if not p:
            return self._json(400, {"error": "bad path"})
        with LOCK:
            data = load()
            data.pop(p, None)
            save(data)
        return self._json(200, {"ok": True})


def main():
    try:
        srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        url = "http://127.0.0.1:%d/" % PORT
        print("Порт %d занят — похоже, сайт уже запущен. Открываю %s" % (PORT, url))
        webbrowser.open(url)
        return
    url = "http://127.0.0.1:%d/" % PORT
    print("Сайт мастера запущен: %s" % url)
    print("Заметки сохраняются в %s" % STORE)
    print("Чтобы остановить — нажмите Ctrl+C или закройте это окно.")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nОстановлено.")


if __name__ == "__main__":
    main()
