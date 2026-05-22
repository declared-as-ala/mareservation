# Hotel Platform Sprint 1 Execution Plan

Scope: Deliver a production-ready Super Admin MVP baseline, focused on control and operations.

Sprint length: 2 weeks

## Sprint 1 Goal

Ship the minimum Super Admin control center needed to operate hotels safely in production:

- Hotel approval workflow
- Owner management basics
- Admin reservation intervention basics
- Audit logging coverage and viewer

This sprint does not include payouts, full disputes, seasonal pricing, or gateway integration.

## In-Scope Modules

1. Hotel approval workflow
2. Approval checklist and moderation actions
3. Owner verification and account controls
4. Admin reservation intervention actions
5. Audit log UI and event coverage
6. Super admin dashboard KPI refresh

## Out Of Scope

- Commission and payouts engine
- Full dispute case management
- Payment gateway integration
- Advanced pricing engine
- Reviews and moderation queue

## Deliverables

1. `/admin/hotels-approval` fully operational with status transitions
2. `/admin/owners` with verification and suspension controls
3. `/admin/reservations` admin actions: force cancel, mark refunded, add admin note
4. `/admin/audit-logs` usable filter/search viewer
5. Admin dashboard KPI cards for hotel operations

## Feature Breakdown

### A. Hotel Approval Workflow

Statuses:

- `draft`
- `pending_review`
- `changes_requested`
- `approved`
- `rejected`
- `suspended`
- `featured`

Admin actions:

- Approve
- Reject
- Request changes
- Suspend
- Unsuspend
- Toggle featured

Mandatory rejection/change reason:

- Required text field saved in history.

### B. Approval Checklist

Checklist auto-computed per hotel:

- Owner verified
- Identity docs present
- Address present
- Phone present
- Cover image present
- Gallery min count met
- Description min length met
- At least one room exists
- All rooms have price
- All rooms have photo
- Core policies provided

Rules:

- `Approve` disabled until required checklist items pass.
- `Request changes` enabled anytime with reason.

### C. Owner Management

Owner table should include:

- Name
- Email
- Phone
- Verification status
- Account status
- Hotels count
- Created date

Admin actions:

- Verify owner
- Unverify owner
- Suspend owner
- Reactivate owner
- Force password reset trigger flag

### D. Admin Reservation Intervention

In admin reservation view:

- Force cancel reservation
- Mark as refunded
- Add admin note
- View full status timeline

Constraints:

- Every intervention requires reason.
- Every intervention writes audit log entry.

### E. Audit Log Viewer

Page: `/admin/audit-logs`

Filters:

- Date range
- Actor role
- Actor ID
- Entity type
- Entity ID
- Action type
- Free-text search

Columns:

- Timestamp
- Actor
- Action
- Entity
- Summary
- Details drawer

### F. Admin Dashboard KPI Update

Add KPI cards:

- Pending hotel approvals
- Approved hotels
- Suspended hotels
- Active owners
- Pending owner verifications
- Reservations today
- Forced cancellations today

## Backend Tasks

1. Ensure hotel status enum and transition guards are centralized.
2. Add or complete endpoints for all moderation actions.
3. Add owner management endpoints for verify/suspend/reactivate.
4. Add reservation admin intervention endpoints with reason validation.
5. Extend audit log writes for every admin mutation in this sprint.
6. Add dashboard aggregation endpoint for new KPI cards.

## Frontend Tasks

1. Finish hotel approval action drawer/modals with reason input.
2. Implement checklist visualization and action gating.
3. Build owner management page controls and confirmation dialogs.
4. Extend admin reservations page actions and timeline panel.
5. Build/finish audit logs table + filters + details drawer.
6. Add dashboard KPI cards and loading/error states.

## Data And Validation Rules

1. Any moderation action changing status must have:
   - `actorId`
   - `fromStatus`
   - `toStatus`
   - `reason`
   - timestamp
2. Any force cancel/refund must require reason.
3. Suspended owner cannot create/update hotel content.
4. Suspended hotel cannot accept new reservations.

## QA Acceptance Criteria

1. Admin can move hotel through all valid states.
2. Invalid transitions are blocked with clear error.
3. Approve button is blocked if checklist fails.
4. Owner suspension takes effect immediately on owner routes.
5. Admin intervention actions appear in reservation history.
6. Audit log contains every admin mutation from this sprint.
7. Dashboard KPIs match DB counts within same filter window.

## Definition Of Done

1. All in-scope pages work in desktop and mobile layouts.
2. API responses and errors are typed and handled in UI.
3. Audit logs are present for all new actions.
4. No regression in existing hotel checkout flow.
5. `npx tsc --noEmit` passes.

## Suggested Build Order

1. Hotel statuses and transition backend
2. Approval checklist backend and UI gating
3. Owner management backend and UI
4. Reservation interventions backend and UI
5. Audit log viewer finalize
6. Dashboard KPI finalize
7. End-to-end QA and polish

