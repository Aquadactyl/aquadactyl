"""A real, bounded demonstration workload. Never executes visitor input as code."""
import http.server
import os
import sys
import threading
import time

started = time.monotonic()
print("[INFO] Starting the Aquadactyl Python example...")
print("[INFO] Managed by Manta in an isolated rootless Docker engine.")
print("[INFO] Demo ready. Try help, status, list, say hello or stop.")


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"Aquadactyl + Manta demonstration server is running.\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


web = http.server.ThreadingHTTPServer(("0.0.0.0", int(os.getenv("SERVER_PORT", "8000"))), Handler)
threading.Thread(target=web.serve_forever, daemon=True).start()

for raw in sys.stdin:
    command = raw.strip()[:200]
    if command == "stop":
        print("[INFO] Stopping the example server. Goodbye!")
        break
    if command in ("help", "/help"):
        print("[INFO] Commands: help, status, list, say <message>, stop")
    elif command in ("status", "list"):
        print(f"[INFO] Python example online for {int(time.monotonic() - started)}s. This is a sample workload, not a game server.")
    elif command.startswith("say "):
        print("[CHAT] " + command[4:])
    else:
        print("[INFO] Try help to see the available demonstration commands.")
web.server_close()
