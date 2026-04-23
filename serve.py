import http.server, socketserver, webbrowser, sys, os, threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.js': 'application/javascript', '.json': 'application/json'})

# ThreadingHTTPServer handles requests concurrently so a slow asset can't stall
# the page. allow_reuse_address lets restarts re-bind the port immediately.
class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

with Server(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"kbiology serving at {url}  (Ctrl+C to stop  |  fallback: taskkill /PID {os.getpid()} /F)")
    webbrowser.open(url)

    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    try:
        # Short poll so KeyboardInterrupt on Windows lands within ~100ms
        while t.is_alive():
            t.join(timeout=0.1)
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()
