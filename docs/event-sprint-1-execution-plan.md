# Event Platform Sprint 1 Execution Plan

Scope: Deliver a production-ready Event MVP baseline with three actors:

- Client / attendee
- Event owner / promoter
- Super admin

Sprint length: 2 weeks

## Sprint 1 Goal

Ship the minimum event booking flow end-to-end:

- Admin can invite and activate event owners
- Owner can create and submit events with ticket types
- Admin can moderate and approve events
- Client can discover events and reserve tickets
- Platform generates QR ticket and confirmation

## In-Scope Modules

1. Owner onboarding and invitation
2. Event creation and moderation workflow
3. Ticket type and inventory basics
4. Client event discovery and checkout
5. Ticket confirmation with QR code
6. Core audit logs for sensitive actions

## Out Of Scope

- Full payout engine
- Advanced disputes center
- Loyalty points
- Complex seat map designer
- Advanced marketing automation

## Deliverables

1. `/admin/owners` supports invite + activate + service assignment
2. `/owner/events` supports create/edit/submit event
3. `/admin/events-moderation` supports approve/reject/request changes
4. Public event listing + event detail + ticket selection
5. Checkout + order confirmation + QR ticket
6. Basic audit log trace for owner/event/order actions

## Feature Breakdown

### A. Owner Invitation Flow

Admin actions:

- Create owner account
- Select service domain (event organizer, concert promoter, etc.)
- Send invitation email with setup link
- Activate/deactivate owner

Owner flow:

- Open invite link
- Set password
- Complete profile
- Access owner dashboard

### B. Event Moderation Lifecycle

Event statuses:

- `draft`
- `pending_review`
- `approved`
- `rejected`
- `changes_requested`
- `cancelled`

Admin actions:

- Approve
- Reject with reason
- Request changes with note

### C. Event Creation MVP

Owner event form:

- Title
- Category
- Description
- Cover image
- Venue name + address + city
- Start date/time
- End date/time
- Ticket types
- Publish mode (draft / submit for review)

Ticket type form:

- Name (Standard, VIP, Early Bird)
- Price
- Capacity
- Sales start
- Sales end
- Max qty per order

### D. Client Event Discovery

Public listing:

- Search by title
- Filter by category
- Filter by city
- Filter by date

Event card:

- Image
- Title
- Date/time
- Venue/city
- Starting price
- CTA

### E. Client Checkout MVP

Checkout steps:

1. Ticket selection
2. Personal info
3. Payment method selection
4. Confirmation

Client form fields:

- First name
- Last name
- Email
- Phone
- Terms acceptance

Payment mode in Sprint 1:

- `online_mock` or existing platform payment placeholder
- Optional `cash_order` with 4-hour expiration flag

### F. Confirmation And QR Ticket

Confirmation must include:

- Order reference
- Event details
- Ticket summary
- Total paid
- QR code
- Download/print action

Ticket record:

- `orderId`
- `ticketId`
- `eventId`
- `status`
- `qrPayload`

## Backend Tasks

1. Add/confirm models:
   - `Event`
   - `TicketType`
   - `EventOrder`
   - `EventTicket`
2. Add owner invite token flow endpoints.
3. Add owner event CRUD endpoints.
4. Add admin event moderation endpoints.
5. Add public event listing/detail endpoints.
6. Add checkout endpoints:
   - reserve inventory
   - create order
   - create ticket
   - generate QR payload
7. Add audit logs for:
   - owner invite
   - owner activation
   - event submit/approve/reject
   - order creation/cancel

## Frontend Tasks

1. Admin owners page:
   - invite modal
   - service domain assignment
2. Owner events page:
   - event list
   - create/edit form
   - submit for review
3. Admin moderation page:
   - pending events list
   - approve/reject/request changes actions
4. Public event pages:
   - list
   - detail
   - ticket selector
5. Checkout pages:
   - attendee info form
   - payment step
   - confirmation page
6. Ticket page:
   - QR rendering
   - print/download action

## Data And Validation Rules

1. Ticket capacity cannot go below zero.
2. Event must be `approved` to appear publicly.
3. Reject/request changes actions require reason/note.
4. Order confirmation only after successful reserve/create transaction.
5. Every sensitive admin and owner action must create audit log entry.

## QA Acceptance Criteria

1. Admin can invite an owner and owner can activate account.
2. Owner can create event with at least one ticket type.
3. Owner can submit event and admin can approve/reject it.
4. Approved event appears in public listing.
5. Client can reserve tickets and get confirmation reference.
6. QR ticket is generated and visible on confirmation.
7. Inventory decreases correctly after successful order.
8. Audit logs show key actions in correct chronology.

## Definition Of Done

1. Core event flow works on desktop and mobile.
2. No overselling in normal concurrent checkout tests.
3. API and UI error handling is clear for user and owner.
4. `backend` build passes.
5. Root app type-check passes or known unrelated failures are documented.

## Suggested Build Order

1. Owner invite and activation flow
2. Event and ticket type backend models + endpoints
3. Owner event creation UI
4. Admin moderation UI
5. Public event list/detail UI
6. Checkout + confirmation + QR
7. Audit logs and QA pass

