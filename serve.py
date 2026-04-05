import http.server, socketserver, webbrowser, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.js': 'application/javascript', '.json': 'application/json'})

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    url = f"http://localhost:{PORT}"
    print(f"kbiology serving at {url}  (Ctrl+C to stop)")
    webbrowser.open(url)
    httpd.serve_forever()
