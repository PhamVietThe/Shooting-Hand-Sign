#!/usr/bin/env python3
"""
Simple HTTP Server for Cyber Gesture Weapons AR Web Application
Supports ES6 modules, CORS, and auto port finding.
"""

import http.server
import socketserver
import os
import sys

PORT = 8090

class CustomHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable cache during development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure correct MIME type for javascript modules
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        return super().guess_type(path)

def run():
    # Change working directory to directory of this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    port = PORT
    for attempt in range(5):
        try:
            with socketserver.TCPServer(("", port), CustomHTTPHandler) as httpd:
                print(f"[CYBER-GESTURE] Server running at http://localhost:{port}")
                print(f"[CYBER-GESTURE] Press Ctrl+C to stop.")
                sys.stdout.flush()
                httpd.serve_forever()
                break
        except OSError as e:
            if "Address already in use" in str(e) or e.errno == 98 or e.errno == 10048:
                port += 1
            else:
                raise e

if __name__ == '__main__':
    run()
