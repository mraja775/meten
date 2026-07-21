# Meten MVP Product Plan

Meten is an Academy CRM for sports academies. The first version exists to help academy owners and receptionists manage enquiries, student payment tracking, and simple communication.

This is not an ERP, accounting system, coaching platform, attendance product, or all-in-one academy operating system.

## Company

- Product: Meten
- Website: https://meten.com
- Target customer: sports academies
- Primary user: academy owner
- Secondary user: receptionist or staff member
- Ignored users for MVP: students, parents, coaches

## MVP Objective

Win the first three paying academies by solving three problems exceptionally well:

1. Lead management
2. Student and payment tracking
3. Simple communication

Every morning, the product should answer:

- Which new enquiries came in?
- Which leads need follow-up?
- Which students have not paid?
- Which payments are overdue?
- Who joined recently?
- What should I do today?

The dashboard is action-oriented, not analytics-oriented.

## Product Principles

- Minimal, fast, opinionated
- One primary purpose per screen
- No feature bloat
- No unnecessary configuration
- Clear workflows over customizability
- Production-quality from the first usable version

Reference product feel:

- Linear
- Stripe
- Notion
- Rippling

## Explicit Non-Goals

Do not build these in the MVP:

- Attendance
- Coach management
- Student login
- Parent login
- Timetables
- Batch scheduling
- Performance tracking
- Awards
- Certificates
- Inventory
- Payroll
- Accounting
- Multi-branch management
- Public academy website
- Admissions website
- CMS
- Drag-and-drop page builder
- Provider-integrated WhatsApp/SMS/email sending
- Advanced automation

The public academy website is intentionally deferred to a separate product phase.

## Navigation

The left navigation must contain only:

- Dashboard
- Leads
- Students
- Payments
- Messages
- Settings

Nothing else.

## Modules

### Dashboard

Purpose: answer "What should I do today?"

Cards:

- New Leads
- Pending Follow Ups
- Trials Scheduled
- Pending Payments
- Overdue Payments
- Recent Admissions

Sections:

- Quick Actions
  - Add Lead
  - Record Payment
  - Send Message
  - Create Student
- Recent Activity
- Today's Tasks

### Leads

Purpose: simple CRM pipeline.

Fields:

- Name
- Phone
- Email
- Parent Name
- Student Age
- Source
- Status
- Notes
- Follow Up Date
- Assigned To

Statuses:

- New
- Contacted
- Trial Scheduled
- Trial Completed
- Joined
- Lost

Views:

- Kanban
- Table

Features:

- Search
- Filter
- Convert lead to student
- Lead activity timeline

### Students

Purpose: track admitted students and their payment context.

Fields:

- Full Name
- Guardian Name
- Phone
- Email
- Joining Date
- Status
- Notes
- Linked Payments
- Timeline

Excluded:

- Attendance
- Performance
- Awards
- Coaching history

### Payments

Purpose: track who owes money.

This is not accounting software.

Fields:

- Student
- Amount
- Due Date
- Paid Date
- Status
- Receipt Number
- Notes

Statuses:

- Pending
- Paid
- Overdue

Dashboard surfaces:

- Payments due today
- Payments overdue
- Collected this month
- Upcoming renewals

### Messages

Purpose: simple communication history and message composition.

No provider integrations initially. The architecture should make later integrations possible.

Message types:

- WhatsApp
- SMS
- Email

Recipients:

- Single student
- Multiple students
- Entire academy

Templates:

- Payment Reminder
- Trial Reminder
- Admission Follow-up
- Custom Message

Store message history.

### Settings

Fields:

- Academy Name
- Logo
- Address
- Phone
- Email
- Business Hours
- Brand Colors

Settings are owner-only in the MVP.

## User Personas

### Academy Owner

Owns and operates the academy. Checks Meten daily for enquiries, unpaid fees, admissions, and staff follow-ups.

Needs:

- Today's action list
- Lead pipeline visibility
- Overdue payment visibility
- Recently joined students
- Simple staff workflow

### Receptionist or Staff

Handles enquiries, follow-up calls, lead updates, payments, and reminders.

Needs:

- Add leads quickly
- Update statuses
- Set follow-up dates
- Convert leads to students
- Record payments
- Send or record reminders

## Core Journeys

### New Enquiry to Follow-Up

1. Staff manually adds a lead.
2. Lead appears as New.
3. Dashboard shows it under New Leads.
4. Staff contacts parent.
5. Status changes to Contacted.
6. Follow-up date is set.
7. Lead appears in Today's Tasks on the follow-up date.

### Trial to Admission

1. Staff moves lead to Trial Scheduled.
2. Trial appears on the dashboard.
3. After trial, status changes to Trial Completed.
4. If the student joins, staff converts the lead to a student.
5. Student record is created.
6. Lead status becomes Joined.
7. Recent Admissions updates.

### Payment Due

1. Student has a pending payment with a due date.
2. Dashboard shows it under Pending Payments.
3. If the due date passes, payment is treated as Overdue.
4. Staff records payment.
5. Payment becomes Paid.
6. Student timeline records the payment.

### Message Reminder

1. Staff opens Messages.
2. Selects a template.
3. Selects recipients.
4. Chooses WhatsApp, SMS, or Email.
5. Sends later or records the message intent.
6. Message history is stored.

## Roadmap

### Phase 0: Foundation

- Next.js 15
- TypeScript
- Tailwind CSS
- shadcn/ui-compatible component structure
- Prisma
- PostgreSQL
- Owner OTP authentication
- App shell
- Left navigation
- Health endpoint
- Docker setup
- README

### Phase 1: Database and Seed Data

- Prisma schema
- Migrations
- Soft-delete conventions
- Tenant-scoped helpers
- Demo academy seed
- 30 leads
- 100 students
- 75 payments

### Phase 2: Dashboard

- Dashboard summary API
- Today's tasks
- Recent activity
- Quick actions
- Payment and lead metrics
- Tests

### Phase 3: Leads

- Lead CRUD
- Validation
- Kanban view
- Table view
- Search and filters
- Lead detail
- Activity timeline
- Convert lead to student
- Tests

### Phase 4: Students

- Student CRUD
- Student detail
- Linked payments
- Timeline
- Search
- Tests

### Phase 5: Payments

- Payment CRUD
- Mark paid
- Pending/Paid/Overdue filters
- Dashboard integration
- Monthly collected metric
- Tests

### Phase 6: Messages

- Message composer
- Templates
- Recipient selector
- Message history
- Store-only send architecture
- Tests

### Phase 7: Settings

- Academy settings form
- Logo upload architecture
- Contact details
- Business hours
- Brand colors
- Owner-only access
- Tests

### Phase 8: Production Hardening

- Playwright E2E
- Error handling
- Structured logging
- Accessibility pass
- Responsive QA
- Docker production setup
- One-command deployment
- Final README
