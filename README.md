# Aero's Space

The static website is published at `https://aerosspace.uno/` through GitHub Pages. This public repository contains only the website-facing source and publishes the allowlisted files built by `scripts/build_site.py`. Contact, account, Tailscale, and Jellyfin services are maintained separately in a private backend repository.

## Local preview and checks

Run `python3 -m http.server 8000` in this directory, then open `http://localhost:8000/`. Run `python3 scripts/build_site.py` to build the public artifact.

The contact and movie-account pages submit to separate HTTPS endpoints on the existing server. Private SQLite databases, credentials, verification delivery, device records, Tailscale automation, and Jellyfin provisioning remain in the private backend project and on the server.

## Publishing and secrets

The GitHub Actions workflow publishes `dist/`, which contains only the intended HTML, JavaScript, CSS, images, and custom-domain file. The Pages source is configured for GitHub Actions, with the `aerosspace.uno` custom domain and HTTPS enforcement.

Never put credentials, private databases, server configuration, or backend source in this repository or browser JavaScript. `.gitignore` catches common local secret and database filenames, but does not protect data already committed.
