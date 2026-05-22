# Multi-Category Reservation Master Plan

Updated: 2026-05-20

## 1) Scope (after Hotel + Event)

We extend the platform to support:

1. Coworking Spaces
2. Cafes & Lounges
3. Restaurants

With a unified booking engine, plus category-specific rules.

---

## 2) Product Goal

Build one international-grade reservation platform where:

- Client can discover, compare, reserve, and optionally pre-order menu/items.
- Owner can manage inventory, availability, pricing, schedules, and operations.
- Super Admin can onboard owners, moderate listings, enforce quality, and manage payouts/compliance.

---

## 3) Category-by-Category Booking Logic

## 3.1 Coworking Space

Reservable units:
- Hot desk (shared)
- Dedicated desk
- Private office
- Meeting room
- Day pass / half-day pass

Core booking rules:
- Time-slot based (hourly blocks) + day packages
- Capacity control per unit
- Add-ons: monitor, projector, locker, parking, printing credits
- Access window + grace period + no-show policy

Operations:
- Check-in QR or PIN
- Auto-expire unpaid holds
- Overtime billing rules for late checkout

## 3.2 Cafes & Lounges

Reservable units:
- Table-based seating (indoor/outdoor/smoking/non-smoking)
- VIP lounge sections

Core booking rules:
- Date + time slot + party size
- Deposit optional (peak hours)
- Table combination logic for larger groups
- Duration policy (e.g., 90 min default)

Menu integration:
- Pre-order beverages/snacks
- Optional minimum spend by zone/time
- In-venue upsell (dessert, shisha, premium drinks)

## 3.3 Restaurants

Reservable units:
- Tables by capacity + zones
- Private room for groups

Core booking rules:
- Shift windows (lunch/dinner)
- Party-size to table assignment with merge/split logic
- Deposit for high-demand windows
- Cancellation deadline and no-show fee policy

Menu integration:
- Pre-order courses/menu packages
- Special requests: allergies, birthday setup, dietary type
- Optional prepayment menu bundles

---

## 4) Unified Client Experience

Search/discovery:
- Category tabs: Hotel, Event, Coworking, Cafe, Restaurant
- Filters per category (time slot, party size, budget, amenities, rating)

Reservation funnel:
1. Select unit/table/slot
2. Add guests/details
3. Optional menu pre-order
4. Payment method (online/deposit/pay at venue)
5. Confirmation with QR + reference

Post-booking:
- Modify booking (if policy allows)
- Cancel with transparent fees
- Re-order from menu before arrival (for cafe/restaurant)
- Ticket/confirmation in account + email

---

## 5) Owner Console by Category

Common modules:
- Dashboard KPIs (bookings, revenue, occupancy, cancellations, no-show)
- Availability calendar/timeline
- Inventory manager (tables/desks/rooms)
- Reservation actions (accept/reject/check-in/check-out/no-show)
- Block dates/units with reason

Coworking owner extras:
- Resource inventory (monitor, lockers, meeting equipment)
- Hourly/package pricing rules
- Team memberships / recurring bookings (phase 2)

Cafe/Restaurant owner extras:
- Table map editor
- Shift configuration
- Menu manager (categories, item options, availability windows)
- Kitchen/serving status (phase 2)

---

## 6) Super Admin Controls

Onboarding:
- Invite owner with service domains:
  - HOTEL
  - EVENT
  - COWORKING
  - CAFE_LOUNGE
  - RESTAURANT

Moderation:
- Listing approval workflow
- Category-specific compliance checklist
- Suspend/reactivate owner and venue

Finance:
- Commission configuration per category
- Deposit rules governance
- Payout approval workflow

Risk/compliance:
- Fraud flags (high no-show, unusual booking patterns)
- Audit logs for critical actions

---

## 7) Data Model Additions (High Level)

New/extended entities:
- `Venue.type` extend with `COWORKING`, `CAFE_LOUNGE`, `RESTAURANT`
- `ReservableUnit` enhancements:
  - unit kind, zone, merge/split capability, min/max duration
- `AvailabilityRule`:
  - slot definitions, shift windows, blackout windows
- `Menu` + `MenuItem` + `MenuOption` + `PreOrder`
- `BookingPolicy`:
  - cancellation/deposit/no-show/late rules per venue or category
- `OwnerServiceDomain`:
  - allowed services per owner

---

## 8) Reservation + Menu Scenarios

Scenario A (Restaurant table + pre-order):
1. Client picks dinner slot for 4 people.
2. System proposes valid tables.
3. Client pre-orders starter + main + drinks.
4. Deposit paid online.
5. QR confirmation issued.
6. Owner marks arrived + served.

Scenario B (Cafe quick reserve):
1. Client reserves outdoor table for 2 at 20:00.
2. No deposit required.
3. Optional drinks pre-order.
4. Auto-cancel if no show after grace period.

Scenario C (Coworking meeting room):
1. Client books meeting room for 3 hours.
2. Adds projector + coffee package.
3. Pays online.
4. Gets access code + QR.
5. Checkout computes overtime if extended.

---

## 9) UX Redesign Direction (Old Design Upgrade)

Principles:
- Keep dark premium identity but improve density and readability.
- Strong category-specific chips and contextual actions.
- Better hierarchy: search bar -> filters -> inventory -> checkout summary.

Key upgrades:
- Better card grid with stable dimensions and availability badges.
- Left-side sticky filters on desktop, drawer filters on mobile.
- Rich reservation summary panel with live total.
- More professional status system (pending/confirmed/arrived/completed/no-show).

---

## 10) Execution Plan (Recommended Sprints)

Sprint A (Foundation):
1. Add new categories to taxonomy + venue forms.
2. Owner service-domain assignment model + admin UI.
3. Extend unified reservation rules for table/slot/unit logic.

Sprint B (Operations):
1. Coworking inventory + slot booking.
2. Cafe/restaurant table booking with shift windows.
3. Blocking + hold + anti-double-booking hardening.

Sprint C (Menu + Checkout):
1. Menu and pre-order engine.
2. Checkout integration with menu totals.
3. Confirmation UX and notifications.

Sprint D (Polish + Analytics):
1. Owner KPI dashboards by category.
2. Admin category analytics.
3. Edge-case QA, mobile UX polish, audit and support flows.

---

## 11) Definition of Done for this expansion

- Client can reserve Coworking/Cafe/Restaurant successfully.
- Anti-double-booking works in all categories.
- Menu pre-order works for cafe/restaurant and appears in owner view.
- Owner can block units/slots and manage reservations end-to-end.
- Super admin can invite domain-specific owners and moderate listings.
- Category dashboards + key notifications are operational.

---

## 12) Immediate Next Build Order (Actionable)

1. Implement `Venue.type` + owner service-domain assignment first.
2. Implement table/slot engine for Cafe/Restaurant.
3. Implement coworking unit + hourly booking rules.
4. Plug menu pre-order into checkout.
5. Upgrade public listing/detail UI for the 3 categories.

