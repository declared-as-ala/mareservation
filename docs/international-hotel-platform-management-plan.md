# International Hotel Reservation Platform Management Plan

This document is the product blueprint for a high-level hotel reservation platform. It covers the three main participants:

- Client: the person searching and reserving a hotel room.
- Hotel owner: the hotel partner who manages rooms, pricing, availability, reservations, clients, and revenue.
- Super admin: the platform owner who manages the full marketplace, quality, commissions, payouts, disputes, and growth.

The goal is to build an experience that feels professional like international reservation platforms: clear search, strong room presentation, safe reservation flow, QR ticket confirmation, powerful owner tools, and strict super admin control.

## 1. Product Vision

The platform should not be only a hotel listing website. It should be a complete reservation operating system.

Core promises:

- Clients can discover hotels, compare rooms, reserve safely, receive a professional confirmation ticket, and manage their booking.
- Hotel owners can control inventory, block rooms, update prices, manage reservations, and avoid double bookings.
- Super admin can control the marketplace, validate hotels, manage money, resolve disputes, and maintain quality.

## 2. Main Participants

### Client

The client wants:

- Find a hotel fast.
- See real photos, room details, price, policies, and availability.
- Reserve without confusion.
- Receive proof of reservation.
- Modify, cancel, or contact support when needed.

### Hotel Owner

The hotel owner wants:

- Manage rooms and suites.
- Block unavailable rooms or maintenance periods.
- Accept or reject booking requests if manual confirmation is enabled.
- See check-ins, check-outs, revenue, occupancy, and pending tasks.
- Manage room prices, photos, 360 views, amenities, policies, and promotions.

### Super Admin

The super admin wants:

- Control the full platform.
- Approve hotels and owners.
- Monitor all reservations and revenue.
- Manage commissions, payouts, disputes, fraud, content quality, and platform settings.

## 3. Client Experience

### 3.1 Client Discovery Flow

The client should enter the platform and immediately understand what to do.

Search inputs:

- Destination or hotel name.
- Check-in date.
- Check-out date.
- Number of adults.
- Number of children.
- Children ages, if children are selected.
- Number of rooms.
- Optional filters: price, stars, amenities, hotel type, breakfast included, free cancellation, 360 experience, sea view, pool, parking, family rooms.

Search results should show:

- Hotel photo.
- Hotel name.
- City and address area.
- Star rating or category.
- Review score.
- Starting price.
- Available room count for selected dates.
- Main benefits: free cancellation, breakfast, parking, 360 view.
- Clear button: "Voir les chambres" or "Reserve".

Important behavior:

- If dates are missing, show "Choose dates to see exact availability".
- If dates are selected, show only actually available rooms.
- If no availability, show "No rooms available for these dates" and suggest nearby dates.

### 3.2 Hotel Detail Page

The hotel detail page should be designed for trust and conversion.

Top section:

- Compact hotel photo hero.
- Hotel name.
- City and address.
- Rating or category.
- Number of rooms and suites available for selected dates.
- Quick CTA: "Reserve now" or "Voir les chambres".
- Save/favorite button.
- Share button.

Main content should show:

- Photo gallery on the left or as a strong visual rail.
- Rooms and suites first, because clients mostly reserve rooms.
- Practical information and overview in a side panel.
- Map location.
- Amenities.
- Policies.
- Reviews.
- Similar hotels.

Room card should show:

- Room image.
- Room name.
- Room type.
- Price per night.
- Total price for selected stay.
- Capacity.
- Bed type.
- Surface.
- Included amenities.
- Cancellation rule.
- Breakfast or meal plan.
- Availability warning, for example "Only 2 left".
- Button: "View room" or "Reserve".

Room card should not squeeze text. On desktop, show two room cards per row only if there is enough width. On smaller width, show one card per row.

### 3.3 Room Detail Page

The room page should feel premium and useful.

Top:

- Large room photo or 360 experience.
- Gallery thumbnails on the left.
- Room name.
- Room number or room category, if public.
- Price.
- Availability.
- Main CTA: "Reserve this room".

Details:

- Capacity.
- Bed type.
- Surface.
- Bathroom info.
- View type: sea view, garden view, pool view.
- Amenities.
- 360 experience.
- Cancellation policy.
- Payment policy.
- Check-in and check-out times.
- Extra bed or children policy.

## 4. Client Reservation Flow

The reservation flow should be clear, step-based, and professional.

Recommended checkout steps:

1. Stay details.
2. Room and rate confirmation.
3. Guest information.
4. Extras and preferences.
5. Payment and confirmation.
6. Reservation ticket.

### 4.1 Step 1: Stay Details

Fields:

- Check-in date.
- Check-out date.
- Number of nights, calculated automatically.
- Adults.
- Children.
- Children ages.
- Number of rooms.
- Promo code.

UI behavior:

- Date picker should disable blocked or unavailable dates.
- If a selected date becomes unavailable, show a clear message.
- Price should update immediately when dates or guests change.
- Client should see cancellation policy before continuing.

### 4.2 Step 2: Room And Rate Confirmation

Show:

- Hotel name.
- Room name.
- Room photo.
- Dates.
- Guest count.
- Room count.
- Price per night.
- Taxes and fees.
- Discount.
- Total price.
- Payment option: pay now, deposit, or pay at hotel.
- Cancellation deadline.
- Included benefits: breakfast, free parking, spa access, etc.

Client action:

- Button: "Continue".
- Secondary action: "Change room".

### 4.3 Step 3: Guest Information Form

Exact fields:

- First name.
- Last name.
- Email.
- Phone number.
- Country.
- City, optional.
- Main guest is same as booker: checkbox.
- Guest first name, if different.
- Guest last name, if different.
- Estimated arrival time.
- Special requests, optional.
- Need baby bed: checkbox, optional.
- Need extra bed: checkbox, optional.
- Accessibility request: optional.
- Accept hotel policies: required checkbox.
- Accept platform terms: required checkbox.

Optional identity fields depending on hotel policy:

- Passport or ID number.
- Nationality.
- Date of birth.

Validation:

- Email must be valid.
- Phone must be valid.
- Required fields must be visible with clear errors.
- Policy checkboxes must be accepted before payment.

### 4.4 Step 4: Extras And Preferences

Possible extras:

- Breakfast.
- Half-board.
- Airport transfer.
- Spa package.
- Romantic decoration.
- Late check-out.
- Early check-in.
- Parking.
- Baby cot.
- Extra bed.

Each extra should show:

- Name.
- Description.
- Price.
- Per person, per night, or once.
- Quantity selector if needed.

### 4.5 Step 5: Payment

Payment methods:

- Online card payment.
- Deposit payment.
- Pay at hotel.
- Wallet or local payment method, if supported.

Payment section should show:

- Total amount.
- Amount paid now.
- Remaining amount to pay at hotel.
- Refundability.
- Secure payment message.
- Billing details if needed.

Reservation should not be final until one of these happens:

- Payment succeeds.
- Deposit succeeds.
- Pay-at-hotel reservation is confirmed by rules.
- Hotel owner accepts the request, if manual approval is enabled.

### 4.6 Step 6: Confirmation And Ticket

After successful reservation, show a professional confirmation page.

Confirmation page should show:

- Success state: "Reservation confirmed" or "Reservation request sent".
- Reservation reference code, example: MR-2026-000184.
- QR code.
- Hotel name.
- Room name.
- Check-in and check-out dates.
- Number of nights.
- Guest name.
- Guest count.
- Total price.
- Paid amount.
- Remaining amount.
- Hotel address.
- Hotel phone.
- Map button.
- Cancellation policy.
- Check-in instructions.
- Button: "Download ticket PDF".
- Button: "Add to calendar".
- Button: "Contact hotel".
- Button: "View my reservations".

The QR code should contain or resolve to:

- Reservation reference.
- Secure reservation verification URL.
- Check-in status.
- Payment status.
- Guest name.
- Room reserved.

Ticket PDF should include:

- Platform logo.
- Hotel logo or hotel name.
- Reservation reference.
- QR code.
- Client details.
- Stay details.
- Room details.
- Payment details.
- Important policies.
- Support contact.

Email/SMS/WhatsApp notification:

- Send confirmation to client.
- Send new reservation alert to hotel owner.
- Store confirmation in client account.

### 4.7 Reservation Statuses For Client

Client should see statuses:

- Draft: checkout started but not completed.
- Pending payment: waiting for payment.
- Pending hotel approval: hotel must accept.
- Confirmed: reservation is valid.
- Checked-in: client arrived.
- Checked-out: stay completed.
- Cancelled by client.
- Cancelled by hotel.
- Cancelled by admin.
- No-show.
- Refunded.

## 5. Hotel Owner Experience

### 5.1 Hotel Owner Dashboard

The owner dashboard should show operational information first.

Top cards:

- Reservations today.
- Check-ins today.
- Check-outs today.
- Occupied rooms.
- Available rooms.
- Pending requests.
- Monthly revenue.
- Occupancy rate.
- Cancellation rate.
- New reviews.

Important alerts:

- Rooms missing photos.
- Rooms with no price.
- Rooms with no availability.
- Pending booking requests.
- Upcoming check-ins.
- Overbooking risk.
- Payout pending.
- Content rejected by admin.

### 5.2 Reservation Management

Views:

- Today view.
- List view.
- Calendar view.
- Room timeline view.
- Kanban by status.

Reservation table columns:

- Reference code.
- Client name.
- Room.
- Check-in.
- Check-out.
- Nights.
- Guests.
- Total amount.
- Payment status.
- Reservation status.
- Source: platform, manual, admin, owner.
- Actions.

Actions:

- Accept reservation.
- Reject reservation.
- Assign room.
- Change room.
- Modify dates.
- Mark as paid.
- Mark as checked-in.
- Mark as checked-out.
- Cancel reservation.
- Mark as no-show.
- Add internal note.
- Contact client.
- Print ticket.
- Scan QR code.

### 5.3 Room And Suite Management

For each room or room type:

- Room name.
- Room number.
- Room type.
- Capacity adults.
- Capacity children.
- Bed type.
- Surface.
- Base price.
- Gallery photos.
- 360 images.
- Amenities.
- Description.
- Status.
- Inventory count, if managing room categories.

Room statuses:

- Available.
- Reserved.
- Occupied.
- Maintenance.
- Blocked by owner.
- Disabled.
- Hidden from public.

Owner actions:

- Add room.
- Edit room.
- Duplicate room.
- Delete or archive room.
- Disable public visibility.
- Add photos.
- Add 360 view.
- Change amenities.
- Change price.
- Put room under maintenance.
- Block room for a date range.
- Create manual reservation.

### 5.4 Blocking Rooms And Availability Control

This is critical. Hotel owner must be able to prevent clients from reserving unavailable rooms.

Owner should be able to block:

- One specific room.
- A room category.
- Multiple rooms.
- A full hotel date range.
- One night.
- Several nights.
- Recurring periods, for example every Monday.

Block reasons:

- Maintenance.
- Private event.
- Owner hold.
- Cleaning.
- Renovation.
- Staff use.
- Offline booking.
- Emergency.

Block form fields:

- Room or room category.
- Start date.
- End date.
- Start time, optional.
- End time, optional.
- Reason.
- Internal note.
- Visible to client: yes/no.
- Automatically reopen after end date: yes/no.

Client behavior:

- Blocked dates must appear unavailable.
- Client cannot select blocked dates.
- If all rooms are blocked, hotel appears unavailable.
- If only one room is blocked but other rooms are available, client can reserve another room.

Owner calendar behavior:

- Blocks appear as colored bars.
- Reservations appear as different colored bars.
- Maintenance blocks can be edited or removed.
- Manual reservations can be created directly on the calendar.
- Dragging a reservation to another room should check availability first.

### 5.5 Manual Reservation By Hotel Owner

Owner should be able to reserve a room manually when a client calls or books offline.

Manual reservation form:

- Client first name.
- Client last name.
- Phone.
- Email, optional.
- Room.
- Check-in.
- Check-out.
- Guest count.
- Price.
- Payment status.
- Deposit amount.
- Notes.
- Source: phone, walk-in, WhatsApp, agency, other.

Important rule:

- Manual reservation must block that room for the selected period so online clients cannot reserve it.

### 5.6 Pricing Management

Owner should manage:

- Base room price.
- Weekend price.
- Seasonal price.
- Holiday price.
- Minimum nights.
- Maximum nights.
- Last-minute discount.
- Early booking discount.
- Promo codes.
- Packages.

Pricing calendar actions:

- Select date range.
- Apply price.
- Apply discount.
- Close sales.
- Open sales.
- Set minimum stay.

### 5.7 Hotel Profile And Content

Owner can edit:

- Hotel name.
- Description.
- Address.
- Map location.
- Phone.
- Email.
- WhatsApp.
- Stars or category.
- Amenities.
- Policies.
- Check-in and check-out time.
- Cover image.
- Gallery photos.
- 360 tour.

Some changes may require super admin approval:

- Hotel name.
- Address.
- Ownership documents.
- Main cover photo.
- Star/category claims.

### 5.8 Owner Reports

Reports:

- Daily reservations.
- Monthly revenue.
- Occupancy rate.
- Revenue by room.
- Average daily rate.
- Cancellation report.
- No-show report.
- Client origin.
- Best rooms.
- Low-performing rooms.

## 6. Super Admin Experience

### 6.1 Super Admin Dashboard

Top cards:

- Total hotels.
- Active hotels.
- Pending hotel approvals.
- Total clients.
- Reservations today.
- Monthly booking volume.
- Platform commission.
- Pending payouts.
- Open disputes.
- Reported reviews.

Admin alerts:

- Hotel pending approval.
- Suspicious reservation.
- Failed payment.
- Payout waiting approval.
- Owner blocked too many reservations.
- Hotel with low rating.
- Client complaint.
- Content quality issue.

### 6.2 Hotel Approval And Management

Hotel statuses:

- Draft.
- Pending review.
- Approved.
- Active.
- Rejected.
- Suspended.
- Hidden.
- Featured.

Admin actions:

- Approve hotel.
- Reject hotel.
- Request changes.
- Suspend hotel.
- Feature hotel.
- Edit hotel.
- View as owner.
- View public page.
- Check documents.
- Manage commission.
- Manage payout status.

Approval checklist:

- Hotel owner identity verified.
- Hotel documents uploaded.
- Address valid.
- Phone valid.
- At least one room exists.
- Room has price.
- Room has photos.
- Policies are defined.
- Images are good quality.
- No misleading content.

### 6.3 Owner Management

Owner profile:

- Name.
- Email.
- Phone.
- Verification status.
- Hotels owned.
- Revenue generated.
- Commission due.
- Payout account.
- Account status.

Actions:

- Approve owner.
- Suspend owner.
- Reset password.
- Change role.
- Assign hotel.
- View activity log.
- Contact owner.

### 6.4 Platform Reservation Oversight

Super admin can see all reservations.

Filters:

- Hotel.
- Owner.
- Client.
- City.
- Date range.
- Reservation status.
- Payment status.
- Source.
- Amount.

Actions:

- View reservation.
- Force cancel.
- Refund.
- Change status with reason.
- Contact hotel.
- Contact client.
- Add admin note.
- Resolve dispute.
- Download ticket.
- Verify QR code.

### 6.5 Commission And Payouts

Commission models:

- Percentage per booking.
- Fixed fee per booking.
- Monthly subscription.
- Featured listing fee.
- Hybrid model.

Payout statuses:

- Pending.
- Approved.
- Paid.
- Failed.
- On hold.

Payout workflow:

1. Reservation is completed or payment is captured.
2. Platform calculates commission.
3. Net amount is added to hotel payout balance.
4. Super admin reviews payout.
5. Super admin approves payout.
6. Hotel owner receives payout.
7. System stores receipt and audit log.

### 6.6 Content Moderation

Admin moderates:

- Hotel photos.
- Room photos.
- 360 images.
- Descriptions.
- Reviews.
- Owner replies.
- Promotions.

Moderation decisions:

- Approve.
- Reject.
- Request better quality.
- Hide.
- Flag for investigation.

### 6.7 Support And Disputes

Dispute examples:

- Client says hotel refused confirmed reservation.
- Hotel says client did not show.
- Client requests refund.
- Wrong room was given.
- Payment failed but booking exists.
- Hotel photos are misleading.
- Owner cancelled too many bookings.

Support case fields:

- Case ID.
- Reservation reference.
- Client.
- Hotel.
- Owner.
- Priority.
- Status.
- Assigned admin.
- Messages.
- Evidence files.
- Resolution.

Statuses:

- Open.
- Waiting client.
- Waiting hotel.
- Waiting payment provider.
- Escalated.
- Resolved.
- Closed.

### 6.8 Audit Logs

Every sensitive action must be logged.

Track:

- Who changed room price.
- Who blocked a room.
- Who removed a block.
- Who accepted reservation.
- Who cancelled reservation.
- Who approved payout.
- Who changed commission.
- Who suspended hotel.
- Who edited platform settings.

Audit log fields:

- Actor.
- Role.
- Action.
- Entity.
- Before value.
- After value.
- Date and time.
- IP address.
- Reason.

## 7. Reservation And Availability Rules

### 7.1 No Double Booking Rule

The platform must never allow two confirmed reservations for the same physical room and date range.

Availability should consider:

- Confirmed reservations.
- Pending reservations with temporary hold.
- Owner manual reservations.
- Owner blocks.
- Maintenance periods.
- Admin blocks.

### 7.2 Temporary Hold During Checkout

When a client starts payment, the room should be temporarily held.

Recommended hold:

- 10 to 15 minutes.

If payment succeeds:

- Convert hold to confirmed reservation.

If payment fails or timer expires:

- Release the hold.

### 7.3 Manual Approval Mode

Some hotels may not want auto-confirmation.

Modes:

- Auto-confirm: reservation confirms immediately if available and payment rule is satisfied.
- Manual approval: client sends request, owner has a limited time to accept.
- Deposit required: client pays deposit, hotel confirms.

Manual approval time limit:

- Example: owner must answer within 2 hours.
- If no answer, admin can intervene or reservation expires.

## 8. Notifications

### Client Notifications

Send notifications for:

- Reservation confirmed.
- Reservation request sent.
- Payment successful.
- Payment failed.
- Hotel accepted reservation.
- Hotel rejected reservation.
- Check-in reminder.
- Cancellation confirmed.
- Refund processed.
- Review request.

### Hotel Owner Notifications

Send notifications for:

- New reservation.
- New request pending approval.
- Payment received.
- Client cancelled.
- Check-in today.
- Check-out today.
- New review.
- Payout processed.
- Admin requested content change.

### Super Admin Notifications

Send notifications for:

- Hotel approval pending.
- Dispute opened.
- Suspicious activity.
- Payout pending approval.
- Failed payment.
- High cancellation hotel.
- Reported review.

## 9. Recommended Sidebars

### Client Account

- My reservations.
- Favorites.
- Profile.
- Payment methods.
- Notifications.
- Support.

### Hotel Owner Espace

- Dashboard.
- Reservations.
- Calendar.
- Rooms and Suites.
- Availability Blocks.
- Pricing.
- Gallery and 360.
- Clients.
- Reviews.
- Payments.
- Reports.
- Staff.
- Hotel Settings.

### Super Admin Espace

- Dashboard.
- Hotels.
- Owners.
- Clients.
- Reservations.
- Payments.
- Payouts.
- Commissions.
- Reviews.
- Support and Disputes.
- Content Moderation.
- Marketing.
- Reports.
- Platform Settings.
- Audit Logs.

## 10. MVP Then Pro Roadmap

### MVP

Client:

- Search hotels.
- Hotel detail page.
- Room detail page.
- Reservation form.
- Confirmation page with reservation reference.
- Client reservation history.

Hotel owner:

- Dashboard.
- Reservations.
- Rooms.
- Block room dates.
- Manual reservation.
- Basic pricing.
- Hotel profile.

Super admin:

- Dashboard.
- Hotel approval.
- Owner management.
- Reservation oversight.
- Basic commission.
- Basic payout tracking.

### Pro Version

Client:

- QR ticket.
- PDF ticket.
- Add to calendar.
- Reviews.
- Favorites.
- Advanced filters.
- Loyalty points.

Hotel owner:

- Advanced calendar.
- Seasonal pricing.
- Promotions.
- Staff permissions.
- Revenue reports.
- QR check-in scanner.
- Advanced client CRM.

Super admin:

- Automated payouts.
- Dispute center.
- Advanced analytics.
- Fraud detection.
- Audit logs.
- Marketing campaigns.
- Content moderation queue.

## 11. Ideal End-To-End Scenario

1. Hotel owner creates account.
2. Owner submits hotel documents.
3. Super admin verifies and approves owner.
4. Owner creates hotel profile.
5. Owner adds rooms, photos, 360 views, amenities, prices, and policies.
6. Super admin reviews content quality.
7. Hotel becomes active.
8. Client searches destination and dates.
9. Client opens hotel page.
10. Client compares rooms.
11. Client opens room detail page.
12. Client selects dates, guests, and extras.
13. Client fills guest form.
14. Client pays online or chooses allowed payment option.
15. Platform temporarily holds room during checkout.
16. Payment succeeds.
17. Reservation becomes confirmed.
18. Client sees ticket with QR code.
19. Client receives email/SMS/WhatsApp confirmation.
20. Hotel owner receives new reservation notification.
21. Room is blocked for that date range.
22. Client arrives at hotel.
23. Reception scans QR code.
24. Reservation is verified.
25. Owner marks checked-in.
26. Owner marks checked-out after stay.
27. Platform calculates commission.
28. Super admin approves payout.
29. Client receives review request.
30. Hotel owner replies to review.

## 12. Key Professional Standard

The platform must feel trustworthy at every step.

Must-have qualities:

- No confusing reservation states.
- No double booking.
- Clear price breakdown.
- Clear cancellation policy.
- Strong room photos.
- Professional ticket with QR code.
- Owner calendar that controls availability.
- Super admin audit logs.
- Fast support path for disputes.
- Mobile-first responsive interfaces.

