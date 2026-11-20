# DEPLOYMENT — Exploria360 (production)

Target: VPS `187.53.136.225` · domain `https://www.exploria360.com/`
Principle: **isolated, reversible, non-destructive.** The server may host other projects — nothing here stops, removes or overwrites anything that is not Exploria360.

> Status: kit prepared and tested locally. **Nothing has been deployed yet** (SSH access pending). This file is updated as each step is actually performed.

## ⚠ Findings from public, read-only probes (2026-11-14, no credentials used)

* **The VPS already hosts another live production site**: `Art Visions Tunisie` (certificate `CN=art-visions.tn`, nginx 1.24 on Ubuntu, a Next.js app). It is the **default vhost** — requests for `exploria360.com` currently fall through to it (with a certificate mismatch). Therefore: **never edit, reload-break, or remove its nginx config, certificate, containers or ports.** Add only a *new* `server_name exploria360.com www.exploria360.com` block; always `nginx -t` before `reload`.
* Host key to pin (ed25519, verify against your provider console before trusting):
  `SHA256:m3wbnRDFs6qO4Ax3jpZi73+qS5NLw0ZPD3cZXWdXdec`
* Ports 22, 80, 443 are reachable from the internet.
* **DNS is already correct**: `exploria360.com` and `www.exploria360.com` → `A 187.53.136.225` (TTL 3600). No AAAA, no CAA. Existing records to KEEP: `MX` (mx1/mx2/mx3.mail.ovh.net), `TXT` SPF (`v=spf1 include:mx.ovh.com -all`), the OVH redirect marker `TXT "1|www.exploria360.com"`, and the OVH nameservers (`dns106.ovh.net`, `ns106.ovh.net`). **No DNS change is required** — only TLS issuance for our two names.

## 0. What gets deployed

| Piece | How |
|---|---|
| Frontend (Next.js) | container `exploria360-frontend`, bound to `127.0.0.1:${FRONTEND_HOST_PORT:-3100}` |
| Backend (Express) | container `exploria360-backend`, bound to `127.0.0.1:${BACKEND_HOST_PORT:-3101}` |
| Database | **external MongoDB (Atlas)** — no DB container, no DB port published anywhere |
| TLS / public entry | nginx (existing one if present) → `127.0.0.1:3100`; Let's Encrypt certificate |
| Compose project | `docker compose -p exploria360` (own network `exploria360-network`) |
| Public catalogue | `PUBLIC_VENUE_SLUGS=maison-hotes-demo-exploria360` → **only the demo is public** |

Files: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `deploy/nginx/*.conf`, `deploy/env.production.example`, `deploy/scripts/backup-atlas.sh`, `.github/workflows/deploy.yml` (manual, SSH key + pinned host key).

## 1. Access (you provide; never paste secrets in chat or commit them)

Preferred: a dedicated non-root user in the `docker` group, key-only SSH.

```bash
# on the VPS, as root (once):
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# paste the PUBLIC key of a NEW keypair generated on your machine:
echo "ssh-ed25519 AAAA… exploria360-deploy" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
```
Local: `ssh-keygen -t ed25519 -f ~/.ssh/exploria360_deploy -C exploria360-deploy`.
Pin the host key (verify the fingerprint through your provider's console): `ssh-keyscan -t ed25519 187.53.136.225`.
After deployment: rotate the root password and disable password SSH logins.

## 2. Read-only inspection (run BEFORE changing anything; paste the output back)

```bash
hostnamectl; uname -r; uptime
nproc; free -h; df -h /; df -h /var/lib/docker 2>/dev/null
ss -tlnp                                  # occupied ports (pick free ones for 3100/3101)
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker compose ls; docker network ls; docker volume ls
ls -la /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null; nginx -T 2>/dev/null | grep -E "server_name|listen|proxy_pass"
ls -la /opt /app /srv /var/www 2>/dev/null
systemctl list-units --type=service --state=running --no-pager | head -40
ufw status verbose 2>/dev/null; iptables -S 2>/dev/null | head -20
```
Decisions taken from the output: free host ports; whether nginx already runs (reuse it — add a new `server` block only) or is absent (install); whether the old workflow's directory `/app/mareservation` is a **previous deployment of this app** (then keep it untouched and deploy to a NEW dir such as `/opt/exploria360`).

## 3. Backups (mandatory before any production change)

1. **Application state** (if a previous deployment exists): `tar czf ~/pre-exploria360-app-$(date +%F).tgz <old app dir> /etc/nginx/sites-available /etc/nginx/conf.d` (config + .env only; no `node_modules`).
2. **Database** (Atlas, read-only): `MONGODB_URI='…' deploy/scripts/backup-atlas.sh ~/backups` → dump + dry-run restore verification + sha256.
   Also confirm an Atlas-side snapshot/backup exists (Atlas UI → Backup).
3. Copy backups **off the server**; record the sha256.
4. **Restore drill** (on a scratch DB/cluster, never production): `mongorestore --gzip --archive=dump.archive.gz --nsFrom 'prod.*' --nsTo 'restore_test.*' --uri <scratch>`.

## 4. Deploy

```bash
# as deploy@VPS
sudo install -d -o deploy -g deploy /opt/exploria360 && cd /opt/exploria360
git clone https://github.com/declared-as-ala/mareservation.git .   # or: git fetch && git checkout --detach <sha>
cp deploy/env.production.example backend/.env && chmod 600 backend/.env   # then edit: MONGODB_URI, JWT_SECRET, …
printf 'FRONTEND_HOST_PORT=3100\nBACKEND_HOST_PORT=3101\n' > .env          # ports confirmed free in §2
docker compose -p exploria360 build
docker compose -p exploria360 up -d
docker compose -p exploria360 ps
curl -fsS http://127.0.0.1:3101/api/v1/health          # → {"status":"ok","db":"connected"}
curl -fsSI http://127.0.0.1:3100/ | head -1
```
Never run: `docker system prune`, `docker volume prune`, `docker compose down -v`, `--remove-orphans`, `--force-recreate` on other projects.

### 4a. Demo seed (only after §3 is verified)

```bash
cd /opt/exploria360
docker compose -p exploria360 exec backend npx tsx src/scripts/seed-demo-maison.ts --dry-run --allow-remote   # preview
docker compose -p exploria360 exec backend npx tsx src/scripts/seed-demo-maison.ts --yes --allow-remote       # inserts/updates ONLY the demo venue
```
(If `tsx` is not in the production image, run the seed from your machine against the same URI with the same flags.) The script prints the target host/db, is idempotent, and fails if any other venue changed.

## 5. nginx + HTTPS

* If nginx already serves other sites: add `deploy/nginx/exploria360.http.conf` as a **new** file; do not edit other server blocks; `nginx -t && systemctl reload nginx`.
* Obtain the certificate **only when DNS already points to the VPS**: `certbot certonly --webroot -w /var/www/certbot -d exploria360.com -d www.exploria360.com`.
* Switch to `deploy/nginx/exploria360.conf` (HTTP→HTTPS, apex→www), `nginx -t && systemctl reload nginx`. Check renewal: `certbot renew --dry-run`.
* Firewall: allow 80/443 (+ SSH); do **not** open 3100/3101/27017.

## 6. DNS (at your domain provider)

**Current state (verified): already correct — see the findings above. The table below is the target; at OVH it is already in place, so just verify, do not edit.**

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| A | `@` (exploria360.com) | `187.53.136.225` | 300 (raise to 3600 once stable) |
| A | `www` | `187.53.136.225` | 300 |
| AAAA | `@` and `www` | **none** unless the VPS has IPv6 *and* nginx listens on it — remove any stale AAAA pointing elsewhere | — |

* Check existing records first and remove only **conflicting** `A`/`AAAA`/`CNAME` records for `@` and `www` (e.g. a parking page or an old host). A `CNAME` on `www` cannot coexist with an `A` on `www`.
* **Keep** every `MX`, `TXT` (SPF `v=spf1…`, DKIM, DMARC `_dmarc`, verification), and `CAA` record. If a `CAA` exists it must allow `letsencrypt.org`.
* Do **not** change nameservers.
* Verify: `dig +short exploria360.com A`, `dig +short www.exploria360.com A`, `curl -I http://www.exploria360.com`, then after TLS: `curl -I https://www.exploria360.com` and `openssl s_client -connect www.exploria360.com:443 -servername www.exploria360.com </dev/null | openssl x509 -noout -dates -subject`. Propagation can take minutes to hours depending on previous TTLs.

## 7. Post-deployment verification checklist

- [ ] `/` loads, Exploria360 branding only, no hidden categories in nav/footer
- [ ] `/accommodations` lists **only** the demo; `/accommodation/maison-hotes-demo-exploria360` shows the demo banner, 360° tour loads (click), fullscreen works
- [ ] mobile (real phone): tour touch + layout
- [ ] `curl -s https://www.exploria360.com/api/v1/venues` → only the demo, `isDemo:true`
- [ ] `POST /api/v1/hotel-checkout/hold` and `/api/v1/reservations` for the demo → **403** `DEMO_VENUE_NOT_BOOKABLE`
- [ ] `/cafes`, `/restaurants`, `/cinema`, `/coworking`, `/evenements`, `/sos-conseil` → 404; `/hotels` → 308 `/accommodations`
- [ ] contact form → `201`, lead visible in `partnerapplications`
- [ ] register/login/logout/refresh work over HTTPS (cookie `Secure`)
- [ ] `robots.txt`, `sitemap.xml` (demo excluded), demo page `noindex`
- [ ] browser console: no errors; `docker compose -p exploria360 logs --tail=100` clean

## 8. Rollback

* **App**: `cd /opt/exploria360 && git checkout --detach <previous-sha> && docker compose -p exploria360 build && docker compose -p exploria360 up -d`.
  Fast stop (this project only): `docker compose -p exploria360 stop`.
* **nginx**: `rm /etc/nginx/sites-enabled/exploria360.conf && nginx -t && systemctl reload nginx` (other sites untouched).
* **Demo seed**: it only inserts/updates one document. To withdraw: remove `maison-hotes-demo-exploria360` from `PUBLIC_VENUE_SLUGS` (empties the public catalogue immediately) or set `isPublished:false` on that single venue.
* **Database**: restore from the verified archive **only** with explicit approval (`mongorestore --gzip --archive=… --nsInclude '<db>.*'`), preferably into a scratch DB first.
* **DNS**: re-point `A` records to the previous values (record them before changing).

## 9. Security checklist (carried from the audit)

JWT secret ≥32 chars and not a placeholder · `COOKIE_SECURE=true` · CORS restricted to the real origins · `trust proxy` on · MongoDB never published (Atlas IP allow-list = the VPS only; dedicated least-privilege DB user; no `0.0.0.0/0`) · frontend container has **no** backend secrets · containers run as non-root · SSH key-only, deploy user · root password rotated · `PARTNER_NOTIFICATION_EMAILS` configured on purpose · local development never points at the production database (a non-production server refuses to start against a remote DB unless `ALLOW_REMOTE_DB_IN_DEV=true`).
