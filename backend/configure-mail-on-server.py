#!/usr/bin/env python3
"""Interactive, private SMTP setup on the existing server."""

from getpass import getpass
import os
from pathlib import Path
import re
import smtplib
import ssl
import subprocess
import sys
import tempfile

SOURCE_DIR = Path(__file__).resolve().parent
RECIPIENT_FILE = SOURCE_DIR / "notify-to.private"
DESTINATION = Path("/etc/aerosspace-contact.env")
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")


def ask(label, default=""):
    suffix = f" [{default}]" if default else ""
    return input(f"{label}{suffix}: ").strip() or default


def quote(value):
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("An SMTP setting contains a control character")
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    if os.geteuid() != 0:
        raise ValueError("Run this setup with sudo on the server")
    if not RECIPIENT_FILE.is_file():
        raise ValueError("The private notification address file is missing")
    recipient = RECIPIENT_FILE.read_text().strip()
    if not EMAIL.fullmatch(recipient):
        raise ValueError("The private notification address is invalid")

    print("Enter the SMTP account that will send contact notifications.")
    print("For Gmail, use an app password. Your regular Google password will not work here.")
    host = ask("SMTP host", "smtp.gmail.com")
    port = int(ask("SMTP port", "465"))
    security = ask("Security (ssl or starttls)", "ssl").lower()
    user = ask("SMTP login")
    sender = ask("From email address", user)
    password = getpass("SMTP or app password (hidden): ")
    if not (1 <= port <= 65535 and security in ("ssl", "starttls") and
            host and user and password and EMAIL.fullmatch(sender)):
        raise ValueError("Invalid SMTP settings; nothing was saved")

    print("Checking SMTP login without sending a message...")
    context = ssl.create_default_context()
    if security == "ssl":
        with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as smtp:
            smtp.login(user, password)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.starttls(context=context)
            smtp.login(user, password)
    print("SMTP login succeeded.")

    fields = {
        "DATABASE_PATH": "/var/lib/aerosspace-contact/messages.sqlite3",
        "SMTP_HOST": host,
        "SMTP_PORT": str(port),
        "SMTP_SECURITY": security,
        "SMTP_USER": user,
        "SMTP_PASSWORD": password,
        "SMTP_FROM": sender,
        "NOTIFY_TO": recipient,
    }
    content = "".join(f"{key}={quote(value)}\n" for key, value in fields.items())
    fd, temporary = tempfile.mkstemp(prefix=".aerosspace-contact-",
                                      dir=DESTINATION.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            output.write(content)
        os.chmod(temporary, 0o600)
        os.replace(temporary, DESTINATION)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    RECIPIENT_FILE.unlink()
    subprocess.run(["/bin/bash", str(SOURCE_DIR / "install-on-server.sh")], check=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, smtplib.SMTPException, subprocess.CalledProcessError) as exc:
        print(f"Setup stopped: {type(exc).__name__}. No password was displayed.", file=sys.stderr)
        sys.exit(1)
