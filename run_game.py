import http.server
import socketserver
import webbrowser
import os
import sys

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Keep console output clean
        pass

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def start_server():
    ports_to_try = [8000, 8080, 8888, 3000, 5000]
    httpd = None
    chosen_port = None

    for port in ports_to_try:
        try:
            httpd = ReusableTCPServer(("", port), QuietHandler)
            chosen_port = port
            break
        except OSError:
            continue

    if not httpd:
        print("未能绑定可用端口，请关闭占用端口的程序后重试。")
        sys.exit(1)

    url = f"http://localhost:{chosen_port}/index.html"
    print(f"==================================================")
    print(f"  Angry Birds Remastered 游戏服务已启动!")
    print(f"  浏览器访问地址: {url}")
    print(f"==================================================")
    
    # Automatically open the browser
    webbrowser.open(url)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已退出。")

if __name__ == "__main__":
    start_server()
