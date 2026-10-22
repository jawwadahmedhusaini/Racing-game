#!/usr/bin/env python3
"""Serve the bundled APEX RUSH web game. Python 3, no packages required."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import threading
import webbrowser

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=8000)
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'web'
if not (root / 'index.html').is_file():
    parser.error('The web folder is missing. Unzip the complete game before running this launcher.')
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
try:
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler)
except OSError as error:
    parser.exit(1, f'Cannot start the local game server: {error}\nTry --port 8001.\n')
url = f'http://127.0.0.1:{args.port}/'
print(f'APEX RUSH is running. Open {url} in your browser.', flush=True)
print('Keep this window open while playing. Press Ctrl+C to stop.', flush=True)
if not args.no_browser:
    timer = threading.Timer(.6, lambda: webbrowser.open(url))
    timer.daemon = True
    timer.start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
