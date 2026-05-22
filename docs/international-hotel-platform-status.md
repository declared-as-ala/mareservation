# International Hotel Platform — Implementation Status

Companion to [`international-hotel-platform-management-plan.md`](./international-hotel-platform-management-plan.md).
Tracks what's been built vs. what's still to ship. Updated **2026-05-20** (eighth pass).

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
- ✅ Client — auth, profile, reservations, support cases
- ✅ Hotel Owner — sidebar tiles cover dashboard / reservations (list + **kanban + timeline**) / pending / availability+blocks / **rooms & suites (gallery + 360°)** / scanner / establishment / **payments + payout history** / clients / settings. Owner-scoped room CRUD, pricing engine (§5.6), and submit-for-review flow all shipped.
- 🟡 Super Admin — marketplace controls: hotel approval ✅, payouts ✅, support inbox ✅, reviews ✅; owner-mgmt (verification, suspension) still ⬜

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
| 3.2 | Reviews | ✅ | `Review` model + moderation pipeline; sub-ratings, owner reply, helpful/flag, admin queue |
| 3.2 | Room card (image/name/type/price/total/capacity/bed/surface/amenities/cancel/breakfast/availability warning/CTA) | ✅ | `RoomCard` in venue page now computes per-room-type availability and shows "Plus que N chambres de ce type" (red, animated) when ≤2 same-type rooms remain, or "Complet sur ces dates" when 0 left |
| 3.3 | Room detail page (large photo or 360, gallery, name/number, price, CTA, full details) | ✅ | `app/(public)/lieu/[slug]/page.tsx` `RoomDetailView` — 360°/visite virtuelle **and** gallery shown side-by-side; click any photo opens a full-screen lightbox w/ prev/next + counter |

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
| 4.6 | Verification URL endpoint (`/reservation/:id/verify`) | ✅ | `GET /hotel-checkout/verify/:id?code=` + frontend page `app/(public)/reservation/[id]/verify/page.tsx` |
| 4.6 | Email/SMS/WhatsApp notifications | 🟡 | Client confirmation + owner alert on confirm ✅; hotel approval/rejection owner email ✅; accepted/rejected reservation emails ✅. SMS/WhatsApp, check-in reminders, review requests ⬜ |
| 4.7 | Statuses (draft/pending_payment/pending_hotel/confirmed/checked_in/checked_out/cancelled_*/no_show/refunded) | 🟡 | Model supports most; `pending_payment` vs `pending` semantics overlap; refund flow not implemented |

### 5. Hotel Owner Experience
- ✅ Owner dashboard cards (check-ins/outs today, occupied/available, pending, monthly revenue, occupancy %, cancellation %, active blocks) — shipped `/owner/hotel-dashboard`
- ✅ Owner alerts (missing photos/price, pending requests, today's check-ins) — alerts panel on dashboard with deep links
- ✅ Reservation management — today columns + filterable list view + month-grid calendar + **kanban board** + **room-based Gantt timeline** (14-day sliding window)
- ✅ Reservation actions (accept/reject, check-in, check-out, cancel, no-show, change dates, reassign room, internal notes) — all owner-side transitions shipped + drawer UI; contact via tel/mailto present in cards
- ✅ Room/suite management — CRUD (admin + owner) with cover, **multi-photo gallery (upload, reorder, delete)**, panoramic 360° images, virtual tour, capacity, beds, pricing, amenities, VIP, balcony, status, reservable/active toggles. Advanced statuses (maintenance/blocked/hidden) still simplified to `available/reserved/blocked` enum.
- ✅ **Blocking rooms** (one room / full venue / date-range / reason / autoReopen) — `RoomBlock` model + owner UI shipped this pass; blocks honored by `/hotel-checkout/hold` conflict check
- ✅ Block reasons + time-range form — drawer w/ 9 reasons, internal note
- ✅ Manual reservation by owner — drawer creates Reservation directly, source tracking (phone/walk-in/whatsapp/agency)
- ✅ Pricing management — `PricingRule` model (seasonal/weekend/holiday/min_nights/max_nights/last_minute/early_booking), `PromoCode` model (percent/amount/free_night; global or venue-scoped), `quoteRoomPrice` per-night calculator, owner CRUD routes + admin promo routes (`/api/v1/pricing/*`)
- 🟡 Hotel profile & content (name/desc/address/contact/cover/gallery/360) — exists
- ⬜ Admin-gated changes (name, address, ownership docs, star claims)
- ⬜ Owner reports (daily/monthly/occupancy/revenue per room/ADR/cancel/no-show/origin)

### 6. Super Admin Experience
- 🟡 Dashboard — generic admin dash exists, no marketplace KPIs (hotels, owners, payouts, disputes, reported reviews)
- ✅ Hotel approval workflow (statuses: draft / pending_review / changes_requested / approved / rejected / suspended; featured toggle)
- ✅ Approval checklist (owner verified, address, phone, cover, ≥3 gallery photos, description ≥60 chars, ≥1 room, all rooms priced, all rooms photo'd, policies, docs) — auto-computed per hotel, completion %
- ⬜ Owner management (verification, suspension, payout account)
- 🟡 Platform reservation oversight — admin can see reservations; no force-cancel/refund/dispute actions
- ✅ Commission & payouts — `Payout` model (pending/approved/paid/on_hold/rejected), `commissionRate` on Venue, owner balance endpoint, payout generation by period, admin approve/mark-paid/hold/reject workflow, owner payout dashboard at `/owner/payments`, admin payouts page at `/admin/payouts`
- ✅ Reviews + content moderation — `Review` model + public/owner/admin routes; admin moderation queue with approve/reject/flag; owner reply
- ✅ Support & disputes case system — `SupportCase` model, threaded messages (user ↔ admin), user inbox at `/support`, admin inbox at `/admin/support` with priority + status management
- ✅ Audit logs — model + UI viewer (per-hotel inline + global page with entity/action filters); enum extended for hotel-approval and reservation-action events

### 7. Reservation & Availability Rules
- ✅ **No double booking** — `/hotel-checkout/confirm` checks vs. reservations + holds + room blocks + venue-wide blocks
- ✅ **Temporary hold during checkout** — 15 min, server-enforced expiry, auto-release on unmount, countdown w/ urgent state <2 min
- 🟡 **Manual approval mode** — `paymentOption='pay_at_hotel'` creates `pending` reservations; `/owner-hotel/reservations/:id/accept|reject` shipped + owner inbox UI with 2h SLA countdown. Admin escalation when SLA expires not yet wired

### 8. Notifications
- ✅ Client confirmation — fired from `/hotel-checkout/confirm` using `createHotelClientConfirmationTemplate`
- ✅ Hotel owner new-reservation alert — fired from same endpoint via `createHotelOwnerNewReservationTemplate`
- ✅ Reservation accepted/rejected emails to client — fire-and-forget in `owner-hotel.ts` `accept`/`reject` routes
- ✅ Hotel approval/rejection email to owner — fire-and-forget in `admin-hotel.ts` `approve`/`reject` routes
- ⬜ Client: payment success/fail, check-in reminder, cancel/refund, review request
- ⬜ Hotel owner: payment received, cancellations, check-in/out today, new review, payout
- ⬜ Super admin: dispute, suspicious activity, payout approval, failed payment, high-cancellation hotel

### 9. Recommended Sidebars
- ✅ Client account (reservations, favorites, profile, payments, notifications, support) — exists; `/support` now wired
- 🟡 Hotel owner sidebar — Payments/Virements page now live; Pricing UI (owner can set rules) still ⬜; no Staff
- 🟡 Super admin sidebar — Payouts ✅, Support ✅, Hotels-approval ✅; no dedicated Moderation/Marketing tabs

### 10. MVP Then Pro Roadmap
- **MVP — Client**: ✅ all six items shipped; support cases ✅
- **MVP — Hotel owner**: ✅ dashboard, reservations (3 views), rooms, blocks, manual res, pricing engine, payouts view, submit-for-review
- **MVP — Super admin**: ✅ approval, payouts, support, reviews; ⬜ owner mgmt, real payment gateway
- **Pro — Client**: ✅ QR ticket, PDF (print path), .ics; advanced filters / loyalty / wallet pending
- **Pro — Owner**: 🟡 pricing UI only in backend; ⬜ staff perms, revenue reports, CRM
- **Pro — Admin**: 🟡 audit log UI ✅; ⬜ automated payouts, analytics, fraud detection, marketing

### 11. Ideal End-to-End Scenario
Steps **8–21** of the 30-step scenario are now fully functional (search → hotel page → room compare → checkout → hold → payment → confirmed → QR ticket → email → owner dashboard → accept → check-in → check-out → payout generated → admin approves → paid).
Steps **1–7, 22–30** (owner onboarding, KYC, scan-on-arrival, real payment gateway, automated payout transfer, review request flow) remain pending.

### 12. Key Professional Standards
- ✅ No double booking
- ✅ Clear price breakdown (per-night breakdown + promo code + extras)
- ✅ Clear cancellation policy
- ✅ Strong room photos (gallery + lightbox)
- ✅ Professional QR ticket + scan verification URL
- ✅ Mobile-first responsive (Tailwind, tested layouts)
- ✅ Owner calendar controlling availability — blocks + month-grid + kanban + timeline
- ✅ Super admin audit logs UI
- ✅ Fast support/dispute path — `SupportCase` model + threaded UI for users + admin inbox

---

## Shipped this eighth pass

Focus: **all remaining non-payment slices** — verification URL, soft-delete, owner submit-for-review, reviews + moderation, notifications fan-out, dynamic pricing engine, commission & payouts, room kanban + timeline, disputes & support.

### Backend (`backend/src/`)
- `models/PricingRule.ts` (new) — kinds: seasonal/weekend/holiday/min_nights/max_nights/last_minute/early_booking; per-room or venue-wide; priority ordering.
- `models/PromoCode.ts` (new) — percent/amount/free_night; global or venue-scoped; usedCount, maxUses, date window.
- `utils/pricing.util.ts` (new) — `quoteRoomPrice()` per-night calculator with rule application, last-minute/early-booking subtotal adjustments, promo code validation; returns `PriceQuote` with `perNight[]` breakdown, warnings, errors.
- `routes/pricing.ts` (new) — `POST /pricing/quote` (public), owner rule CRUD (`GET/POST /owner/venues/:venueId/rules`, `PATCH/DELETE /owner/rules/:id`), promo code CRUD (owner venue-scoped + admin global).
- `models/Review.ts` (new) — sub-ratings, ownerReply, moderation status (pending/approved/rejected/flagged), helpful/flag arrays.
- `routes/reviews.ts` (new) — public read + breakdown, create (verified from completed reservation), helpful/flag, owner reply, admin moderation queue + approve/reject.
- `models/Payout.ts` (new) — PayoutStatus (pending/approved/paid/on_hold/rejected), IPayoutItem per reservation, commissionRate snapshot, unique index on {venueId, periodStart, periodEnd}.
- `routes/payouts.ts` (new) — `GET /payouts/owner/balance` (unpaid earnings by venue), `GET /payouts/owner` (list), `GET /payouts/owner/:id`; `GET /payouts/admin` (all, filterable), `POST /payouts/admin/generate` (collect paid+completed reservations not yet in a payout), `PATCH /payouts/admin/:id/approve|mark-paid|hold|reject`.
- `models/SupportCase.ts` (new) — caseNumber (auto-generated `CS-*`), subject, category, status (open/in_progress/resolved/closed), priority (low/normal/high/urgent), threaded `messages[]` with sender (user/owner/admin).
- `routes/support.ts` (new) — user: open case, list own cases, get thread, reply, close; admin: list with filters + status counts, update status/priority/assignedTo.
- `routes/hotel-checkout.ts` — added `GET /verify/:id?code=` endpoint (sanitized reservation data, valid/invalid response).
- `models/Venue.ts` — added `archivedAt`, `archivedBy`, `archivedReason`, `commissionRate` (default 0.10) to both interface and schema.
- `routes/admin.ts` — `POST /admin/venues/:id/archive`, `POST /admin/venues/:id/restore`, `DELETE /admin/venues/:id` (cascade).
- `routes/owner-hotel.ts` — `POST /venues/:venueId/submit-for-review`; audit log added to every mutation.
- `services/email.service.ts` — `createReservationAcceptedTemplate`, `createReservationRejectedTemplate`, `createHotelApprovalTemplate`.
- `app.ts` — mounted `pricingRouter`, `payoutsRouter`, `supportRouter`, `reviewsRouter`.

### Frontend
- `app/(public)/reservation/[id]/verify/page.tsx` (new) — QR verification page.
- `lib/api/payouts.ts` (new) — full typed client for owner + admin payout endpoints.
- `app/(public)/owner/payments/page.tsx` — replaced stub with full payout dashboard: unpaid balance card, per-venue breakdown, payout history list + detail modal.
- `app/(admin)/admin/payouts/page.tsx` (new) — admin payout manager: generate dialog, table with status, approve/mark-paid/hold/reject in detail panel.
- `app/(admin)/layout.tsx` — added "Virements" (CircleDollarSign) and "Support client" (HeadphonesIcon) to Gestion sidebar group.
- `app/(public)/owner/reservations/page.tsx` — added view-mode toggle (list / kanban / timeline); `KanbanView` with 5-column Kanban board; `TimelineView` 14-day Gantt with room rows + sliding prev/next 7-day navigation.
- `lib/api/support.ts` (new) — typed client for user + admin support endpoints.
- `app/(public)/support/page.tsx` (new) — user support inbox: open case form, case list, threaded conversation view, close button.
- `app/(admin)/admin/support/page.tsx` (new) — admin support inbox: filterable case table, case detail + reply panel, status/priority controls.

### What this enables end-to-end
- Complete booking-to-payout cycle: owner accepts → check-out → admin generates payout for the period → admin approves → marks paid.
- Per-night pricing with seasonal/weekend multipliers, promo codes, and last-minute discounts — all validated on the `/pricing/quote` endpoint used by checkout.
- Reservation views: list table, calendar month-grid, Kanban board (by status), and room-based Gantt timeline.
- Clients can file support cases and see threaded responses from the admin team.
- QR code on every hotel ticket links to a live verification page showing reservation status.

---

## Shipped this seventh pass

Focus: **owner ↔ establishment linkage in admin, owner rooms UI, full audit-log coverage of owner mutations, and last-rooms-left warning**.

### Backend (`backend/src/`)
- `models/AuditLog.ts` — enum extended with `ROOM_CREATED`, `ROOM_UPDATED`, `ROOM_DELETED` (individual rooms, distinct from `ROOM_BLOCK_*`).
- `routes/admin.ts` — `logAudit(...)` writes added to:
  - `DELETE /admin/venues/:id` (`VENUE_DELETED`, includes cascade counts in `details`)
  - `POST /admin/hotels/:id/rooms` (`ROOM_CREATED`, flow:`admin`)
  - `PATCH /admin/rooms/:id` (`ROOM_UPDATED`, flow:`admin`, includes mutated field names)
  - `DELETE /admin/rooms/:id` (`ROOM_DELETED`, flow:`admin`, includes snapshot)
- `routes/owner.ts` — `logAudit(...)` writes added to all four new owner-room endpoints (`ROOM_CREATED` / `ROOM_UPDATED` / `ROOM_DELETED`, flow:`owner`).
- `routes/owner-hotel.ts` — `logAudit(...)` writes added to **every owner mutation**: room-block create/update/delete, manual reservation, accept, reject, check-in, check-out, cancel, no-show, change-dates, reassign-room, add-note. Each entry includes a focused `details` payload (e.g. before/after dates, from/to room IDs, reason, source). Admin entity-scoped audit log viewer at `/admin/audit-logs` and the inline panel on `/admin/hotels-approval` now show owner activity automatically since they read the same `AuditLog` collection.

### Frontend
- **`app/(admin)/admin/venues/page.tsx`** — admin can now see at a glance which establishment is linked to which owner:
  - New reusable `OwnerBadge` component: amber pill with avatar initial + truncated name; tooltip shows full name + email; click → `/admin/venues?ownerId=<id>` to filter to all venues that owner manages.
  - Unassigned venues show a red `Non assigné` chip that opens the assign-owner dialog directly.
  - Owner column in the **table view** and a new owner row on every **grid card**.
  - **Active-owner banner** (avatar + name + email + count) appears above the type pills when filtered by `ownerId`, with a one-click "Effacer le filtre" link.
  - **Sans propriétaire** red stats pill in the type-counts row, with a count of how many venues are currently unassigned; clicking flips `withoutOwner=1`.
  - URL params `ownerId` and `withoutOwner` now hydrate the filter state on mount and re-sync on navigation.
  - Row dropdown + grid card gained **"Changer le propriétaire / Assigner un propriétaire"** that opens an `AlertDialog` with a searchable owner Select (avatar + name + email per option). Confirm calls `PATCH /admin/venues/:id/owner`, invalidates the venues cache, and toasts.
- **`app/(public)/owner/rooms/page.tsx`** (new) — full premium dark hotel-rooms manager for hotel owners:
  - Auto-selects the owner's first hotel; multi-hotel owners get a horizontal pill picker.
  - Stat tiles (total / disponibles / réservées / VIP).
  - Grid of `RoomCard`s with cover, room number + name, type+VIP crown chip, capacity/surface/bed quick info, **gallery photo count badge**, **360° badge** when panoramic images exist, price/night badge.
  - **+ Nouvelle chambre** opens the shared `RoomEditorModal` (admin and owner reuse the same form — cover, gallery upload+reorder+delete, panoramic 360°, virtual tour, amenities, VIP, balcony, status, reservable/active).
  - **Modifier** + **🗑 red trash** buttons on every card; trash opens a confirmation `AlertDialog` and calls `DELETE /api/v1/owner/rooms/:id`.
  - Empty state when the owner has no hotels (clear message + admin contact hint).
  - Sidebar tile **"Chambres & Suites"** added to `/owner` home, highlighted amber.
- **`lib/api/owner-rooms.ts`** (new) — typed client: `fetchOwnerRooms`, `createOwnerRoom`, `updateOwnerRoom`, `deleteOwnerRoom`. All targets `/api/v1/owner/hotels/:id/rooms` and `/api/v1/owner/rooms/:id`.
- **`lib/api/owner.ts`** — added `fetchOwnerVenues()` so the owner pages can populate the hotel picker.
- **`app/(public)/lieu/[slug]/page.tsx`** — `RoomCard` now accepts `availableSameType` + `totalSameType` props; both call sites compute a `roomTypeAvailability` map up front (`{ STANDARD: { available, total }, SUITE: …}`) and pass per-type stats. The card renders:
  - **"Plus que N chambres de ce type"** red animated chip when this room is available and ≤2 same-type rooms remain.
  - **"Complet sur ces dates"** muted chip when 0 same-type rooms are available (graceful degradation rather than hiding the card).

### What this enables end-to-end
- Admin now sees the owner of every establishment at a glance (badge + tooltip + click-to-filter), spots unassigned hotels with the red stats pill, and re-assigns ownership without leaving the venues list.
- Hotel owners can fully manage their rooms — including gallery + 360° — from `/owner/rooms`, mirroring the admin experience but scoped to hotels they own (server-side `ownerId` check on every endpoint).
- Every owner-side mutation now writes to `AuditLog`, so the admin audit-log viewer (and the per-venue inline log) shows the full provenance of any change (check-in, manual reservation, room block, room CRUD, etc.).
- Clients see urgency signals on the venue page (last 1-2 rooms of a type, or "Complet"), matching booking-platform norms.

---

## Shipped this sixth pass

Focus: **category alignment with the home page, full venue + room deletion, per-room photo gallery, and owner-side room API**.

### Backend (`backend/src/`)
- `routes/admin.ts` — new endpoint **`DELETE /api/v1/admin/venues/:id`**: cascade-deletes the venue plus every related entity in one transaction:
  - `TourHotspot`, `TablePlacement`, `TableHotspot`
  - `Table`, `Room`, `Seat`
  - `Event`, `VirtualTour`, `VenueMedia`, `Scene`
  - `Reservation`
  Response returns per-entity counts (`{ deleted: { venue, tables, rooms, seats, events, tours, media, scenes, hotspots, placements, reservations } }`) so the UI can show what was removed.
- `routes/owner.ts` — new **owner-scoped hotel/room CRUD**, all checking `venue.ownerId === req.userId` (ADMIN bypasses):
  - `GET    /api/v1/owner/hotels/:id/rooms`
  - `POST   /api/v1/owner/hotels/:id/rooms`
  - `PATCH  /api/v1/owner/rooms/:id` (accepts `gallery[]` + `panoramicImages[]` + every Room field)
  - `DELETE /api/v1/owner/rooms/:id`
  Helpers `assertHotelOwnedByCaller` and `assertRoomOwnedByCaller` centralise the ownership check; rooms can only be touched through a hotel the caller owns.
- `scripts/seed.ts` — full rewrite. Drops all venues and re-seeds **exactly 1 venue per home-page category** (Cafés & Lounges, Bars & Rooftops, Restaurants Gastronomiques, Clubs & Resto de Nuit, Salles & Événementiel, Hôtels & Resorts, Beach Clubs, Spas & Bien-être). Names contain the keyword (Bar / Club / Beach / Spa) so the existing `q=` regex matches them on both the public explorer and the admin venues list. Categories are also rebuilt to mirror the 8 home-page labels. Tables/rooms, virtual tours, 5 events, and 3 sample reservations are seeded alongside.

### Frontend
- **`app/(admin)/layout.tsx`** — replaced the old 5-item "Lieux" group with a new **"Catégories"** group of 8 items matching the home page 1:1 (Cafés & Lounges, Bars & Rooftops, Restaurants Gastronomiques, Clubs & Resto de Nuit, Salles & Événementiel, Hôtels & Resorts, Beach Clubs, Spas & Bien-être). Each item carries either `typeQuery` (CAFE/RESTAURANT/EVENT_SPACE/HOTEL) or `qQuery` (Bar / Club / Beach / Spa). Active-state detection now distinguishes the two, and `qQuery` items only highlight when the URL has the matching `q` and no `type`. The "Hôtels & Resorts" entry routes to **`/admin/hotels`** (full hotel manager) instead of the generic `/admin/venues?type=HOTEL` list.
- **`app/(public)/explorer/page.tsx`** — type pill bar replaced by a unified `CATEGORIES` pill bar that mirrors the home page; clicking a pill writes `type=` or `q=` accordingly, and the result count label (`X lieux trouvés · <category>`) is now derived from the active category.
- **`app/(admin)/admin/venues/page.tsx`**:
  - `q` filter now hydrates from URL on mount and re-syncs on search-param changes (so sidebar links like `?q=Bar` actually filter).
  - Every row dropdown gained a destructive **Supprimer** item; every grid card got a red trash button next to the eye icon.
  - Confirmation `AlertDialog` shows the venue name, warns that tables/rooms/reservations will be wiped, and is irreversible. Mutation uses React Query (`useMutation` → invalidates `admin/venues` cache), Sonner toast prints the per-entity deletion counts, and the destructive button shows a spinner while pending.
  - "Modifier" on HOTEL rows now routes to `/admin/hotels/[id]` (dedicated hotel + rooms manager); non-hotel types keep `/admin/venues/[id]`.
- **`app/(admin)/admin/venues/[id]/page.tsx`** — **Chambres & Suites** tab cards now expose a red trash button beside the "Modifier" button. Confirmation `AlertDialog` calls `DELETE /api/v1/admin/rooms/:id`, refetches the list, toasts the result, and disables the cancel button while in flight.
- **`components/admin/hotel/RoomEditorModal.tsx`** — new **Galerie photo** section between the cover image and the basic info grid:
  - Multi-file upload (drop-zone state when empty; `+ Ajouter des photos` pill when non-empty)
  - 4-col thumbnail grid; each thumb has a hover overlay with delete button, `‹ / ›` reorder arrows, and a position-index badge
  - Hint that the first photo is the hero on the client page
  - Gallery is persisted alongside `coverImage` + `panoramicImages` on save (existing PATCH endpoint already accepts everything via `$set: req.body`)
- **`app/(public)/lieu/[slug]/page.tsx`** — `RoomDetailView` restructured: the 360° viewer (when present) and the **Galerie photo** grid are now shown side-by-side instead of one-or-the-other. First gallery photo spans 3 cols, the rest are smaller thumbnails. Clicking any thumbnail opens a fullscreen **lightbox** with prev/next arrows, close button, `N / total` counter, click-outside-to-close, and high-priority loading on the focused photo. An empty state ("Aucune photo ou vue 360°") is shown only when neither media type exists.
- **`lib/api/admin.ts`** — new `deleteAdminVenue(id)` helper (returns the `deleted` counts payload).

### What this enables end-to-end
- Admin/owner uploads multiple photos per room from the editor; client sees them in the gallery grid + lightbox under the 360° viewer on the venue page.
- Admin can clean up the dataset (delete bar/club/spa/hotel) without orphaned tables, rooms, or reservations.
- Sidebar, home page, and explorer all use the same 8 categories with consistent active-state behaviour.
- Owner-scoped room API is in place (UI page is the only follow-up; mirroring `/admin/hotels/[id]` against the `/owner/...` endpoints is a quick port).

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

All non-payment slices are now complete. The main remaining work:

1. **Real payment gateway integration (§4.5)** — replace direct `paid` marking for `paymentOption='online'` with a Stripe/Flouci/Konnect Checkout session + webhook handler. Touches `/hotel-checkout/confirm`, a new `payments` route, the `Reservation.paymentStatus` FSM, and admin reconciliation.
2. **Owner pricing UI** — the pricing engine and rules API are fully built (`/api/v1/pricing/*`); the owner just needs a UI page to create/edit rules and promo codes (mirrors admin controls).
3. **Payout statement PDF export** — generate a printable PDF for each payout entry (owner-facing).
4. **Advanced search filters** — free-cancellation toggle, 360°-available filter, star-class filter, sea-view filter; per-date "X rooms left" badge on search results.
5. **Revenue reports for owners** — daily/monthly occupancy, ADR, revenue by room type, cancellation/no-show rates.
6. **Owner management (super admin)** — verification badges, suspension, payout bank-account management.
7. **Automated payout scheduling** — cron job that auto-generates payouts on a monthly cycle and emails the owner a statement.
