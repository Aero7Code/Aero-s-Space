#!/usr/bin/env python3
"""Private SQLite storage and SMTP delivery for Aero's Space contact forms."""

import json
import os
from contextlib import contextmanager
from pathlib import Path
import re
import smtplib
import sqlite3
import ssl
import sys
import threading
import time
from dataclasses import dataclass
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from uuid import UUID

ORIGIN = "https://aerosspace.uno"
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")
MAX_BODY = 8192
HOURLY_LIMIT = 25


@dataclass(frozen=True)
class Config:
    database: Path
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    notify_to: str
    smtp_security: str = "ssl"
    smtp_from: str = ""

    @classmethod
    def from_environment(cls):
        values = {name: os.environ.get(name, "").strip() for name in (
            "DATABASE_PATH", "SMTP_HOST", "SMTP_PORT", "SMTP_USER",
            "NOTIFY_TO",
        )}
        values["SMTP_PASSWORD"] = os.environ.get("SMTP_PASSWORD", "")
        if not all(values.values()):
            raise ValueError("Contact service configuration is incomplete")
        database = Path(values["DATABASE_PATH"])
        if not database.is_absolute() or database.is_symlink():
            raise ValueError("DATABASE_PATH must be an absolute non-symlink path")
        port = int(values["SMTP_PORT"])
        if not 1 <= port <= 65535:
            raise ValueError("Invalid SMTP_PORT")
        security = os.environ.get("SMTP_SECURITY", "ssl").strip().lower()
        sender = os.environ.get("SMTP_FROM", values["SMTP_USER"]).strip()
        if security not in ("ssl", "starttls"):
            raise ValueError("SMTP_SECURITY must be ssl or starttls")
        if not 1 <= len(values["SMTP_USER"]) <= 254 or any(ord(c) < 33 or ord(c) == 127 for c in values["SMTP_USER"]):
            raise ValueError("Invalid SMTP_USER")
        if not EMAIL.fullmatch(sender) or not EMAIL.fullmatch(values["NOTIFY_TO"]):
            raise ValueError("Invalid SMTP_FROM or NOTIFY_TO")
        return cls(database, values["SMTP_HOST"], port,
                   values["SMTP_USER"], values["SMTP_PASSWORD"], values["NOTIFY_TO"],
                   security, sender)


@contextmanager
def connect(database):
    conn = sqlite3.connect(database, timeout=5)
    try:
        conn.execute("PRAGMA busy_timeout = 5000")
        with conn:
            yield conn
    finally:
        conn.close()


def init_db(database):
    if not database.parent.is_dir() or database.parent.is_symlink():
        raise ValueError("Private database directory does not exist")
    if database.exists() and database.is_symlink():
        raise ValueError("Database must not be a symlink")
    with connect(database) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY,
            request_id TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            notified_at INTEGER
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS submissions_created_at ON submissions(created_at)")
    os.chmod(database, 0o600)


def validate(data):
    if not isinstance(data, dict):
        raise ValueError("Invalid form")
    if any(not isinstance(data.get(key), str) for key in ("name", "email", "message")):
        raise ValueError("All fields are required")
    name = data["name"].strip()
    email = data["email"].strip()
    message = data["message"].strip()
    website = data.get("website", "")
    if not isinstance(website, str) or len(website) > 200:
        raise ValueError("Invalid form")
    if not 1 <= len(name) <= 100 or any(ord(c) < 32 for c in name):
        raise ValueError("Invalid name")
    if not 1 <= len(email) <= 254 or not EMAIL.fullmatch(email):
        raise ValueError("Invalid email")
    if not 1 <= len(message) <= 1000 or any(ord(c) < 32 and c not in "\n\t" for c in message):
        raise ValueError("Invalid message")
    return name, email, message, website


def store(config, request_id, name, email, message):
    now = int(time.time())
    with connect(config.database) as conn:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute("SELECT id FROM submissions WHERE request_id = ?", (request_id,)).fetchone()
        if existing:
            return existing[0], True
        count = conn.execute("SELECT COUNT(*) FROM submissions WHERE created_at >= ?", (now - 3600,)).fetchone()[0]
        if count >= HOURLY_LIMIT:
            raise OverflowError("Hourly form limit reached")
        cursor = conn.execute(
            "INSERT INTO submissions(request_id, created_at, name, email, message) VALUES (?, ?, ?, ?, ?)",
            (request_id, now, name, email, message),
        )
        return cursor.lastrowid, False


def smtp_notification(config, name, email, message):
    mail = EmailMessage()
    mail["From"] = config.smtp_from or config.smtp_user
    mail["To"] = config.notify_to
    mail["Reply-To"] = email
    mail["Subject"] = "New Aero's Space contact message"
    mail.set_content(f"Name: {name}\nEmail: {email}\n\nMessage:\n{message}\n")
    context = ssl.create_default_context()
    if config.smtp_security == "starttls":
        with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10) as smtp:
            smtp.starttls(context=context)
            smtp.login(config.smtp_user, config.smtp_password)
            smtp.send_message(mail)
    else:
        with smtplib.SMTP_SSL(config.smtp_host, config.smtp_port,
                              context=context, timeout=10) as smtp:
            smtp.login(config.smtp_user, config.smtp_password)
            smtp.send_message(mail)


def notify(config, row_id, sender=smtp_notification):
    with connect(config.database) as conn:
        row = conn.execute(
            "SELECT name, email, message, notified_at FROM submissions WHERE id = ?", (row_id,)
        ).fetchone()
    if not row or row[3] is not None:
        return True
    try:
        sender(config, row[0], row[1], row[2])
    except Exception as exc:
        print(f"Email notification pending ({type(exc).__name__})", file=sys.stderr)
        return False
    try:
        with connect(config.database) as conn:
            conn.execute("UPDATE submissions SET notified_at = ? WHERE id = ?", (int(time.time()), row_id))
    except sqlite3.Error as exc:
        print(f"Email delivered; status update pending ({type(exc).__name__})", file=sys.stderr)
        return False
    return True


class ContactHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 16

    def __init__(self, address, config, sender=smtp_notification):
        super().__init__(address, ContactHandler)
        self.config = config
        self.sender = sender
        self.slots = threading.BoundedSemaphore(16)

    def process_request(self, request, client_address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, client_address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.slots.release()


class ContactHandler(BaseHTTPRequestHandler):
    server_version = "AeroContact"

    def setup(self):
        super().setup()
        self.connection.settimeout(8)

    def log_message(self, *_args):
        # Do not write names, email addresses, messages, or query strings to logs.
        pass

    def respond(self, status, message, origin=None):
        body = json.dumps({"message": message}).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Vary", "Origin")
        if origin == ORIGIN:
            self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        if self.path != "/contact":
            return self.respond(404, "Not found")
        if self.headers.get("Origin") != ORIGIN:
            return self.respond(403, "Forbidden")
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self.respond(404, "Not found")

    def do_POST(self):
        if self.path != "/contact":
            return self.respond(404, "Not found")
        origin = self.headers.get("Origin")
        if origin != ORIGIN:
            return self.respond(403, "Forbidden")
        if self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower() != "application/json":
            return self.respond(415, "Use JSON", origin)
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            return self.respond(411, "Content length required", origin)
        if not 1 <= length <= MAX_BODY:
            return self.respond(413, "Message too large", origin)
        try:
            request_id = str(UUID(self.headers.get("Idempotency-Key", "")))
            data = json.loads(self.rfile.read(length))
            name, email, message, website = validate(data)
        except (ValueError, UnicodeError, json.JSONDecodeError):
            return self.respond(400, "Please check the form fields", origin)
        if website:
            return self.respond(201, "Message received", origin)
        try:
            row_id, duplicate = store(self.server.config, request_id, name, email, message)
        except OverflowError:
            return self.respond(429, "Too many messages right now. Please try later", origin)
        except sqlite3.Error:
            return self.respond(503, "Could not save your message. Please try later", origin)
        if duplicate:
            return self.respond(200, "Message received", origin)
        delivered = notify(self.server.config, row_id, self.server.sender)
        self.respond(201 if delivered else 202, "Message received", origin)


def main():
    os.umask(0o077)
    config = Config.from_environment()
    init_db(config.database)
    if len(sys.argv) == 2 and sys.argv[1] == "--retry-pending":
        with connect(config.database) as conn:
            rows = conn.execute("SELECT id FROM submissions WHERE notified_at IS NULL ORDER BY id LIMIT 50").fetchall()
        for row_id, in rows:
            notify(config, row_id)
        return
    if len(sys.argv) != 1:
        raise SystemExit("Usage: server.py [--retry-pending]")
    server = ContactHTTPServer(("127.0.0.1", 8787), config)
    print("Contact service listening on 127.0.0.1:8787", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
