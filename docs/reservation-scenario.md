# Ma Reservation — End-to-End Reservation Scenario

This document describes the complete reservation workflow of Ma Reservation: the
customer journey, every email that fires, the owner and admin touchpoints, and
the reservation state machine. It reflects the actual code paths in the repo.

---

## 1. The core concept

Ma Reservation is an **immersive reservation platform**. The customer does not
fill a blind form — they **see the venue in 360°, click the exact table / room /
desk they want, and reserve it**.

Each category has its own dedicated page:

| Category | Route | Reservation unit |
|---|---|---|
| Café / Café-Lounge | `/cafe/[slug]` | Table (immersive 360° pick) |
| Restaurant | `/restaurant/[slug]` | Table (immersive 360° pick) |
| Hôtel | `/hotel/[slug]` | Room |
| Coworking | `/coworking/[slug]` | Desk / office / meeting room |
| Cinéma | `/cinema/[slug]` | Seat / hall |
| Événements | `/evenement/[slug]` | Ticket |

Routing is centralised in `lib/venueHref.ts` (`getVenueHref`).

---

## 2. Customer journey (café / restaurant — the immersive flow)

```
Discover ──▶ Category page ──▶ "Réserver une table" tab ──▶ 360° viewer
   │                                                            │
   │                                            click a table marker
   ▼                                                            ▼
Explorer / home / search                            StepReservationModal
                                                                │
        ┌───────────────────────────────────────────────────────┤
        ▼                  ▼                  ▼                  ▼
   1. Table          2. Horaire          3. Options         4. Confirmer
   (selected)     pick a free slot    minimum consommation     pay
                  (blocks honoured)   + menu selection
```

1. **Discover** — the customer browses the home page, `/explorer`, or search and
   clicks a venue card. `getVenueHref` sends them to the dedicated category page.
2. **Category page** (`components/venue/TableVenueDetail.tsx`) — cinematic hero,
   gallery lightbox, menu, and a **"Réserver une table"** tab.
3. **Immersive view** (`components/venue/ImmersiveTableReservation.tsx`) — the
   venue's 360° scenes (linked by navigation hotspots) with **table markers**:
   🟢 disponible · 🔴 réservée / bloquée · 🟡 VIP.
4. **Click a table** → `components/reservation/StepReservationModal.tsx`:
   - **Step Table** — the chosen table, its capacity and **minimum consommation**.
   - **Step Horaire** — a time-slot picker built from `VenueTablePolicy`
     (opening hours, slot length) and live availability that **honours owner
     `TableBlock`s** (full-time blocks and time-range blocks) and existing
     reservations / holds.
   - **Step Options** — `orderType` is `table_only` or `with_menu`; the customer
     adds menu items, ideally until the **minimum consommation** is reached, and
     may add more.
   - **Step Confirmer** — review and **pay**.
5. **Hold** — selecting a slot creates a short-lived `ReservationHold`
   (status `active`, auto-expires; `holdExpiry.service.ts` sweeps it). This stops
   two customers grabbing the same table.
6. **Reservation created** — `POST /api/v1/reservations` converts the hold to a
   `Reservation`. Confirmation + owner-notification emails fire (see §4).
7. **Payment** — `POST /api/v1/payments/create-checkout-session` → Konnect /
   Stripe → webhook / verify sets `paymentStatus = paid` and sends the receipt.
8. **Confirmation page** — `/reservation/[id]/confirmation` shows the QR code.

Hotel, coworking and cinema follow the same shape with their own unit picker
(room / desk / seat) and checkout (`hotel-checkout`, etc.).

---

## 3. Reservation state machine

```
                 create hold (8 min, optional)
                          │
                          ▼
        ReservationHold: active ──expire──▶ expired
                          │
                   convert on booking
                          │
                          ▼
   Reservation.status:  PENDING ──▶ CONFIRMED ──▶ CHECKED_IN ──▶ COMPLETED
                          │            │
                          └──▶ CANCELLED ◀── (customer or owner)
                                       └──▶ NO_SHOW (owner marks)

   Reservation.paymentStatus:  unpaid ──▶ pending ──▶ paid
                                              └──▶ failed ──▶ (retry)
                                       paid ──▶ refunded (admin)
```

`bookingType`: `TABLE` · `ROOM` · `SEAT` · `COWORKING`.

Key models: `Reservation`, `ReservationHold`, `Table` (`minimumSpend`),
`TableBlock` (owner blocks), `VenueTablePolicy` (hours / slots), `Payment`.

---

## 4. Email matrix

All emails are sent via `backend/src/services/email.service.ts`
(`sendEmail` — SMTP / nodemailer with a Resend fallback).

| Event | Template | Recipient | Trigger |
|---|---|---|---|
| Booking created (TABLE / SEAT / COWORKING) | `createReservationConfirmationTemplate` | Customer | `routes/reservations.ts` create handler |
| Booking created (TABLE / café / coworking) | `createOwnerNewReservationTemplate` | **Venue owner** | `routes/reservations.ts` create handler |
| Booking created (ROOM) | `createHotelClientConfirmationTemplate` | Guest | `routes/hotel-checkout.ts` |
| Booking created (ROOM) | `createHotelOwnerNewReservationTemplate` | Owner | `routes/hotel-checkout.ts` |
| Payment succeeded | `createPaymentReceiptTemplate` | Customer | `routes/payments.ts` (verify + Konnect webhook) |
| Reservation cancelled | `createReservationCancellationTemplate` | Customer | `routes/reservations.ts` cancel handler |
| Payment still due (J-1) | `createDepositReminderTemplate` | Customer | `jobs/notifications.cron.ts` — daily 09:00 |
| Check-in reminder (J-1) | `createCheckinReminderTemplate` | Guest | `jobs/notifications.cron.ts` — daily 10:00 |
| Review request (after stay) | `createReviewRequestTemplate` | Guest | `jobs/notifications.cron.ts` — daily 11:00 |
| Hotel request accepted | `createReservationAcceptedTemplate` | Guest | owner accepts (hotel) |
| Hotel request rejected | `createReservationRejectedTemplate` | Guest | owner rejects (hotel) |

`Reservation` tracks sends with `cancellationEmailSentAt`, `reminderEmailSentAt`,
`reviewRequestSentAt`.

> **Known remaining gap:** there is no dedicated email when a *pending non-hotel*
> reservation is rejected — `createReservationRejectedTemplate` is currently
> hotel-shaped. Adding a generic rejection email is the last lifecycle item.

---

## 5. Owner touchpoints

The venue owner manages everything from the **owner dashboard**
(`app/(public)/owner/`):

1. **Onboarding** — creates the venue in `my-establishment`: name, type, address,
   description, **cover + gallery images**, and the **360° scenes** (a list of
   equirectangular images linked by navigation hotspots).
2. **Inventory** — defines tables / rooms / coworking units, each with capacity,
   price and **minimum consommation**; places table markers inside the 360° view.
3. **Availability** — blocks tables/units full-time or for specific time ranges
   (`TableBlock`, `CoworkingBlock`) and sets the `VenueTablePolicy` (hours, slots).
4. **New reservation** — receives the `createOwnerNewReservationTemplate` email,
   sees it in `owner/reservations` / `owner/table-operations`.
5. **Service** — checks the guest in (QR scan → `/reservation/[id]/verify`),
   then check-out / no-show.
6. **Revenue** — tracks payouts and reports in `owner/payments` / `owner/reports`.

---

## 6. Admin touchpoints

The platform admin works from `app/(admin)/admin/`:

1. **Approval** — `hotels-approval` (and venue moderation) gate a venue before it
   goes public: a checklist (cover, ≥2 gallery images, description, rooms, owner
   email verified, compliance docs) must pass → `approved` + published.
2. **Moderation** — reviews (`moderation`) and events (`events-moderation`).
3. **Owners** — manages owner accounts, commission rates, service domains.
4. **Reservations** — can force-cancel or mark a reservation refunded.
5. **Payouts** — generates and approves owner payouts.

---

## 7. End-to-end happy path (example)

1. Sarah opens `/cafe/nour-coffee-house-tunis`, taps **Réserver une table**.
2. She drags the 360° view, sees **Table 4** glowing green, clicks it.
3. She picks **20:00**, sees the **35 TND minimum consommation**, adds a Flat
   White + an Avocado Toast to reach it, then taps **Payer**.
4. An 8-minute hold is created; she pays via Konnect.
5. Emails fire: **confirmation + QR** to Sarah, **new-reservation alert** to the
   café owner, **payment receipt** to Sarah.
6. The next morning she gets a **check-in reminder**.
7. At the café, the owner scans her QR (`/reservation/[id]/verify`) →
   `CHECKED_IN` → after her visit → `COMPLETED`.
8. The following day she receives a **review request**.

---

_Last updated: maintained alongside `backend/src/routes/reservations.ts`,
`payments.ts`, `hotel-checkout.ts`, and `jobs/notifications.cron.ts`._
