# Aero's Space

A static personal site published at `https://aerosspace.uno/` with GitHub Pages.

## Local preview

Run `python3 -m http.server 8000` in this directory, then open `http://localhost:8000/`.

The contact form opens a draft in the visitor's email app. The visitor must send that draft. GitHub Pages cannot run the former Flask server, so the site does not claim that a form submission has been delivered.

## Safe publishing

`python3 scripts/build_site.py` builds `dist/` from an explicit list of public pages and assets. It rejects inline scripts, inline event handlers, and local server URLs in pages. It does not copy databases, Python files, environment variables, or other repository files. The GitHub Actions workflow runs the same build on pull requests and publishes the artifact on pushes to `main`.

After these changes are pushed, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. Keep the custom domain set to `aerosspace.uno` in Pages settings, and keep **Enforce HTTPS** enabled. The current live domain already redirects HTTP to HTTPS. A `CNAME` file alone does not configure the Pages custom domain for an Actions deployment.

Until the Pages source is switched, GitHub may still publish files directly from the repository branch. The former `emails.db` file and unused server files have been removed from this checkout, but the live site changes only after the updated commit is pushed and Pages rebuilds.

## Future features

Keep secrets and user data outside this repository and outside the Pages artifact. `.gitignore` catches common local database and environment filenames, but it does not protect a file that was already committed. Use a separate hosted backend for server-side features such as stored messages, logins, or payments. Review authentication, input limits, abuse controls, and privacy before enabling any such endpoint. Never put an API key or password in browser JavaScript.
