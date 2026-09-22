"""
DukaanAI - Local API Gateway HTTP Server Simulator
Mounts the AWS Lambda handler onto a local HTTP server for real socket & network testing.
Simulates API Gateway HTTP API v2 behavior (CORS, queryStringParameters, rawPath, methods).
"""
import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Ensure UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

# Ensure app directory is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

import main


class LambdaApiGatewayHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress noisy default logging
        pass

    def do_OPTIONS(self):
        self._dispatch("OPTIONS")

    def do_GET(self):
        self._dispatch("GET")

    def do_POST(self):
        self._dispatch("POST")

    def do_PUT(self):
        self._dispatch("PUT")

    def do_DELETE(self):
        self._dispatch("DELETE")

    def _dispatch(self, method: str):
        parsed = urlparse(self.path)
        raw_path = parsed.path
        query_dict = {k: v[0] for k, v in parse_qs(parsed.query).items()}

        body_str = None
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body_bytes = self.rfile.read(content_length)
            body_str = body_bytes.decode("utf-8")

        # Construct API Gateway HTTP API v2 Event
        event = {
            "rawPath": raw_path,
            "path": raw_path,
            "queryStringParameters": query_dict,
            "requestContext": {
                "http": {
                    "method": method,
                    "path": raw_path,
                }
            },
            "headers": dict(self.headers),
            "body": body_str
        }

        # Invoke Lambda
        response = main.lambda_handler(event, None)

        status_code = response.get("statusCode", 200)
        headers = response.get("headers", {})
        body = response.get("body", "")

        self.send_response(status_code)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()

        if body:
            self.wfile.write(body.encode("utf-8"))


def run_server(port=8000):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, LambdaApiGatewayHandler)
    print(f"[*] DukaanAI Local API Gateway Simulator running at http://127.0.0.1:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    run_server(port)
