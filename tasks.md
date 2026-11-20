# tasks.md — Exploria360

Legend: [x] done · [~] in progress · [ ] todo · [!] blocked (needs user)

## Phase 0 — Baseline & discovery
- [x] GitNexus available (repo `mareservation`); FTS keyword search degraded (needs VC++ redist / run from Git Bash) → use `cypher`/`context`/`route_map`
- [x] ARCHITECTURE.md (initial)
- [x] Legacy brand refs: ~414 hits / 349 files in frontend (mostly `.next` build output; real src ≈ stores/auth, stores/cart, layout, emails, metadata). Backend refs TBD.
- [x] Venue types in model: CAFE | RESTAURANT | HOTEL | CINEMA | EVENT_SPACE → maison d'hôtes = HOTEL (confirm sub-type)
- [x] 360° URL check: https://spinview360.com/villaaa/ → HTTP 200, no X-Frame-Options / CSP frame-ancestors headers; 3DVista player (`tdvplayer.js`). Iframe embed likely OK → verify in browser (fullscreen, mobile)
- [x] RESOLVED: working tree backend diverged from HEAD (22 files; app.ts mounted 8 vs 30 routers, Reservation.ts missing fields, etc.)
- [x] Security review: HEAD clean (no obfuscation/eval/exfil hosts; payload file `fa-solid-400.woff2` absent; the woff2 files are real fonts). Past infection vector = `backend/.vscode/tasks.json` folderOpen task (removed in 2ff3893), enabled by `task.allowAutomaticTasks:true` → now `false`.
- [x] Backups: `C:\Users\Ala\Desktop\MaTable-backup-2026-11-14\` (tracked patch, tgz of modified+untracked, original app.ts) + `git stash@{0}` "pre-exploria-worktree-…"
- [x] Stashed worktree backend/compose/next.config (older snapshot; no route absent from HEAD; venues.ts = one handler pasted ×14). Only valuable item: `BACKEND_INTERNAL_URL` override in next.config. Untracked files left in place.
- [x] Baseline green: backend `tsc` + build, frontend `tsc` + `next build` (deps via `npm ci --ignore-scripts`). No test suite exists.
- [!] Hygiene: `.github/workflows/deploy.yml` auto-deploys to VPS on every push to `main` (sshpass root password, StrictHostKeyChecking=no) → DO NOT push to main until reviewed; move to SSH key. `.qwen/settings.json` corrupted + grants Read(C:\/**). JWT default-secret fallback in code. multer 1.x has known vulns. VPS root password was pasted in chat → rotate.
- [x] HEAD commit 532b80c already renamed MaTable/Ma Reservation → Exploria360 in 43 files; remaining brand refs to be re-scanned in Phase 2.

## Phase 1 — Category feature flag (maisons d'hôtes only)
- [x] Backend flag `PUBLIC_VENUE_TYPES` (default `MAISON_DHOTE`) in `backend/src/config/publicCatalog.ts`; exposed via `/meta/homepage-config.publicVenueTypes`
- [x] Enforced on public venues (list + all `/:id/*` via router.param), search, events (list/detail), tables, reviews; NEW bookings blocked for hidden types (reservations, holds, hotel-checkout hold, event orders). Existing reservations/owner/admin untouched. `venues` list now also requires isPublished/not archived. Rooms now load for MAISON_DHOTE.
- [ ] Backend: owner/admin hotel routes filter `type:'HOTEL'` only (owner.ts:756, admin.ts:548, admin-hotel.ts) → include MAISON_DHOTE (Phase 6)
- [ ] Categories endpoint is not type-aware (Category has no venue type) → hide on frontend; sitemap pending Phase 5
- [x] Edge gate (`frontend/lib/publicCatalog.ts` + `middleware.ts`, flag `NEXT_PUBLIC_PUBLIC_VENUE_TYPES`): hidden-category URLs → real 404 + `X-Robots-Tag: noindex`; `/hotel(s)` → 308 to `/accommodation(s)`. Verified with `next start`: /cafes /restaurants /cinema /evenements /coworking /sos-conseil /lieu /restauration = 404; /, /accommodations, /explorer, /login = 200.
- [ ] Remove hidden-category links from legacy Navbar/HomeNavbar/Footer/home sections (replaced wholesale by Phase 3 shell; do together)

## Phase S — Security & test hardening (done 2026-11-14)
- [x] Read-only DB inspection (find/count only; no URI printed). Atlas db `Mareservation` = treated as PRODUCTION (17 users, 22 reservations). `spinview360/villaaa` NOT in DB. Only MAISON_DHOTE venue = "La belle vue" (slug `dar-el-medina`, Tunis) with a Florida demo panorama → seed/demo data. **No duplicate created. Nothing written.**
- [x] `PUBLIC_VENUE_SLUGS` allowlist (optional) so demo/unverified venues stay private without touching the DB. Not set locally; MUST be set in production until real data is approved.
- [x] JWT: single validated source `getEnv().JWT_SECRET` (≥32 chars, placeholder-rejecting, required in ALL envs, no hardcoded fallback). Fixed sign/verify secret mismatch in dev. REFRESH_SECRET was unused → optional. Local `.env` validated OK.
- [x] multer 1.x → 2.5.0; `npm audit fix` (non-breaking): criticals 2→0. Remaining prod advisories (4 high, all MAJOR bumps, need decision): cloudinary, multer-storage-cloudinary, nodemailer, zod.
- [x] `.github/workflows/deploy.yml` rewritten: manual only, CI gate (tsc+tests+build), `production` environment approval, SSH key + pinned host key, no prune/seed/migrate/force-recreate/remove-orphans, aborts on dirty server tree. Needs secrets VPS_HOST/VPS_USER/VPS_SSH_KEY/VPS_KNOWN_HOSTS + var VPS_APP_DIR. (Old workflow hard-reset the server, pruned images and ran seed/migration scripts against prod on every push.)
- [x] `.qwen/` audited: settings.json was corrupted paste data granting Read(C:\/**) → replaced with empty allowlist; `.orig` removed; skills/scripts contain no network/exec calls.
- [x] **Double-booking race fixed + proven**: `utils/bookingLock.ts` (per-room mutex + Mongo transaction w/ lock doc; fallback for standalone). Hold creation atomic; confirm claims the hold exactly once. Mutation check: lock disabled → 8/8 guests got a hold; enabled → 1/8.
- [x] Tests (vitest + supertest + in-memory Mongo replica set, never prod): 21 passing — category visibility on all public endpoints, hidden-type booking refusal, slug allowlist, JWT validation, 8-way concurrent hold, adjacency/overlap rules, 5-way concurrent confirm → 1 reservation. `npm test` in backend.
- [ ] Still open: reservations.ts generic POST / holds not yet under bookingLock (tables/seats/cafés — hidden for launch); `MR-` confirmation-code prefix is legacy brand; docker-compose publishes backend on 0.0.0.0:5001 (bind to 127.0.0.1 behind nginx in Phase 8); Atlas hardening checklist (IP allowlist, least-privilege user, separate dev DB — local `.env` points at prod DB) goes in DEPLOYMENT.md.

## Phase 2+3 status — brand & premium redesign (2026-11-14)
- [x] Legacy brand: no MaTable / Ma Reservation / Look and Book left in frontend source (HEAD rename 532b80c + this pass). Legacy "LB" `logo.png` replaced as favicon by original SVG mark `app/icon.svg`; `app/favicon.ico` removed; root metadata/OG/themeColor rewritten (French, template titles, metadataBase).
- [x] Fonts: Cormorant Garamond + Inter bundled from pinned @fontsource packages (no Google at build/run time — an earlier build failed on a flaky Google fetch).
- [x] Design system tokens (forest / ivory / champagne / brass / charcoal) in globals.css; lining figures; reduced-motion respected.
- [x] New components `frontend/components/exploria/`: Navbar (transparent→solid, a11y mobile sheet w/ focus trap, scroll lock, safe-area), Hero, StaySearch (real destinations from DB, client+server validation), GuesthouseCard (no invented data), FeaturedGuesthouses (loading/error/empty/1-property/grid states), Tour360Teaser (click-to-load iframe, fullscreen, new-tab fallback), WhyExploria, EditorialSection, Footer (contact/social only if set in admin settings), ArchArt (original SVG art), Reveal.
- [x] Homepage rebuilt; legacy "En construction" banner removed. Shell (`ConditionalShell`) now uses the new navbar/footer on all public pages; skip-link added.
- [x] `/accommodations` rewritten: prefilled search, real availability results, states, SEO layout/canonical.
- [x] Backend availability search `GET /venues?checkIn&checkOut&guests` (server validation, 400 messages, capacity, reservations+holds+blocks) + 21 more tests (42 total, all green).
- [x] Verified in Chrome: 360/375/390/430/768/1024/1440 → zero horizontal overflow; mobile menu (focus, Esc, scroll lock); search validation; full search→results flow; real tour embed loads + fullscreen button. Builds: backend tsc+build+42 tests, frontend tsc + `next build` all green. Home First Load JS 137 kB.
- [ ] Dev-only: `[DEV] Maison de démonstration` was seeded in a THROWAWAY in-memory DB only (never prod).

### Remaining before deployment (decisions/inputs needed in **bold**)
1. **Property data for the first maison** (name, city, address, photos, amenities, rooms, prices, policies). The tour's own watermark reads "THE PEARL 24 – Real Estate & Trading" (a real-estate company) → **confirm you have rights to showcase it and what the property is called**. Not in DB; nothing created.
2. **Existing DB venue "La belle vue" (`dar-el-medina`, Tunis)** looks like seed data with a Florida demo panorama and WOULD be public → decide: keep private via `PUBLIC_VENUE_SLUGS` (recommended), unpublish, or approve.
3. Photography: provide licensed images → set `NEXT_PUBLIC_HERO_IMAGE`; card/gallery images come from the venue record.
4. Property details page (`/accommodation/[slug]`) still legacy dark design → Phase 4 redesign (gallery, booking panel, sticky mobile CTA, map).
5. Legacy pages in old dark style (login, register, profile, mes-reservations, checkout, a-propos, comment-ca-marche, faq, contact, cgv, mentions-legales) sit under the new nav/footer; copy may still mention other categories → review + restyle. Dashboard layout still uses old `Navbar` with hidden-category links.
6. Privacy policy page missing (**legal text + company details needed**); footer lists CGV + mentions légales only.
7. SEO phase: sitemap/robots, JSON-LD (Hotel/LodgingBusiness w/ real data only), breadcrumbs, noindex for private pages, www canonical, OG image (needs real image).
8. Owner/admin routes that filter `type:'HOTEL'` only → include MAISON_DHOTE (owner.ts, admin.ts, admin-hotel.ts).
9. Confirmation code prefix `MR-` (legacy brand) + email templates brand check.
10. Dependency majors with advisories: cloudinary, multer-storage-cloudinary, nodemailer, zod (**approve bumps**).
11. Deployment: GitHub secrets/variable for new workflow; VPS inspection (read-only) + backups; compose bound to 127.0.0.1 behind nginx; Atlas hardening; DNS; HTTPS. **Rotate VPS root password; use a non-root deploy user + SSH key.**
12. Local `.env` points at the production Atlas DB → create a separate dev DB.

## Phase 2 — Rebrand to Exploria360
- [ ] Navbar/footer/home/auth/booking/confirmation/dashboard strings, emails, metadata, OG, manifest, favicon, loading/error states
- [ ] Keep DB names, env vars, package names unchanged

## Phase 3 — Design (forest green / ivory / champagne / gold)
- [ ] Tokens + typography, sticky nav + mobile menu, hero, search (real availability), featured maison, 360° section, why-us, editorial, footer

## Phase 4 — First maison d'hôtes + details page
- [ ] Needs from user: name, location, photos, amenities, rooms, prices, policy (no invented data)
- [ ] Lazy 360° viewer (iframe + skeleton + fullscreen + fallback), gallery, booking panel, sticky mobile CTA
- [ ] Server-side availability + transactional double-booking protection

## Phase 5 — SEO & performance
- [ ] Metadata, canonical (www), sitemap, robots, JSON-LD (no fake ratings), breadcrumbs, noindex private, CWV check

## Phase 6 — Admin/owner checks
- [ ] Venue CRUD, images, 360 URL, rooms, prices, availability, blocks, reservations, owner scoping

## Phase 7 — QA
- [ ] tsc, lint, tests, build; 14 critical journeys; mobile 360–1024px

## Phase 8 — Deployment (VPS 187.53.136.225)
- [ ] Read-only VPS inspection (ports, containers, nginx, resources, DB) — no credentials stored
- [ ] Backups + restore check; isolated compose; preview endpoint behind access control
- [!] User approval before public cutover
- [ ] DNS table, HTTPS after DNS verified, smoke tests, DEPLOYMENT.md (rollback)

## Session 3 status (final push before usage limit)
- [x] Demo maison (`MAISON_DHOTE`, slug `maison-hotes-demo-exploria360`, `isDemo`): idempotent seed `backend/src/scripts/seed-demo-maison.ts` (`--dry-run`, `--yes`, `--allow-remote`; refuses remote DB/without flags; post-check). NOT yet run on any real DB.
- [x] Demo non-bookable server-side (holds, reservations, confirm); excluded from availability search; sitemap excludes it; page `noindex` + WebPage JSON-LD only.
- [x] New details page (server-rendered, TourViewer 16:9/mobile 4:5, fullscreen, fallback, sticky mobile CTA, owner CTA); legacy 1226-line page kept for future real venues.
- [x] SEO: sitemap.ts, robots.ts, canonicals, private-path X-Robots-Tag, breadcrumbs, JSON-LD (real data only).
- [x] Pages rewritten: a-propos, comment-ca-marche, faq, contact (owner enquiry form → PartnerApplication, rate-limited), mentions-legales/cgv/confidentialite DRAFTS with visible [À compléter] markers (noindex).
- [x] Security: hardcoded personal e-mail recipients removed (partner + SOS), CORS tightened (no raw IPs/localhost in prod), trust proxy, hold validation, loadEnv-first, dev server refuses remote DB, `dev:memory` stack.
- [x] Deps: cloudinary 2 (custom storage engine), nodemailer 10, zod 4, multer 2 → `npm audit --omit=dev` = 0. 57 backend tests green.
- [x] MAISON_DHOTE in owner/admin queries; `MR-` → `EX-` codes; legacy nav/footer files deleted; customer pages repalleted forest/brass.
- [ ] NOT DONE: VPS inspection, backups, nginx/compose prod files, DEPLOYMENT.md, deployment, DNS/HTTPS verification, production smoke tests. Needs SSH credentials from user.
- [ ] Not done: browser re-verification of new details page/contact/auth restyle; screenshots; Lighthouse; legacy pages still contain hidden-category links (all 404 via middleware).

## Session 4 — DESIGN DECISION (user): keep the ORIGINAL dark/gold design
The forest/ivory redesign was **rejected and reverted**. Original components restored from git
(HomeNavbar, Footer, HomeImmersiveHero, HowItWorks, WorldPresence, accommodations listing, auth/checkout/dashboard pages, globals.css, layout).
Done on top of the original look (content only, classes untouched):
- [x] Hidden categories removed from navbar, footer, hero tiles, listing filter chips; SOS Conseil links removed.
- [x] Removed fabricated content from the ORIGINAL code: hero fallback "MOCK_VENUES" (fake restaurants/hotels with 4.6–4.9 ratings + review counts), placeholder footer phone `+216 12 345 678` / e-mail / invented social accounts, "des milliers d'utilisateurs", "Paiement sécurisé…", worldwide-expansion claims.
- [x] Legacy "LB"/"Before you go"/"MaRéservation" logo files replaced by `public/logo.svg` (Exploria360, gold); favicon `app/icon.svg`.
- [x] New pieces rebuilt in the original palette: `HomeDemoShowcase` (demo + lazy 360° player), `TourViewer`, `DemoPropertyPage`, content pages, owner enquiry form, `HotelCard` demo handling (no price/guessed amenities, "Démonstration", "Visite 360°").
- [x] Deployment kit: new `docker-compose.yml` (project `exploria360`, 127.0.0.1-only ports, frontend no longer gets backend secrets, log rotation, mem limits, healthcheck), non-root Dockerfiles with `npm ci --ignore-scripts`, `deploy/nginx/*`, `deploy/env.production.example`, `deploy/scripts/backup-atlas.sh`, `DEPLOYMENT.md`.
- [ ] Phase 1 browser QA (puppeteer-core + Chrome): in progress → results below when done.
- [ ] Lighthouse; VPS inspection/backup/deploy/seed/DNS (**blocked: SSH access not yet provided**).

### Session 4 — QA results (puppeteer-core + Chrome, local safe DB)
- [x] 36 page×width checks (6 pages × 360/390/430/768/1024/1440): 1 overflow found (`/accommodations` @360, filter row) → fixed (`flex-wrap`). Re-verified 0 overflow.
- [x] Hidden-category text in nav/footer/header at every width: **none**.
- [x] 360° viewer: click-to-load works desktop (1072×603) and mobile-touch (358×448); player loaded; fullscreen toggle works (desktop + mobile emulation).
- [x] Fixed: React duplicate-key error on every page (footer had two `/contact` hrefs); navbar clipped at 1024–1440 (now fits 1024→1920).
- [x] Demo bookings rejected live: hold + reservation → 403 `DEMO_VENUE_NOT_BOOKABLE`; contact form stores a lead (201).
- [x] Production build green (home 180 kB first-load, original design), backend tsc/57 tests/build green, `npm audit --omit=dev` = 0.
- [x] Lighthouse (mobile, 4× CPU throttle, prod build): Accessibility **100/100** (home + demo), SEO 100 (home), Best-practices 96. Fixed: unnamed button, footer contrast (1.91→AA), aria-label/visible-text mismatches, removed 600 KB third-party Unsplash image, **removed the fake newsletter form** (it stored nothing but told visitors they were subscribed).
  Remaining (documented, not fixed): Performance 40 (home) / 53 (demo): LCP 4.5–6.1 s, TBT 2.9–3.2 s under 4× throttle — dominated by the Next/React runtime chunk + style/layout (hero mounts both mobile and desktop trees; framer-motion). CLS 0.107 on home. Console 401s = logged-out auth bootstrap (`/auth/me`,`/auth/refresh`) in the ORIGINAL AuthProvider (left unchanged: auth-state risk). Demo `meta-description` flagged by Lighthouse only because Next 15 streams metadata for dynamic pages; present in HTML and delivered in <head> to crawlers (page is noindex anyway).
- [x] **VPS public probes**: server hosts ANOTHER live site (art-visions.tn, default vhost) → strict isolation required; DNS already correct (A @/www → 187.53.136.225, MX/SPF at OVH, no AAAA/CAA); ssh host key ed25519 SHA256:m3wbnRDFs6qO4Ax3jpZi73+qS5NLw0ZPD3cZXWdXdec.
- [ ] BLOCKED on user: SSH access (deploy user + key) for read-only inspection → backup → deploy → seed → TLS → smoke tests.

## Session 5 — VPS deployment (187.53.136.225) — 2026-11-15
- [x] Access: dedicated `deploy` user + new ed25519 key (`~/.ssh/exploria360_deploy`), host key pinned (SHA256:m3wbnRDF…dXdec). User ran the one-time root step themselves; password never used by the assistant.
- [x] Read-only inspection: Ubuntu 24.04, 4 CPU, 15 GB RAM (~4.7 GB available), disk 82% (37 GB free). Shared host: 6 other compose projects (sobitas, paratunisie, ioma, sofa-configurator, hermes, site-agent) + 6 nginx sites (art-visions, ioma-paris, logiflow, paratunisie, shiraly, sobitas). No prior Exploria deployment. Free ports chosen: 127.0.0.1:3100 (frontend), 127.0.0.1:3101 (backend).
- [x] Backup (before any change): `mongodump` of `Mareservation` from the VPS → 79 KB archive, sha256 97a08d99…8ff334; offsite copy `C:\Users\Ala\Desktop\MaTable-backup-2026-11-14\db-20261115-122524.archive.gz` (hash identical). **Restore drill** into a throwaway container: 1,084 docs restored / 0 failed; users 17, reservations 22, venues 11, rooms 8, scenes 28 (match). Drill container removed.
- [x] Release uploaded as tarball (no secrets, no git push) → `~/exploria360/releases/exploria360-20261115-122347`, `current` symlink (rollback = repoint + `up -d`). Production `.env` created on the server only (mode 600; fresh JWT secret generated on server; optional integration keys intentionally NOT copied).
- [x] Images built (nice 19, build memory capped), `docker compose -p exploria360 up -d`: backend healthy + connected to DB, frontend 200. Both bound to 127.0.0.1 only; mem limit 768 MB each; non-root.
- [x] Demo seed: dry-run → insert → re-run idempotent; venues 11 → 12; exactly 1 demo doc. Public API returns ONLY the demo (PUBLIC_VENUE_SLUGS).
- [x] Internal verification (production containers + prod DB): all pages 200; hidden categories 404, /hotels 308; demo page noindex + canonical; sitemap excludes demo; demo hold/reservation/holds → 403 DEMO_VENUE_NOT_BOOKABLE (forged token, non-existent user → no DB writes); partner-applications live (422 on empty).
- [ ] **PUBLIC EXPOSURE NOT DONE**: needs root once: `ssh root@187.53.136.225 "bash /home/deploy/exploria360/shared/nginx/root-setup.sh <email>"` (adds nginx site + Let's Encrypt cert for exploria360.com/www; validates with nginx -t; auto-rollback). Until then www.exploria360.com still shows the other site's default vhost.
- [ ] Post-TLS: live HTTPS verification, mobile check on real device, change root password, disable SSH password login.
