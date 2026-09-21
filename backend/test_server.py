"""Security and delivery checks for the contact receiver."""

from contextlib import closing
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

import server as contact


class ContactTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.config = contact.Config(Path(self.temp.name) / "messages.sqlite3", "smtp.example", 465,
                                     "sender@example.com", "unused", "owner@example.com")
        contact.init_db(self.config.database)
        self.sent = []
        self.server = contact.ContactHTTPServer(("127.0.0.1", 0), self.config,
                                                lambda _cfg, *fields: self.sent.append(fields))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}/contact"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def submit(self, data=None, origin=contact.ORIGIN, request_id=None):
        data = data or {"name": "Example Person", "email": "person@example.com",
                        "message": "Please contact me", "website": ""}
        request = Request(self.url, data=json.dumps(data).encode(), method="POST", headers={
            "Origin": origin,
            "Content-Type": "application/json",
            "Idempotency-Key": request_id or str(uuid4()),
        })
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            return response.status, dict(response.headers), json.load(response)

    def count(self):
        with closing(sqlite3.connect(self.config.database)) as db:
            return db.execute("SELECT COUNT(*) FROM submissions").fetchone()[0]

    def test_valid_message_is_stored_and_emailed_once(self):
        request_id = str(uuid4())
        status, headers, _ = self.submit(request_id=request_id)
        self.assertEqual(status, 201)
        self.assertEqual(headers["Access-Control-Allow-Origin"], contact.ORIGIN)
        self.assertEqual(self.count(), 1)
        self.assertEqual(len(self.sent), 1)
        status, _, _ = self.submit(request_id=request_id)
        self.assertEqual(status, 200)
        self.assertEqual(self.count(), 1)
        self.assertEqual(len(self.sent), 1)

    def test_unapproved_origin_and_invalid_data_are_rejected(self):
        status, headers, _ = self.submit(origin="https://other.example")
        self.assertEqual(status, 403)
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        status, _, _ = self.submit(data={"name": "X", "email": "bad\naddress@example.com",
                                           "message": "Hello"})
        self.assertEqual(status, 400)
        self.assertEqual(self.count(), 0)

    def test_honeypot_and_rate_limit(self):
        status, _, _ = self.submit(data={"name": "Bot", "email": "bot@example.com",
                                          "message": "Spam", "website": "filled"})
        self.assertEqual(status, 201)
        self.assertEqual(self.count(), 0)
        old_limit = contact.HOURLY_LIMIT
        try:
            contact.HOURLY_LIMIT = 1
            self.assertEqual(self.submit()[0], 201)
            self.assertEqual(self.submit()[0], 429)
        finally:
            contact.HOURLY_LIMIT = old_limit
        self.assertEqual(self.count(), 1)

    def test_email_failure_keeps_message_for_retry(self):
        self.server.sender = lambda *_args: (_ for _ in ()).throw(OSError("offline"))
        status, _, _ = self.submit()
        self.assertEqual(status, 202)
        self.assertEqual(self.count(), 1)
        with closing(sqlite3.connect(self.config.database)) as db:
            row_id, notified_at = db.execute("SELECT id, notified_at FROM submissions").fetchone()
        self.assertIsNone(notified_at)
        self.assertTrue(contact.notify(self.config, row_id,
                                       lambda _cfg, *fields: self.sent.append(fields)))
        self.assertEqual(len(self.sent), 1)

    def test_smtp_mode_and_password_are_loaded_without_changing_password(self):
        settings = {
            "DATABASE_PATH": str(self.config.database),
            "SMTP_HOST": "smtp.example",
            "SMTP_PORT": "587",
            "SMTP_SECURITY": "starttls",
            "SMTP_USER": "login",
            "SMTP_PASSWORD": " spaces stay ",
            "SMTP_FROM": "sender@example.com",
            "NOTIFY_TO": "owner@example.com",
        }
        with patch.dict(os.environ, settings):
            loaded = contact.Config.from_environment()
        self.assertEqual(loaded.smtp_security, "starttls")
        self.assertEqual(loaded.smtp_from, "sender@example.com")
        self.assertEqual(loaded.smtp_password, " spaces stay ")


if __name__ == "__main__":
    unittest.main()
