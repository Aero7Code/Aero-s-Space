#!/usr/bin/env python3
"""Copy a configured Nextcloud snap SMTP account into a private systemd env file."""

from pathlib import Path
import os
import re
import subprocess
import sys

OCC = "/snap/bin/nextcloud.occ"
DESTINATION = Path("/etc/aerosspace-contact.env")
RECIPIENT_FILE = Path(__file__).with_name("notify-to.private")
EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")


def setting(key):
    result = subprocess.run(
        [OCC, "config:system:get", key], capture_output=True, text=True, timeout=30,
        check=False,
    )
    return result.stdout.rstrip("\n") if result.returncode == 0 else ""


def quote(value):
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("SMTP setting contains a control character")
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main():
    if DESTINATION.exists():
        return 0
    if not Path(OCC).exists() or not RECIPIENT_FILE.is_file():
        return 1
    host = setting("mail_smtphost")
    user = setting("mail_smtpname")
    password = setting("mail_smtppassword")
    security = setting("mail_smtpsecure").lower()
    port = setting("mail_smtpport") or ("465" if security == "ssl" else "587")
    if security == "ssl":
        security = "ssl"
    elif security in ("tls", "starttls"):
        security = "starttls"
    else:
        return 1
    from_name = setting("mail_from_address")
    from_domain = setting("mail_domain")
    sender = from_name if "@" in from_name else f"{from_name}@{from_domain}"
    if not EMAIL.fullmatch(sender):
        sender = user
    recipient = RECIPIENT_FILE.read_text().strip()
    if not (host and user and password and port.isdecimal() and
            1 <= int(port) <= 65535 and EMAIL.fullmatch(sender) and
            EMAIL.fullmatch(recipient)):
        return 1
    fields = {
        "DATABASE_PATH": "/var/lib/aerosspace-contact/messages.sqlite3",
        "SMTP_HOST": host,
        "SMTP_PORT": port,
        "SMTP_SECURITY": security,
        "SMTP_USER": user,
        "SMTP_PASSWORD": password,
        "SMTP_FROM": sender,
        "NOTIFY_TO": recipient,
    }
    lines = "".join(f"{key}={quote(value)}\n" for key, value in fields.items())
    fd = os.open(DESTINATION, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as output:
        output.write(lines)
    RECIPIENT_FILE.unlink()
    print("Imported existing Nextcloud SMTP settings into the private contact configuration.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.TimeoutExpired):
        print("Could not import Nextcloud SMTP settings; configure the private env file manually.",
              file=sys.stderr)
        sys.exit(1)
