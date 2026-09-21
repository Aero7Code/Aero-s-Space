"""Verify that importing Nextcloud mail settings creates only a private config."""

import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "import_nextcloud_mail", Path(__file__).with_name("import-nextcloud-mail.py")
)
mail_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mail_import)


class ImportTests(unittest.TestCase):
    def test_private_import_and_no_secret_output(self):
        settings = {
            "mail_smtphost": "smtp.example",
            "mail_smtpname": "login@example.com",
            "mail_smtppassword": 'secret"value',
            "mail_smtpsecure": "tls",
            "mail_smtpport": "587",
            "mail_from_address": "contact",
            "mail_domain": "example.com",
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recipient = root / "notify-to.private"
            recipient.write_text("owner@example.com\n")
            destination = root / "contact.env"
            with (patch.object(mail_import, "OCC", str(recipient)),
                  patch.object(mail_import, "DESTINATION", destination),
                  patch.object(mail_import, "RECIPIENT_FILE", recipient),
                  patch.object(mail_import, "setting", settings.get)):
                self.assertEqual(mail_import.main(), 0)
            self.assertFalse(recipient.exists())
            self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o600)
            content = destination.read_text()
            self.assertIn('SMTP_SECURITY="starttls"', content)
            self.assertIn('SMTP_FROM="contact@example.com"', content)
            self.assertIn('SMTP_PASSWORD="secret\\"value"', content)


if __name__ == "__main__":
    unittest.main()
