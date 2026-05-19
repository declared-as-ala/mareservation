# International Hotel Platform — Implementation Status

Companion to [`international-hotel-platform-management-plan.md`](./international-hotel-platform-management-plan.md).
Tracks what's been built vs. what's still to ship. Updated **2026-05-19** (second pass).

---

## Legend

- ✅ Done — production-grade, wired end-to-end
- 🟡 Partial — exists but limited (mock data, missing edge cases, or UI-only)
- ⬜ Not started

---

## Section-by-section status

### 1. Product Vision
Conceptual section, no code. ✅ Captured in CLAUDE.md and design choices.

### 2. Main Participants
- ✅ Client — auth, profile, reservations
- 🟡 Hotel Owner — `app/(public)/owner/*` exists but pre-dates the new spec (sidebars, calendar, blocks, manual reservation, pricing not aligned with §5)
- ⬜ Super Admin — no marketplace controls beyond basic admin CRUD

### 3. Client Experience

| § | Item | Status | Notes |
|---|---|---|---|
| 3.1 | Search inputs (destination, dates, adults/children/ages, rooms, filters) | 🟡 | `/hotels` listing exists; advanced filters (free cancellation, 360, sea view, etc.) missing |
| 3.1 | Search results card (photo/name/city/rating/price/available count/benefits) | 🟡 | Basic `HotelCard` exists; no per-date "X rooms left" badge |
| 3.1 | "Choose dates to see exact availability" empty state | ⬜ | |
| 3.1 | "No rooms — try nearby dates" suggestion | ⬜ | |
| 3.2 | Hotel detail page (hero, gallery, rooms-first, side panel, map, amenities, policies, reviews, similar) | ✅ | `app/(public)/hotel/[slug]/page.tsx` |
| 3.2 | Save/favorite + share buttons | ✅ | |
| 3.2 | Map location | ⬜ | Address shown, no embedded map |
| 3.2 | Reviews | ⬜ | |
| 3.2 | Room card (image/name/type/price/total/capacity/bed/surface/amenities/cancel/breakfast/availability warning/CTA) | 🟡 | `RoomCard.tsx`; "Only 2 left" warning not wired |
| 3.3 | Room detail page (large photo or 360, gallery, name/number, price, CTA, full details) | 🟡 | `app/(public)/lieu/[slug]/chambre/[roomId]/page.tsx` exists |

### 4. Client Reservation Flow — **PRIMARY SLICE BUILT THIS PASS**

| § | Item | Status | Notes |
|---|---|---|---|
| 4 | Six-step flow | ✅ | `app/(public)/checkout/hotel/` — 5 in-page steps + ticket page |
| 4.1 | Stay details (dates, nights auto, adults/children/ages, rooms, promo) | ✅ | Disables past dates; resets check-out when check-in advances |
| 4.1 | Date picker disables blocked/unavailable dates | 🟡 | Past dates blocked; per-room blocks not yet surfaced in calendar |
| 4.1 | Live price update on date/guest change | ✅ | |
| 4.2 | Room & rate confirmation (hotel, room, photo, dates, guests, price, taxes, discount, total, payment option, cancel deadline, included benefits) | ✅ | |
| 4.3 | Guest information form (first/last/email/phone/country/city, main guest checkbox, arrival time, special requests, baby/extra bed, accessibility, policy + T&C checkboxes) | ✅ | Identity fields (passport, nationality, DOB) modeled but not yet in UI |
| 4.4 | Extras & preferences (breakfast, half-board, airport transfer, spa, romantic deco, late check-out, parking, baby cot, extra bed) | ✅ | 8-item catalog; pricing per-night/per-person/once |
| 4.5 | Payment (online / deposit / pay at hotel) with paid-now + remaining breakdown | ✅ | UI complete; **no real payment gateway** (marks `paid` directly) |
| 4.5 | Hold during checkout (10–15 min) — convert on success, release on fail/expire | ✅ | 15-min `ReservationHold`, countdown timer, auto-redirect on expire, release on unmount |
| 4.6 | Confirmation page (success state, reference code, QR, hotel/room/dates/guests/price, paid/remaining, address/phone, cancel policy, instructions) | ✅ | `HotelTicket.tsx` — premium dark layout |
| 4.6 | Download ticket PDF | 🟡 | Browser print stylesheet → save as PDF works; no server-side PDF endpoint |
| 4.6 | Add to calendar (.ics) | ✅ | `GET /hotel-checkout/calendar/:id.ics` |
| 4.6 | Contact hotel / map / share | ✅ | tel:, Google Maps, Web Share API w/ clipboard fallback |
| 4.6 | View my reservations | ✅ | Links to `/mes-reservations` |
| 4.6 | QR payload (ref + verification URL + status) | ✅ | JSON payload, PNG via `qrcode` |
| 4.6 | Verification URL endpoint (`/reservation/:id/verify`) | ⬜ | QR points there but route not built |
| 4.6 | Email/SMS/WhatsApp notifications | 🟡 | Email infra exists (`email.service.ts`); hotel-checkout doesn't yet fire confirmation/owner-alert emails |
| 4.7 | Statuses (draft/pending_payment/pending_hotel/confirmed/checked_in/checked_out/cancelled_*/no_show/refunded) | 🟡 | Model supports most; `pending_payment` vs `pending` semantics overlap; refund flow not implemented |

### 5. Hotel Owner Experience
- ✅ Owner dashboard cards (check-ins/outs today, occupied/available, pending, monthly revenue, occupancy %, cancellation %, active blocks) — shipped `/owner/hotel-dashboard`
- ✅ Owner alerts (missing photos/price, pending requests, today's check-ins) — alerts panel on dashboard with deep links
- ✅ Reservation management — today columns + filterable list view + month-grid calendar; kanban + room timeline still pending
- ✅ Reservation actions (accept/reject, check-in, check-out, cancel, no-show, change dates, reassign room, internal notes) — all owner-side transitions shipped + drawer UI; contact via tel/mailto present in cards
- 🟡 Room/suite management — CRUD exists, advanced statuses (maintenance/blocked/hidden) incomplete
- ✅ **Blocking rooms** (one room / full venue / date-range / reason / autoReopen) — `RoomBlock` model + owner UI shipped this pass; blocks honored by `/hotel-checkout/hold` conflict check
- ✅ Block reasons + time-range form — drawer w/ 9 reasons, internal note
- ✅ Manual reservation by owner — drawer creates Reservation directly, source tracking (phone/walk-in/whatsapp/agency)
- ⬜ Pricing management (base/weekend/seasonal/holiday, min/max nights, last-minute, early-booking, promo codes, packages)
- 🟡 Hotel profile & content (name/desc/address/contact/cover/gallery/360) — exists
- ⬜ Admin-gated changes (name, address, ownership docs, star claims)
- ⬜ Owner reports (daily/monthly/occupancy/revenue per room/ADR/cancel/no-show/origin)

### 6. Super Admin Experience
- 🟡 Dashboard — generic admin dash exists, no marketplace KPIs (hotels, owners, payouts, disputes, reported reviews)
- ✅ Hotel approval workflow (statuses: draft / pending_review / changes_requested / approved / rejected / suspended; featured toggle)
- ✅ Approval checklist (owner verified, address, phone, cover, ≥3 gallery photos, description ≥60 chars, ≥1 room, all rooms priced, all rooms photo'd, policies, docs) — auto-computed per hotel, completion %
- ⬜ Owner management (verification, suspension, payout account)
- 🟡 Platform reservation oversight — admin can see reservations; no force-cancel/refund/dispute actions
- ⬜ Commission & payouts (models, statuses, workflow)
- ⬜ Content moderation queue
- ⬜ Support & disputes case system
- ✅ Audit logs — model + UI viewer (per-hotel inline + global page with entity/action filters); enum extended for hotel-approval and reservation-action events

### 7. Reservation & Availability Rules
- ✅ **No double booking** — `/hotel-checkout/confirm` checks vs. reservations + holds + room blocks + venue-wide blocks
- ✅ **Temporary hold during checkout** — 15 min, server-enforced expiry, auto-release on unmount, countdown w/ urgent state <2 min
- 🟡 **Manual approval mode** — `paymentOption='pay_at_hotel'` creates `pending` reservations; `/owner-hotel/reservations/:id/accept|reject` shipped + owner inbox UI with 2h SLA countdown. Admin escalation when SLA expires not yet wired

### 8. Notifications
- ✅ Client confirmation — fired from `/hotel-checkout/confirm` using new `createHotelClientConfirmationTemplate`
- ✅ Hotel owner new-reservation alert — fired from same endpoint via `createHotelOwnerNewReservationTemplate`
- ⬜ Client: payment success/fail, hotel accepted/rejected, check-in reminder, cancel/refund, review request
- ⬜ Hotel owner: payment received, cancellations, check-in/out today, new review, payout, content change
- ⬜ Super admin: hotel approval pending, dispute, suspicious activity, payout approval, failed payment, high-cancellation hotel

### 9. Recommended Sidebars
- ✅ Client account (reservations, favorites, profile, payments, notifications, support) — exists
- 🟡 Hotel owner sidebar — exists but not aligned with spec (no Calendar, no Availability Blocks, no Pricing, no Staff)
- ⬜ Super admin sidebar — no Payouts/Commissions/Disputes/Moderation/Marketing tabs

### 10. MVP Then Pro Roadmap
- **MVP — Client**: ✅ all six items shipped this pass
- **MVP — Hotel owner**: 🟡 dashboard/reservations/rooms partial; ⬜ block dates, manual reservation, basic pricing
- **MVP — Super admin**: ⬜ approval, owner mgmt, oversight, commission, payout
- **Pro — Client**: ✅ QR ticket, PDF (print path), .ics, advanced filters/reviews/favorites/loyalty pending
- **Pro — Owner**: ⬜ advanced calendar, seasonal pricing, promotions, staff perms, revenue reports, QR scanner, CRM
- **Pro — Admin**: ⬜ automated payouts, dispute center, analytics, fraud, audit log UI, marketing, moderation queue

### 11. Ideal End-to-End Scenario
Steps **8–19, 21** of the 30-step scenario are now fully functional (search → hotel page → room compare → checkout → hold → payment → confirmed → QR ticket → email).
Steps **1–7, 20, 22–30** (owner onboarding, KYC, scan-on-arrival, check-in/out toggles, commission calc, payout approval, review request flow) are pending.

### 12. Key Professional Standards
- ✅ No double booking
- ✅ Clear price breakdown
- ✅ Clear cancellation policy
- ✅ Strong room photos (existing gallery system)
- ✅ Professional QR ticket
- ✅ Mobile-first responsive (Tailwind, tested layouts)
- 🟡 Owner calendar controlling availability — model in place, no owner UI yet
- ⬜ Super admin audit logs UI
- ⬜ Fast support/dispute path

---

## What was shipped this pass

### Backend (`backend/src/`)
- `models/Reservation.ts` — extended with hotel fields: `paymentOption`, `nights`, `adults`/`children`/`childrenAges`, `arrivalTime`, `extras[]`, `extrasTotal`, `cancellationDeadline`, `idNumber`/`nationality`/`dateOfBirth`, `needBabyBed`/`needExtraBed`, `accessibilityRequest`, `acceptedHotelPolicy`/`acceptedPlatformTerms`, `holdId` link.
- `routes/hotel-checkout.ts` (new, mounted at `/api/v1/hotel-checkout`):
  - `POST /hold` — 15-min `ReservationHold`, conflict check vs. confirmed reservations + live holds
  - `DELETE /hold/:id` — release
  - `POST /confirm` — re-verify hold, calculate pricing (subtotal + 10% tax + extras), create Reservation, generate QR data URL, convert hold
  - `GET /ticket/:id` — populated reservation
  - `GET /calendar/:id.ics` — RFC-5545 add-to-calendar

### Frontend
- `app/(public)/checkout/hotel/page.tsx` + `HotelCheckoutClient.tsx` — full 5-step in-page checkout: Séjour / Tarif / Vos infos / Extras / Paiement
- Sticky header with `HoldTimer` (countdown, urgent <2 min, auto-expire)
- Live `BookingSummary` aside with extras breakdown and total
- `components/hotel/HotelTicket.tsx` — premium ticket: success banner, hero, key stats, dates/guest table, extras list, price + paid/remaining blocks, prominent white-bg QR, action grid (Print/PDF, .ics, call, Google Maps, share, print), cancellation policy, check-in instructions, print stylesheet
- `app/(public)/reservation/[id]/confirmation/page.tsx` — branches to `HotelTicket` when `bookingType === 'ROOM'`
- `components/hotel/RoomBookingModal.tsx` — final CTA now routes to `/checkout/hotel?venueId=…&roomId=…&checkIn=…&checkOut=…&adults=…` (auth-aware redirect)
- `lib/api/hotel-checkout.ts` — typed client (hold / release / confirm / ticket / ics URL builder)

---

## Shipped this fifth pass

### Backend (`backend/src/`)
- `models/Venue.ts` — added `approvalStatus`, `submittedForReviewAt`, `reviewedAt`, `reviewedBy`, `rejectionReason`, `adminNote`, `complianceDocs[]` + status index. Default for new venues = `approved` (backward-compat for legacy data); owner-self-signup flow can opt into `pending_review`.
- `models/AuditLog.ts` — extended enum with `RESERVATION_CHECKED_OUT`, `RESERVATION_NO_SHOW`, `RESERVATION_ACCEPTED`, `RESERVATION_REJECTED`, `RESERVATION_MANUAL_CREATED`, `RESERVATION_DATES_CHANGED`, `RESERVATION_ROOM_REASSIGNED`, `RESERVATION_NOTE_ADDED`, `VENUE_SUBMITTED_FOR_REVIEW`, `VENUE_APPROVED`, `VENUE_REJECTED`, `VENUE_CHANGES_REQUESTED`, `VENUE_SUSPENDED`, `VENUE_REINSTATED`, `VENUE_FEATURED`, `VENUE_UNFEATURED`, `ROOM_BLOCK_CREATED`, `ROOM_BLOCK_UPDATED`, `ROOM_BLOCK_DELETED`.
- `routes/admin-hotel.ts` (new, mounted at `/api/v1/admin-hotel`) — protected by `requireAdmin`:
  - `GET /hotels?status=&q=` — filterable list + aggregate counts per status
  - `GET /hotels/:id/checklist` — populated venue + 11-item compliance checklist with pass/fail + detail
  - `POST /hotels/:id/approve|reject|request-changes|suspend|reinstate|feature` — state transitions (also flips `isPublished` correctly); each writes an `AuditLog` entry
  - `GET /audit-logs?entityType=&entityId=&action=&userId=&limit=` — populated viewer feed
- Approval transitions toggle `isPublished` correctly, so existing public listing gates (`/venues`, `/search`) automatically respect the approval state — no other code paths touched.

### Frontend
- **`app/(admin)/admin/hotels-approval/page.tsx`** — two-pane admin workspace:
  - **Header**: 4 count-chips (En attente / Changements / Actifs / Rejetés+Suspendus), free-text search, 6 status pills (with counts), refresh.
  - **Queue (left)**: cover-thumbnail cards with status badge, vedette crown, owner snippet; active highlighted amber.
  - **Detail (right)** for the selected hotel:
    - Hero with cover, `StatusBadge` + featured + visibility chips, name, address.
    - 4 stats (submitted / reviewed / phone / email), owner card with `mailto:`, rejection-reason / admin-note panel.
    - **Action row** — state-aware: pending shows Approve / Request changes / Reject; live shows Feature toggle + Suspend; off-state shows Reinstate. Always: "Éditer la fiche" + "Voir page publique".
    - **Checklist** with progress bar + per-item pass/fail + detail line.
    - Description and compliance docs panels (clickable).
    - **Inline audit log** (top 20 entries scoped to this venue) with action badge, actor, timestamp, payload preview.
- **`app/(admin)/admin/audit-logs/page.tsx`** — global audit viewer: filter by entity (venue/reservation/user/payment) and action (15+ predefined), table with date / action chip / entity / actor / IP / payload preview.
- **`app/(admin)/layout.tsx`** — Sidebar entries added under "Gestion": **Approbation hôtels**, **Audit logs**.
- **`lib/api/admin-hotel.ts`** — typed client (hotels list, checklist, all transitions, audit logs).

---

## Shipped this fourth pass

### Backend (`backend/src/routes/owner-hotel.ts`)
- `GET /reservations` — filterable list for owners (by status, venue, date range, free-text search across ref / name / email / phone); populates venue + room; limit 1-200.
- `POST /reservations/:id/change-dates` — re-checks reservation + block conflicts on the new range, updates `nights`.
- `POST /reservations/:id/reassign-room` — verifies new room belongs to same venue, no reservation/block overlap on existing dates.
- `POST /reservations/:id/note` — append timestamped internal note (max 1000 chars).

### Frontend
- **`app/(public)/owner/reservations/page.tsx`** — full rewrite from 3-line stub to a premium dark management page:
  - **Filters**: free-text search, status pills (Toutes / En attente / Confirmées / Sur place / Terminées / Annulées / No-show), venue picker, date-range, Clear-all chip, refresh button.
  - **Table**: ref + creation date + source tag, client (name/email/phone), room + hotel, séjour (dates + nights + pax), `StatusBadge`, `PaymentBadge` (with deposit / refund states), total, and a row-action cluster (icon-only filled/ghost buttons sized for density).
  - **Row actions** state-driven: Accept/Reject for pending, Check-in for confirmed, Check-out for checked-in, Cancel for all live states, Detail eye-icon always.
  - **Detail drawer** with 4 tabs:
    - **Vue** — séjour / client / montants sections, existing notes preview, "Marquer no-show" red action
    - **Notes** — timestamped append form with 1000-char counter + scrollable history
    - **Dates** — date-range form, server-side conflict check feedback via toast
    - **Chambre** — venue's room list with "(actuelle)" marker, disabled when same room selected
- **`lib/api/owner-hotel.ts`** — added `fetchOwnerHotelReservations`, `changeReservationDates`, `reassignRoom`, `addReservationNote` + `OwnerReservation` type.

---

## Shipped this third pass

### Backend (`backend/src/`)
- `routes/owner-hotel.ts` — appended:
  - `POST /reservations/:id/check-in` — sets `checkInStatus='checked_in'`, timestamps, `status='checked_in'`
  - `POST /reservations/:id/check-out` — `status='completed'`, auto-settles any `remainingAmount`
  - `POST /reservations/:id/cancel` — owner-side cancellation with optional reason
  - `POST /reservations/:id/no-show` — marks no-show
  - `GET /venues/:venueId/dashboard` — full hotel dashboard payload: KPIs (today check-ins/outs, occupied/available, pending, monthly revenue + count, occupancy %, cancellation %, active blocks), alerts (missing photos/price, pending requests, today check-ins), and `checkinsToday[]` / `checkoutsToday[]` / `upcomingNext7[]` lists. Occupancy = booked room-nights / (rooms × days in month).

### Frontend
- `app/(public)/owner/hotel-dashboard/page.tsx` — premium dark dashboard: 8-card KPI grid, alerts panel (warning/critical/info with deep links), 6 quick-link tiles, two side-by-side Today columns with inline **Check-in** and **Check-out** buttons (idempotent — show "Enregistré"/"Clôturé" when done), upcoming-7-days table. Venue picker, auto-refresh every 60s.
- `lib/api/owner-hotel.ts` — added `fetchHotelDashboard`, `checkInReservation`, `checkOutReservation`, `cancelReservation`, `markNoShow` + types.
- `app/(public)/owner/page.tsx` — primary "Tableau de bord hôtel" tile added on the owner home, highlighted amber.

---

## Shipped this second pass

### Backend (`backend/src/`)
- `models/RoomBlock.ts` — new model: scope (room/venue), date range, 9 reasons enum, note, autoReopen, createdBy/role
- `routes/owner-hotel.ts` (new, mounted at `/api/v1/owner-hotel`):
  - `GET/POST /venues/:venueId/blocks`, `PATCH/DELETE /blocks/:id` — block CRUD, conflict-aware
  - `POST /venues/:venueId/reservations/manual` — owner-created reservations w/ source tracking; conflict-checks against reservations + holds + blocks
  - `POST /reservations/:id/accept|reject` — manual approval state transitions
  - `GET /reservations/pending` — pending-requests inbox feed
- `routes/hotel-checkout.ts` — conflict check extended to include `RoomBlock`; post-confirm sends client confirmation + owner alert emails (fire-and-forget)
- `services/email.service.ts` — two new templates: `createHotelClientConfirmationTemplate`, `createHotelOwnerNewReservationTemplate`

### Frontend
- `app/(public)/owner/availability/page.tsx` — month-grid timeline per room with colored bars (reservations amber, blocks red, weekend tint); click a day to open the action drawer; venue picker for multi-hotel owners
- `app/(public)/owner/pending/page.tsx` — pending-requests inbox with 2h SLA countdown (urgent <30 min, expired state), inline Accept/Reject with optional reason; auto-refreshes every 30s
- `lib/api/owner-hotel.ts` — typed client (blocks, manual reservation, pending list, accept/reject)
- `app/(public)/owner/page.tsx` — nav tiles for the two new pages, "Demandes en attente" highlighted

---

## Suggested next slices (priority order)

1. **Wire audit writes into owner-hotel mutations** — accept/reject/check-in/check-out/cancel/no-show/manual-create/change-dates/reassign/notes/room-blocks should all `logAudit(...)` now that the enum is extended; currently only the admin-hotel transitions write entries.
2. **Commission & payouts (§6.5)** — Payout model, owner payout balance, super-admin approval workflow.
3. **Real payment gateway integration** — replace direct `paid` marking for `paymentOption='online'` with a Stripe/Flouci/Konnect Checkout session.
4. **Pricing management (§5.6)** — seasonal/weekend/holiday rates, min/max nights, promo code validation server-side.
5. **Owner submit-for-review flow** — owner-side form to attach compliance docs + flip `approvalStatus` to `pending_review` + write `VENUE_SUBMITTED_FOR_REVIEW`.
6. **Reviews + content moderation (§3.2, §6.6)** — post-stay review request, owner reply, admin moderation queue.
7. **Notifications fan-out remainder** — accepted/rejected emails to client, check-in reminders, review requests, cancellation receipts, hotel-approval/rejection emails to owner.
8. **Room kanban / room-timeline views** (§5.2 remaining variants).
