# Multi-Category Execution Sprints

Updated: 2026-05-20

Based on: `multi-category-reservation-master-plan.md`

## Sprint 1 - Platform Foundation (2 weeks)

Goal:
- Enable category expansion + owner domain assignment.

Scope:
1. Extend `Venue.type` with:
   - `COWORKING`
   - `CAFE_LOUNGE`
   - `RESTAURANT`
2. Add owner service-domain assignment:
   - owner can be scoped to one or many domains
3. Admin invite flow enhancement:
   - choose domains during invite
4. Category-aware listing and detail routing baseline

Deliverables:
- Admin can create/invite owner with selected domains.
- Owner only sees allowed modules by domain.
- New category venues can be created and published.

Acceptance Criteria:
- Owner without `RESTAURANT` cannot create restaurant listing.
- Category filters show new types in public explorer.

### Sprint 1 Status - Completed

Checklist:
- [x] `Venue.type` extended with `COWORKING` and `CAFE_LOUNGE` (and existing `RESTAURANT` kept in flow).
- [x] Owner `serviceDomains` added and normalized (`HOTEL`, `EVENT`, `COWORKING`, `CAFE_LOUNGE`, `RESTAURANT`, `CINEMA`, `EVENT_SPACE`).
- [x] Admin invite flow supports domain selection and persists to owner account.
- [x] Admin can update owner service domains after invite.
- [x] Domain-to-venue mapping utilities added and used for owner scoping.
- [x] Owner dashboard and owner venue list are scoped by assigned domains.
- [x] Domain authorization guard (`requireAnyServiceDomains`) added and enforced on owner modules.
- [x] Public explorer/category pages include new categories (`/coworking`, explorer cards, type labels).
- [x] Venue public filtering supports `CAFE` + `CAFE_LOUNGE` grouping.
- [x] Typecheck and backend build pass after Sprint 1 changes.

Validation summary:
- An owner account without `RESTAURANT` domain is blocked by domain guard from restaurant-oriented owner capabilities.
- Category filters and listing baseline now expose new category types in the public explorer.

---

## Sprint 2 - Reservation Engine for Cafe/Restaurant (2 weeks)

Goal:
- Production table booking for Cafe/Lounge + Restaurant.

Scope:
1. Table-slot reservation engine:
   - party size -> eligible tables
   - table merge/split support (basic)
2. Shift/time-window config:
   - lunch/dinner (restaurant)
   - open-hour slots (cafe/lounge)
3. Booking policies:
   - deposit optional
   - no-show grace period
   - cancellation cutoff
4. Owner operations:
   - accept/reject/check-in/check-out/no-show
   - block table/zone/date-range

Deliverables:
- Client can reserve table by date/time/party size.
- Owner can manage full lifecycle from dashboard.

Acceptance Criteria:
- No double booking on same table/time.
- Hold expiry releases inventory correctly.

### Sprint 2 Status - Completed

Implemented now:
- [x] Owner table-policy API (`/api/v1/owner-table/venues/:venueId/policy` GET/PUT): opening/closing hours, slot minutes, reservation duration, shifts, deposit policy, cancellation cutoff, no-show grace.
- [x] Owner table block API (`/api/v1/owner-table/venues/:venueId/blocks` + `/blocks/:id`): block a single table or full venue window.
- [x] Owner eligible tables API (`/api/v1/owner-table/venues/:venueId/eligible-tables`): party-size filtering + reservation/hold/block conflict filtering.
- [x] Reservation engine guardrails updated:
  - availability check now considers active table blocks.
  - hold creation now rejects blocked table windows.
  - reservation creation now rejects blocked table windows.
  - table timeline includes blocked ranges.
- [x] Table listing availability status now returns `blocked` when table/venue block overlaps selected window.
- [x] Capacity/merge baseline improved by honoring `capacityMax` in table reservation validation (basic merge/split-compatible capacity handling).
- [x] Owner table operations API for lifecycle:
  - `GET /api/v1/owner-table/reservations`
  - `POST /api/v1/owner-table/reservations/:id/check-in`
  - `POST /api/v1/owner-table/reservations/:id/check-out`
  - `POST /api/v1/owner-table/reservations/:id/no-show` (grace-enforced)
- [x] Cancellation cutoff enforced for client self-cancel on table reservations.
- [x] Deposit policy wired into table reservation creation (`paymentOption`, `amountPaid`, `remainingAmount`, `cancellationDeadline`).
- [x] Owner UI page shipped: `/owner/table-operations` (policy editor, block manager, reservation actions).
- [x] Owner dashboard quick action updated to expose table operations for `RESTAURANT` / `CAFE_LOUNGE` domains.

Validation:
- [x] Backend build passes (`npm run build` in `backend`).
- [x] Root typecheck passes (`npx tsc --noEmit`).

---

## Sprint 3 - Coworking Booking Engine (2 weeks)

Goal:
- Enable coworking reservations with hourly and package logic.

Scope:
1. Reservable coworking units:
   - hot desk, dedicated desk, private office, meeting room
2. Time-based booking:
   - hourly, half-day, full-day
3. Add-ons:
   - monitor, projector, locker, printing credits, parking
4. Owner controls:
   - capacity per unit
   - blackout windows
   - overtime rules

Deliverables:
- Client can reserve coworking units with duration and add-ons.
- Owner can manage inventory and availability.

Acceptance Criteria:
- Capacity decreases correctly per slot.
- Overtime and policy calculations are deterministic.

### Sprint 3 Status - Completed

Implemented now:
- [x] Reservable unit model extended for coworking unit types:
  - `coworking_desk`
  - `coworking_office`
  - `coworking_meeting_room`
- [x] Coworking add-ons model created (`CoworkingAddon`) for monitor/projector/locker/etc.
- [x] Owner coworking API shipped:
  - units CRUD: `/api/v1/owner-coworking/venues/:venueId/units`, `/units/:id`
  - addons CRUD: `/api/v1/owner-coworking/venues/:venueId/addons`, `/addons/:id`
  - reservations feed: `/api/v1/owner-coworking/reservations`
- [x] Public coworking addons endpoint:
  - `GET /api/v1/venues/:id/coworking-addons`
- [x] Reservation engine supports `bookingType='COWORKING'`:
  - overlap prevention by `reservableUnitId`
  - capacity validation by unit
  - duration handling (`hourly` / `half_day` / `full_day` + fallback hours)
  - add-ons pricing inclusion in total
  - coworking metadata stored on reservation (`coworkingDurationType`, `coworkingHours`, `coworkingAddons`, `coworkingAddonsTotal`)
- [x] Owner coworking operations page:
  - `/owner/coworking-operations`
  - create/list coworking units and addons

Completed in this pass:
- [x] Public coworking booking UI flow (unit picker + duration + add-ons) on `app/(public)/lieu/[slug]/page.tsx`.
- [x] Owner blackout windows and overtime policy screens:
  - policy: `GET/PATCH /api/v1/owner-coworking/venues/:venueId/policy`
  - blocks: `GET/POST /api/v1/owner-coworking/venues/:venueId/blocks`, `PATCH/DELETE /api/v1/owner-coworking/blocks/:id`
  - owner UI: `/owner/coworking-operations`
- [x] Capacity/revenue utilization analytics and coworking KPI widgets:
  - `GET /api/v1/owner-coworking/venues/:venueId/kpis`
  - KPI cards on owner coworking operations page

---

## Sprint 4 - Menu + Pre-Order Integration (2 weeks)

Goal:
- Let client reserve and pre-order menu in cafe/restaurant.

Scope:
1. Menu domain:
   - categories, items, variants/options, availability windows
2. Pre-order in checkout:
   - attach menu items to reservation
   - total = reservation + pre-order subtotal + tax/fees
3. Owner view:
   - reservation linked with ordered items
   - prep status baseline
4. Policy:
   - prepaid items refund rule handling

Deliverables:
- Client sees menu during booking and can pre-order.
- Owner sees complete order context before guest arrival.

Acceptance Criteria:
- Menu stock/availability is respected.
- Totals and payment state are consistent in API + UI.

### Sprint 4 Status - Completed

Implemented now:
- [x] Reservation API now accepts `orderType` + `menuItems` for table bookings.
- [x] Backend validates pre-order menu items against venue ownership and availability.
- [x] Menu availability windows enforced (`availableFrom` / `availableTo`).
- [x] Optional stock tracking enforced (`trackStock` + `stockQty`) with stock decrement on confirmed reservation.
- [x] Reservation totals are server-calculated and include menu subtotal for `with_menu`.
- [x] Reservation stores normalized `menuItems`, `menuTotal`, and `priceBreakdown`.
- [x] Checkout frontend passes menu pre-order payload from cart to reservation API.
- [x] Client confirmation page shows pre-ordered items and menu subtotal.
- [x] Owner table operations page shows whether reservation is `table_only` or `with_menu`.
- [x] Kitchen prep workflow linked to reservation pre-orders:
  - `menuPrepStatus` on reservation (`pending`, `preparing`, `ready`, `served`, `cancelled`)
  - owner endpoint to update prep status.
- [x] Dedicated owner pre-order operations feed:
  - filter by prep status
  - update prep state directly from owner panel.
- [x] Owner menu inventory controls at scale:
  - toggle item availability
  - toggle stock tracking
  - quick stock increment
  - availability time-window persistence via owner menu update flow.

Validation:
- [x] Backend build passes (`npm run build` in `backend`).
- [x] Root typecheck passes (`npx tsc --noEmit`).

---

## Sprint 5 - UX Upgrade + Cross-Category Dashboard (2 weeks)

Goal:
- Upgrade old design and unify premium operational UX.

Scope:
1. Public UX refresh:
   - category-first navigation
   - responsive filters
   - richer cards and availability states
2. Owner UX refresh:
   - category-specific KPI cards
   - timeline/calendar improvements
3. Admin UX:
   - cross-category moderation queue
   - owner-domain management panel

Deliverables:
- Strong, consistent UI across hotel/event/cafe/restaurant/coworking.

Acceptance Criteria:
- Mobile and desktop parity for core booking flows.
- No overflow/broken layout in key pages.

### Sprint 5 Status - Completed

Implemented now:
- [x] Public explorer UX refresh:
  - category-first filter bar retained and improved
  - advanced filter panel expanded with sort (`featured`, `name_asc`, `name_desc`)
  - featured/vedette filter toggles
  - stronger active-filter counting for UX clarity
  - richer venue cards (`Vedette`, `Mis en avant`, `360°`, `À partir de`)
- [x] Owner UX refresh baseline:
  - owner dashboard rebuilt with domain-specific operation panels (hotel, restaurant/café, coworking, event)
  - recent reservations timeline section
  - 7-day timeline/calendar planning cards (count + revenue per day)
  - category-aware quick actions and modules
- [x] Admin owner-domain management improved:
  - invite form supports phone + category presets
  - clear invite flow messaging (email + password setup)
  - backend invite hardening: at least one service domain required
- [x] Admin cross-category moderation hub:
  - new `/admin/moderation` page
  - reviews moderation queue actions (approve/reject/reset)
  - quick links to hotels/events moderation

---

## Sprint 6 - Finance, Notifications, Hardening (2 weeks)

Goal:
- Production hardening for scale and operations.

Scope:
1. Commission and payout workflows by category
2. Notification matrix completion:
   - client, owner, admin events
3. Audit logs coverage expansion
4. Support/dispute hooks baseline
5. Performance and reliability tests

Deliverables:
- Finance and operational workflows stable for go-live.

Acceptance Criteria:
- Reconciliation reports match booking data.
- Critical actions are fully auditable.

### Sprint 6 Status - Completed (Without payment gateway integration)

Implemented now:
- [x] Commission/payout workflow hardening:
  - owner balance + owner payout listing/detail endpoints operational
  - admin generate/approve/mark-paid/hold/reject payout endpoints operational
  - payout lifecycle notifications to owners added (email)
  - payout lifecycle audit actions added (`PAYOUT_GENERATED`, `PAYOUT_APPROVED`, `PAYOUT_MARKED_PAID`, `PAYOUT_HELD`, `PAYOUT_REJECTED`)
- [x] Notification matrix expanded:
  - support case creation notifies support/admin recipients
  - support reply notifications for both directions (admin -> client and client -> support/admin)
  - support case status update notification to client
- [x] Audit logs coverage expansion:
  - support case lifecycle actions added (`SUPPORT_CASE_CREATED`, `SUPPORT_CASE_REPLIED`, `SUPPORT_CASE_UPDATED`, `SUPPORT_CASE_CLOSED`)
  - entity scope expanded with `support_case` and `payout`
  - owner table/coworking operational mutations now log auditable actions
- [x] Support/dispute baseline:
  - support case CRUD/reply/assignment flows already present and now production-hardened with notifications + audit traceability
- [x] Reliability gates:
  - root typecheck passes (`npx tsc --noEmit`)
  - backend build passes (`npm run build`)

Explicitly out of scope:
- [x] No payment gateway integration (kept deferred as requested).

---

## Technical Backlog Mapping (by layer)

Backend:
1. Category/domain schema updates
2. Reservation rules engine enhancements
3. Menu + preorder models/routes
4. Domain-based authorization guards
5. Notifications and payout modules

Frontend:
1. Category pages and advanced filter UX
2. Table booking and coworking booking flows
3. Menu pre-order checkout components
4. Owner dashboards by domain
5. Admin moderation + owner-domain management

QA:
1. Double-booking prevention tests
2. Concurrency tests for hold/confirm
3. Pricing consistency tests
4. Mobile responsiveness tests

---

## Priority Build Order (if starting immediately)

1. Sprint 1
2. Sprint 2
3. Sprint 4
4. Sprint 3
5. Sprint 5
6. Sprint 6

Reason:
- Restaurant/cafe + menu gives fastest commercial value.
- Coworking can follow once reservation core is stable.
