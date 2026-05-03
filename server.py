import http.server
import socketserver
import json
import urllib.request
import urllib.error
import random
import os

PORT = 8000

class MyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # 1. API Endpoint
        if self.path == '/api/grid':
            self.handle_api_grid()
            return

        # 2. Static Files
        if self.path == '/' or self.path == '/index.html':
            self.serve_file('index.html', 'text/html')
            return
        if self.path == '/style.css':
            self.serve_file('style.css', 'text/css')
            return
        if self.path == '/app_new.js': # Updated to match renamed file
            self.serve_file('app_new.js', 'application/javascript')
            return
        if self.path == '/app.js': # Fallback if you didn't rename
            self.serve_file('app.js', 'application/javascript')
            return
        if self.path == '/manifest.json':
            self.serve_file('manifest.json', 'application/json')
            return
        if self.path == '/service-worker.js':
            self.serve_file('service-worker.js', 'application/javascript')
            return
        
        # Fallback
        if os.path.exists(self.path.lstrip('/')):
            ext = os.path.splitext(self.path)[1]
            mime = 'application/octet-stream'
            if ext == '.png': mime = 'image/png'
            if ext == '.ico': mime = 'image/x-icon'
            if ext == '.svg': mime = 'image/svg+xml'
            self.serve_file(self.path.lstrip('/'), mime)
            return

        self.send_error(404, "Not Found")

    def handle_api_grid(self):
        # Set CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        target_url = "https://www.smartgriddashboard.com/DashboardService.svc/data?area=ROI&region=ALL"
        
        try:
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            with urllib.request.urlopen(req, timeout=10) as response:
                raw_data = response.read().decode('utf-8')
                
                # CRITICAL: Check if it's actually JSON
                if not raw_data.strip().startswith('{') and not raw_data.strip().startswith('['):
                    print(f"[GRID] ERROR: API returned non-JSON data: {raw_data[:100]}")
                    raise ValueError("Invalid JSON format from API")

                data = json.loads(raw_data)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
                print(f"[GRID] Success: Sent real data")
                return

        except Exception as e:
            print(f"[GRID] CRITICAL ERROR: {str(e)}")
            print(f"[GRID] Sending MOCK DATA to prevent UI crash")
            
            # Robust Mock Data
            mock_data = {
                "Rows": [
                    {"Name": "Demand", "Value": str(round(random.uniform(3000, 4500), 1))},
                    {"Name": "Wind", "Value": str(round(random.uniform(1200, 2500), 1))},
                    {"Name": "Solar", "Value": str(round(random.uniform(100, 800), 1))}
                ]
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(mock_data).encode('utf-8'))
            return

    def serve_file(self, filepath, mime_type):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-type', mime_type)
            self.send_header('Content-Length', len(content))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404, f"{filepath} not found")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        pass

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
        print(f"--- ple.ie Server Running on Port {PORT} ---")
        print("Open http://localhost:8000")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
