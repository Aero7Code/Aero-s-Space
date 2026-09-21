# Private contact receiver

This service receives `POST /contact` from `https://aerosspace.uno`, stores submissions in a private SQLite database, and sends an SMTP notification. It exposes no database or admin HTTP route. It binds only to `127.0.0.1:8787`; the intended public route is a dedicated Tailscale Funnel on HTTPS port `10000`. The existing private Tailscale Serve routes on port `443` must remain private.

The receiver uses only Python 3.12's standard library. It limits request size, validates fields, checks the browser origin, accepts an idempotency key, uses a honeypot, caps saved submissions at 25 per hour, and retries failed notifications every five minutes. These controls limit casual abuse but cannot prevent all spam on an anonymous public form.

## Install on the server

1. Copy this `backend/` directory to `/home/aero_web/aerosspace-contact/` on the server.
2. Put the approved notification address in `notify-to.private` beside the installer, with file mode `0600`. This file is ignored by Git.
3. Run `sudo ./install-on-server.sh` from that directory. If Nextcloud snap has SMTP configured, the installer copies those settings into `/etc/aerosspace-contact.env` without displaying its password, removes `notify-to.private`, and starts the service. If it cannot find usable SMTP settings, it creates a placeholder configuration and stops.
4. If no reusable configuration was found, run `sudo python3 /home/aero_web/aerosspace-contact/configure-mail-on-server.py` in a private terminal. It prompts for an SMTP account and password without echoing the password, verifies the login, writes `/etc/aerosspace-contact.env` with mode `0600`, and starts the service. The defaults are Gmail SMTP on port 465 with SSL; Gmail requires an [app password](https://myaccount.google.com/apppasswords) for this type of sign-in. You can enter another provider's host, port, and security mode. Do not paste the password into chat, GitHub, or website files.
5. Check `sudo systemctl status aerosspace-contact.service aerosspace-contact-retry.timer`.
6. Test SMTP and database storage locally before opening the public route. Then enable only the dedicated form port: `sudo tailscale funnel --bg --https=10000 http://127.0.0.1:8787`. Confirm `tailscale funnel status --json` shows port `10000` for the contact receiver and port `443` remains private.
7. Test a real submission from the website. Confirm a new row exists in `/var/lib/aerosspace-contact/messages.sqlite3` and the notification arrives. Then publish the new static site.

The server's database directory is mode `0700` and its SQLite file is mode `0600`. Back it up as private data. Failed SMTP sends leave the saved row pending; the systemd timer retries. Check `sudo journalctl -u aerosspace-contact.service -u aerosspace-contact-retry.service` if notifications stop.

Run tests before installing: `python3 -m unittest discover -s backend -p 'test_*.py'` from the repository root. Tests use a temporary database and a fake SMTP sender; they do not send real email.
