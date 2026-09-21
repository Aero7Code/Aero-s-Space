#!/usr/bin/env bash
set -Eeuo pipefail

if (( EUID != 0 )); then
  echo 'Run this script with sudo on the server.' >&2
  exit 1
fi

source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
install -d -o root -g root -m 0755 /opt/aerosspace-contact
install -d -o aero_web -g aero_web -m 0700 /var/lib/aerosspace-contact
install -o root -g root -m 0644 "$source_dir/server.py" /opt/aerosspace-contact/server.py
for unit in aerosspace-contact.service aerosspace-contact-retry.service aerosspace-contact-retry.timer; do
  install -o root -g root -m 0644 "$source_dir/$unit" "/etc/systemd/system/$unit"
done
if [[ ! -e /etc/aerosspace-contact.env ]]; then
  if ! python3 "$source_dir/import-nextcloud-mail.py"; then
    install -o root -g root -m 0600 "$source_dir/contact.env.example" /etc/aerosspace-contact.env
    echo 'No reusable Nextcloud SMTP configuration was found.'
    echo 'Fill in /etc/aerosspace-contact.env with sudoedit, then rerun this installer.'
    exit 0
  fi
fi
if grep -q 'replace-with-an-app-password\|your-address@gmail.com' /etc/aerosspace-contact.env; then
  echo 'Fill in /etc/aerosspace-contact.env, then rerun this installer.' >&2
  exit 1
fi
systemctl daemon-reload
systemctl enable --now aerosspace-contact.service aerosspace-contact-retry.timer
systemctl restart aerosspace-contact.service
systemctl is-active --quiet aerosspace-contact.service
echo 'Contact receiver and retry timer are installed and running.'
