# Aero's Space

The static website is published at `https://aerosspace.uno/` through GitHub Pages. The source of the contact receiver is in `backend/`; GitHub Pages publishes only the allowlisted files built by `scripts/build_site.py`.

## Local preview and checks

Run `python3 -m http.server 8000` in this directory, then open `http://localhost:8000/`. Run `python3 scripts/build_site.py` to build the public artifact. Run `python3 -m unittest discover -s backend -p 'test_*.py'` to test the contact receiver.

The contact page submits to a separate HTTPS endpoint on the existing server. That endpoint stores the message in a private SQLite database and sends an email notification. See [backend/README.md](backend/README.md) for installation and recovery details. Do not publish the new form until the backend is configured, reachable, and tested.

## Publishing and secrets

The GitHub Actions workflow publishes `dist/`, which contains only the intended HTML, JavaScript, CSS, images, and custom-domain file. It excludes the backend, its database, credentials, and every other repository file. The Pages source is configured for GitHub Actions, with the `aerosspace.uno` custom domain and HTTPS enforcement.

Keep credentials in the server's root-owned `/etc/aerosspace-contact.env`, never in this repository or browser JavaScript. The database lives under `/var/lib/aerosspace-contact/`, outside any web directory. `.gitignore` catches common local secret and database filenames, but does not protect data already committed.
