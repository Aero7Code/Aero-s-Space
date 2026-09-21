"""Check that interactive mail setup writes the secret only to a private file."""

from contextlib import redirect_stdout
from io import StringIO
import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "configure_mail", Path(__file__).with_name("configure-mail-on-server.py")
)
configure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(configure)


class SMTPFake:
    def __init__(self, *_args, **_kwargs):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def login(self, username, password):
        assert username == "sender@example.com"
        assert password == "private-secret"


class ConfigureTests(unittest.TestCase):
    def test_secret_is_saved_with_private_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recipient = root / "notify-to.private"
            recipient.write_text("owner@example.com\n")
            destination = root / "contact.env"
            display = StringIO()
            with (patch.object(configure, "RECIPIENT_FILE", recipient),
                  patch.object(configure, "DESTINATION", destination),
                  patch.object(configure, "SOURCE_DIR", root),
                  patch.object(configure.os, "geteuid", return_value=0),
                  patch.object(configure, "ask", side_effect=["smtp.example", "465", "ssl",
                                                             "sender@example.com", "sender@example.com"]),
                  patch.object(configure, "getpass", return_value="private-secret"),
                  patch.object(configure.smtplib, "SMTP_SSL", SMTPFake),
                  patch.object(configure.subprocess, "run"),
                  redirect_stdout(display)):
                self.assertEqual(configure.main(), 0)
            self.assertFalse(recipient.exists())
            self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o600)
            self.assertIn('SMTP_PASSWORD="private-secret"', destination.read_text())
            self.assertNotIn("private-secret", display.getvalue())


if __name__ == "__main__":
    unittest.main()
