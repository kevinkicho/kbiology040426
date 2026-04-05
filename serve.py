import http.server, socketserver, webbrowser, sys, os, threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.js': 'application/javascript', '.json': 'application/json'})

socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"kbiology serving at {url}  (Ctrl+C to stop  |  fallback: taskkill /PID {os.getpid()} /F)")
    webbrowser.open(url)

    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    try:
        while t.is_alive():
            t.join(timeout=1)   # wake up every second so KeyboardInterrupt can land
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()
