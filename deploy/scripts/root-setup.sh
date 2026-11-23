#!/usr/bin/env bash
# Run ONCE as root on the VPS. Adds ONLY the Exploria360 nginx site + its TLS certificate.
#   bash /home/deploy/exploria360/shared/nginx/root-setup.sh you@example.com
# It never edits other sites. Every nginx change is validated with `nginx -t` first and is
# rolled back automatically if validation fails.
set -euo pipefail
EMAIL="${1:?usage: root-setup.sh <email-for-letsencrypt-notices>}"
SRC=/home/deploy/exploria360/shared/nginx
AV=/etc/nginx/sites-available/exploria360.conf
EN=/etc/nginx/sites-enabled/exploria360.conf

rollback() { echo "!! failed — rolling back Exploria360 nginx files"; rm -f "$EN" "$AV"; nginx -t && systemctl reload nginx || true; exit 1; }
trap rollback ERR

echo "== stage 1: HTTP-only site (needed for the certificate challenge)"
install -m 644 "$SRC/exploria360.http.conf" "$AV"
ln -sfn "$AV" "$EN"
nginx -t
systemctl reload nginx

echo "== certificate (Let's Encrypt, webroot) for exploria360.com + www"
if [ -s /etc/letsencrypt/live/exploria360.com/fullchain.pem ]; then
  echo "certificate already present — not requesting a new one"
else
  certbot certonly --webroot -w /var/www/html -d exploria360.com -d www.exploria360.com \
    --non-interactive --agree-tos -m "$EMAIL" --cert-name exploria360.com
fi

echo "== stage 2: HTTPS site (apex→www, HTTP→HTTPS)"
install -m 644 "$SRC/exploria360.conf" "$AV"
nginx -t
systemctl reload nginx

trap - ERR
echo "DONE. Test:  curl -I https://www.exploria360.com/"
