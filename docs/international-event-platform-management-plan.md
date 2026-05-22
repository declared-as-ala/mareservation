# International Event Platform Management Plan

This document is the product blueprint for a production-grade event reservation platform in the style of Teskerti.

It covers the three main participants:

- Client / attendee
- Event owner / promoter / partner
- Super admin / platform owner

It also defines the partner onboarding flow where an admin assigns a service domain to a new owner, sends an invitation email, and lets that owner create a password before publishing events or other allowed offerings.

## 1. Product Vision

The platform should feel like a serious reservation system, not just an event listing site.

Core goals:

- Clients discover events quickly, understand what they are buying, and receive a professional digital ticket.
- Event owners manage events, ticket types, sales, attendees, scanning, refunds, and reporting from one portal.
- Super admin controls the full marketplace, owner onboarding, platform fees, moderation, support, and payouts.

Reference behavior observed on Teskerti:

- Event pages show the event title, venue, date, ticket types, price, map, and an add-to-cart flow.
- Checkout is organized into cart, information, and payment steps.
- Terms mention a service fee per ticket, cash orders that expire after a limited time, delivery of tickets by email or account, and refunds only when the organizer cancels the event.

## 2. Main Participants

### Client / End-User

The client wants to:

- Search and browse events by category, date, city, venue, or keyword.
- See clear ticket options, prices, and availability.
- Reserve tickets with confidence.
- Receive a ticket reference, QR code, and order confirmation.
- View past and upcoming orders in an account dashboard.

### Event Owner / Promoter

The event owner wants to:

- Create and publish events.
- Define ticket types, prices, quotas, zones, and sales periods.
- Track sales in real time.
- Manage attendees and entrance scanning.
- Control cancellations, postponements, and refunds.

### Super Admin / Platform Owner

The super admin wants to:

- Add and verify owners.
- Assign service categories and permissions.
- Approve or reject events.
- Control fees, payment channels, marketing, and moderation.
- Resolve support issues, refunds, and disputes.

## 3. Service Categories And Owner Assignment

When the super admin adds a new owner, the owner should not be limited to only one generic role. The platform should support service domains and content types.

Suggested service domains:

- Event organizer
- Concert promoter
- Theater organizer
- Sports organizer
- Festival organizer
- Cinema partner
- Club / nightlife partner
- Hotel partner
- Restaurant partner
- Coffee shop partner
- Venue operator
- Cultural center partner
- Exhibition / conference partner

Each owner account should have:

- One primary service domain
- Optional secondary domains
- Allowed actions based on domain
- Allowed content types based on domain

Examples:

- Event organizer can create events, ticket zones, and entrance scanning.
- Restaurant partner can create dinner events, brunch offers, live shows, or table reservations if that module is enabled.
- Hotel partner can create hotel listings, room inventory, packages, or event-hosting offers if allowed.
- Coffee shop partner can publish small events, tastings, or reservations.

### Owner Invitation Flow

Super admin flow:

1. Create owner profile.
2. Choose service domain or domains.
3. Assign permissions.
4. Define payout rules and commission rules.
5. Send invitation email.
6. Owner receives secure setup link.
7. Owner sets password and confirms account.
8. Owner completes profile and uploads documents.
9. Admin verifies and activates the account.

Owner account should start in one of these states:

- Invited
- Pending verification
- Active
- Suspended
- Rejected

## 4. Client Experience

### 4.1 Discovery

The home experience should make it obvious how to search events.

Search inputs:

- Event name
- Category
- City
- Venue
- Date
- Price range
- Ticket type
- Language
- Age restriction

Filters:

- Today
- This weekend
- Concert
- Sport
- Theater
- Cinema
- Festival
- Family friendly
- VIP
- Sold out
- Live now

Search results should show:

- Poster or hero image
- Event title
- Venue
- Date and time
- Category
- Starting price
- Ticket availability
- Sales status
- Quick CTA to open the event

### 4.2 Event Detail Page

The event page should be conversion focused and easy to understand.

It should show:

- Event title
- Date and time
- Venue name and address
- Map preview
- Description
- Poster image
- Optional gallery
- Ticket types
- Sales window
- Availability status
- Rules or restrictions
- Contact or organizer info

Ticket types can include:

- Standard
- VIP
- Early bird
- Balcony
- Orchestra
- Zone A / Zone B
- Table / loge
- General admission

If the event has multiple sessions or dates, each session should be shown clearly.

### 4.3 Ticket Selection

The ticket section should allow the client to:

- Select quantity
- Select ticket type
- See remaining stock
- See price per ticket
- See service fee
- See subtotal and total

The interface must prevent confusion when ticket types are sold out or when a specific zone is no longer available.

Important behaviors:

- Disable sold-out ticket types.
- Show low-stock warnings.
- Update total price instantly.
- Keep ticket type and price breakdown visible while the client selects quantity.

### 4.4 Cart And Checkout

Checkout should be step-based and clear.

Recommended steps:

1. Cart
2. Personal information
3. Payment
4. Confirmation

Client form fields:

- First name
- Last name
- Email
- Phone number
- Attendee names, if tickets require personal assignment
- National ID or passport number, if the event requires it
- Country
- City
- Special notes, optional

Payment methods:

- Bank card
- E-wallet
- Loyalty points, if supported
- Cash order, if allowed

Cash order rules:

- The order should expire after 4 hours if not paid.
- The user should see a countdown.
- Stock should stay reserved only during the allowed window.

Checkout must show:

- Ticket subtotal
- Service fee
- Taxes, if applicable
- Payment method
- Total amount
- Expiry rule for cash orders
- Terms acceptance checkbox

### 4.5 Order Confirmation

After successful purchase, the confirmation page should feel premium and trustworthy.

It should show:

- Order reference
- Event title
- Venue
- Date and time
- Ticket types and quantities
- Total paid
- Service fee
- Buyer name
- QR code
- Download ticket button
- Email sent confirmation
- Account access link

Ticket delivery should include:

- Email
- Account dashboard
- PDF ticket
- QR code version for entrance scanning

Recommended ticket payload:

- Order reference
- Event ID
- Ticket ID
- Buyer name
- Ticket type
- Seat or zone
- Event date and time
- Validation URL

### 4.6 Client Account

The client dashboard should include:

- My tickets
- Upcoming events
- Past orders
- Refund status
- Profile information
- Saved attendees
- Notification preferences
- Support requests

Client order statuses:

- Draft
- Pending payment
- Pending confirmation
- Confirmed
- Cancelled
- Expired
- Refunded
- Checked in

## 5. Event Owner Experience

### 5.1 Owner Dashboard

The owner dashboard should highlight the operations that matter most:

- Tickets sold today
- Revenue today
- Revenue this week
- Remaining capacity
- Upcoming events
- Low-stock alerts
- Pending attendee messages
- Check-in progress
- Cash orders waiting payment
- Refund requests

### 5.2 Event Creation Wizard

The event creation flow should be guided and structured.

Suggested steps:

1. Event basics
2. Venue and schedule
3. Ticket setup
4. Sales and promotion
5. Preview and publish

Event basics:

- Title
- Subtitle
- Category
- Poster image
- Gallery images
- Description
- Language
- Age restriction
- Tags

Venue and schedule:

- Venue name
- Venue address
- City
- Event date and time
- End time
- Multiple dates or sessions
- Time zone
- Map location

Ticket setup:

- Ticket type name
- Price
- Capacity
- Sale start date
- Sale end date
- Zone or seat map
- Early bird rules
- VIP rules
- Minimum and maximum quantity
- Personalization required or not

Sales and promotion:

- Promo codes
- Discount rules
- Featured event flag
- Online sales only or online plus physical points
- Service fee visibility
- Cash payment allowed or not

Preview and publish:

- Draft preview
- Mobile preview
- Ticket preview
- QR preview
- Final validation checklist

### 5.3 Sales Dashboard

The owner should see:

- Tickets sold per day
- Revenue per day
- Revenue per ticket type
- Remaining capacity per ticket type
- Sales by channel
- Cash vs online sales
- Peak sales hours
- Conversion from visits to purchases

Charts should be simple and operational, not decorative.

### 5.4 Attendee Management

Owner should have a list of attendees with:

- Name
- Phone
- Email
- Ticket type
- Ticket status
- Check-in status
- Order reference
- Purchase time
- Notes

Owner actions:

- Export CSV
- Search attendee
- Resend ticket
- Send message
- Mark as checked in
- Flag duplicate
- View order details

### 5.5 Access Control And Scanning

The owner should have a scanning tool at the entrance.

Scanner requirements:

- QR code validation
- Duplicate detection
- Offline-safe fallback if connection is weak
- Fast green/red result
- Check-in timestamp
- Check-in operator name

Scanner statuses:

- Valid
- Already used
- Invalid
- Cancelled
- Refunded
- Unknown ticket

### 5.6 Cancellation, Postponement, And Refunds

The owner should be able to:

- Cancel event
- Postpone event
- Update venue or schedule
- Announce changes
- Trigger refund workflow

Refund rule model:

- Ticket price may be refundable if the event is cancelled by the organizer.
- Service fee should be treated separately if platform policy says it is non-refundable.
- The platform should clearly show the policy before checkout.

### 5.7 Financial Settlement

The owner should see:

- Gross revenue
- Platform fee
- Net payout
- Cash order reconciliation
- Paid vs unpaid tickets
- Refund deductions

Settlement tools:

- Request payout
- Track payout status
- Download report
- Export sales ledger

## 6. Super Admin Experience

### 6.1 Platform Dashboard

Super admin should see the whole business:

- Total events
- Active events
- Draft events
- Pending review events
- Total tickets sold
- Gross revenue
- Platform fee revenue
- Active owners
- Pending owner invites
- Pending payouts
- Open support tickets
- Reported fraud cases

### 6.2 Owner Management

Admin should manage owners with:

- Full profile
- Service domain
- Secondary domains
- Account status
- Document verification
- Payout details
- Event history
- Sales history
- Support history

Admin actions:

- Create owner
- Invite owner by email
- Resend invitation
- Reset password
- Change service domain
- Grant or revoke permissions
- Suspend account
- Reactivate account

### 6.3 Event Moderation

Every event should have a moderation state:

- Draft
- Pending review
- Approved
- Rejected
- Hidden
- Cancelled
- Completed

Admin checks:

- Correct title and date
- Correct venue
- Correct ticket prices
- Correct images
- Clear description
- Safe content
- Category matches the event
- No misleading claim

### 6.4 Platform Setup

Admin settings should include:

- Service fee per ticket
- Payment integrations
- Refund policy rules
- Cash order timeout
- Supported currencies
- Ticket categories
- Event categories
- Venue categories
- Loyalty program rules
- Physical points of sale

### 6.5 User Management

Admin should manage clients with:

- Account status
- Order history
- Refund history
- Support history
- Suspicious activity flags

Admin actions:

- Suspend user
- Reset password
- Merge duplicate accounts
- Investigate fraud
- Close support case

### 6.6 Marketing And Content

Admin should control:

- Homepage banners
- Featured events
- Category highlights
- Newsletter campaigns
- Push notifications
- Promotional messages

### 6.7 Security And Compliance

Admin should monitor:

- Fraud attempts
- Duplicate QR scans
- Abnormal refund behavior
- Login security
- Sensitive data access
- Audit trail

## 7. Reservation And Inventory Rules

The event platform needs strict inventory logic.

Rules:

- Ticket stock cannot go below zero.
- Sold-out ticket types must be disabled immediately.
- Pending checkout should hold stock for a limited time.
- Cash orders should expire after 4 hours if unpaid.
- Check-in validation must reject already used QR codes.
- If an event is cancelled, the platform must trigger a clear refund workflow.

If the event has seating or zones:

- Each seat or zone should have its own capacity.
- Zone capacity should be checked before allowing checkout.
- Reserved seats should lock immediately during payment hold.

## 8. Notifications

### Client Notifications

- Purchase confirmed
- Payment succeeded
- Cash order created
- Cash order expired
- Event changed
- Event cancelled
- Refund issued
- Ticket reminder
- QR ticket delivered

### Owner Notifications

- New sale
- Low capacity warning
- Cash order pending payment
- Event approved
- Event rejected
- Scan issue
- Refund request
- Payout approved

### Super Admin Notifications

- New owner invitation
- Pending event review
- Payout request
- Fraud flag
- Support escalation
- Duplicate scan anomaly

## 9. Recommended User Spaces

### Client Space

- Home
- Categories
- Search results
- Event detail
- Checkout
- My tickets
- Profile
- Support

### Event Owner Space

- Dashboard
- Events
- Ticket types
- Attendees
- Scanner
- Sales
- Payouts
- Messages
- Settings

### Super Admin Space

- Dashboard
- Owners
- Invitations
- Events moderation
- Users
- Payments
- Refunds
- Payouts
- Categories
- Fees
- Marketing
- Support
- Audit logs

## 10. Production Ready Checklist

The platform is production ready only if the following are true:

- Client checkout works end to end.
- QR tickets are generated and validated.
- Event owner can create, edit, publish, cancel, and scan.
- Super admin can invite and manage owners by service domain.
- Ticket stock cannot be oversold.
- Cash order expiry is enforced.
- Refund policy is visible before checkout.
- Email delivery works for tickets and invitations.
- Support and audit logs are available.
- Mobile layout is clean and responsive.

## 11. Ideal End-to-End Scenario

1. Super admin creates a partner owner account.
2. Admin selects the service domain, for example concert promoter, hotel partner, or restaurant partner.
3. Admin assigns permissions and sends an invitation email.
4. Owner opens the email, sets a password, and completes the profile.
5. Admin verifies the account and activates it.
6. Owner creates an event in draft.
7. Owner adds ticket types, prices, capacities, schedule, and images.
8. Admin reviews and approves the event.
9. Event becomes visible to clients.
10. Client searches and opens the event page.
11. Client selects ticket type and quantity.
12. Client checks out and pays.
13. System issues a QR ticket and sends confirmation email.
14. Owner sees the sale in the dashboard.
15. On event day, owner scans tickets at the entrance.
16. Duplicate tickets are rejected.
17. After the event, owner downloads reports.
18. Admin oversees payouts, support, and compliance.

## 12. MVP Then Pro Roadmap

### MVP

Client:

- Search
- Event detail page
- Ticket selection
- Checkout
- Confirmation ticket
- Account history

Owner:

- Dashboard
- Event creation
- Ticket types
- Sales tracking
- Attendee list
- QR scanning

Super admin:

- Owner invitation
- Owner verification
- Event moderation
- Fees
- Basic support

### Pro Version

Client:

- Advanced filters
- Smart recommendations
- Calendar view
- Wallet ticket
- Push notifications

Owner:

- Seat maps
- Multi-session events
- Campaign tools
- Promo codes
- Detailed analytics
- Payout automation

Super admin:

- Commission rules
- Fraud detection
- Content moderation queue
- Audit logs
- Marketing system
- Payment reconciliation

