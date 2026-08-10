#!/usr/bin/env python3
"""Drive headless Chrome through CDP with real phone device metrics.

Chrome's headless window clamps at 500 CSS px, and desktop Chrome ignores the
viewport meta tag, so neither --window-size nor markup can produce a 390px
layout viewport. Emulation.setDeviceMetricsOverride can. That needs a WebSocket,
and there is no stdlib client, so this is a minimal one: handshake, masked text
frames out, unmasked frames in. Enough for CDP and nothing more.

  mob.py <url> [--shot out.png] [--eval "js"] [--w 390] [--h 844] [--wait 2.0]
"""
import base64, hashlib, json, os, socket, struct, subprocess, sys, time, urllib.request

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


class WS:
    def __init__(self, url):
        _, rest = url.split("://", 1)
        hostport, path = rest.split("/", 1)
        host, port = hostport.split(":")
        self.sock = socket.create_connection((host, int(port)))
        self.sock.settimeout(30)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET /{path} HTTP/1.1\r\nHost: {hostport}\r\nUpgrade: websocket\r\n"
               f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
               f"Sec-WebSocket-Version: 13\r\n\r\n")
        self.sock.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.sock.recv(4096)
        accept = base64.b64encode(
            hashlib.sha1((key + "258EAFA5-E914-47DA-95CA-5AB0DC85B11").encode()).digest()).decode()
        self.buf = buf.split(b"\r\n\r\n", 1)[1]
        self.next_id = 0

    def send(self, obj):
        data = json.dumps(obj).encode()
        head = b"\x81"
        n = len(data)
        if n < 126:
            head += struct.pack("!B", 0x80 | n)
        elif n < 1 << 16:
            head += struct.pack("!BH", 0x80 | 126, n)
        else:
            head += struct.pack("!BQ", 0x80 | 127, n)
        mask = os.urandom(4)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(head + mask + masked)

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise EOFError("socket closed")
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def recv(self):
        while True:
            b0, b1 = self._read(2)
            opcode, ln = b0 & 0x0F, b1 & 0x7F
            if ln == 126:
                ln = struct.unpack("!H", self._read(2))[0]
            elif ln == 127:
                ln = struct.unpack("!Q", self._read(8))[0]
            payload = self._read(ln)
            if opcode == 1:
                return json.loads(payload)
            if opcode == 8:
                raise EOFError("closed by peer")

    def call(self, method, **params):
        self.next_id += 1
        mid = self.next_id
        self.send({"id": mid, "method": method, "params": params})
        while True:
            msg = self.recv()
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})


def main():
    a = sys.argv[1:]
    url = a[0]
    def opt(name, dflt=None):
        return a[a.index(name) + 1] if name in a else dflt
    shot, js = opt("--shot"), opt("--eval")
    after = float(opt("--after", 0))
    w, h = int(opt("--w", 390)), int(opt("--h", 844))
    wait = float(opt("--wait", 2.0))

    port = 9333
    proc = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--allow-file-access-from-files",
         f"--remote-debugging-port={port}", "--no-first-run", "--user-data-dir=/tmp/mobprof",
         "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        target = None
        for _ in range(80):
            try:
                pages = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
                target = next((p for p in pages if p["type"] == "page"), None)
                if target:
                    break
            except Exception:
                pass
            time.sleep(0.25)
        if not target:
            print("could not reach chrome", file=sys.stderr)
            return 1

        ws = WS(target["webSocketDebuggerUrl"])
        ws.call("Page.enable")
        # The whole point: a real phone's layout viewport, pixel ratio and touch.
        ws.call("Emulation.setDeviceMetricsOverride", width=w, height=h,
                deviceScaleFactor=3, mobile=True)
        ws.call("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=5)
        ws.call("Page.navigate", url=url)
        time.sleep(wait)
        if js:
            r = ws.call("Runtime.evaluate", expression=js, returnByValue=True)
            val = r.get("result", {}).get("value")
            print(val if val is not None else json.dumps(r.get("result", {})))
        if after:
            time.sleep(after)
        if shot:
            r = ws.call("Page.captureScreenshot", format="png", captureBeyondViewport=False)
            open(shot, "wb").write(base64.b64decode(r["data"]))
    finally:
        proc.terminate()
    return 0


sys.exit(main())
