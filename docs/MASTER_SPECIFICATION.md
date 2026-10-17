# MASTER SOFTWARE ENGINEERING PROMPT
## E-11 HOSTEL — Enterprise Smart Hostel Management Portal & AI System

### YOUR ROLE

You are an elite, multidisciplinary software engineering team operating as a single autonomous coding agent.

Act simultaneously as:

- Principal Full-Stack Software Engineer
- Senior React / Next.js Frontend Architect
- Senior Python FastAPI Backend Engineer
- PostgreSQL Database Architect
- Object-Oriented Software Design Expert
- Senior UI/UX Product Designer
- Application Security Engineer
- DevSecOps / Cloud Infrastructure Engineer
- AI / RAG Systems Engineer
- Software Quality Assurance Engineer
- Technical Product Architect

Your responsibility is to **design, architect, implement, test, document, and prepare for deployment a complete, professional, secure, maintainable Hostel Management SaaS-style platform** called:

**E-11 HOSTEL — Smart Management Portal & AI System**

Tagline: **Safe Stay. Better Tomorrow.**

This is not a landing-page-only project, a dashboard mockup, or a collection of disconnected UI components.

It must be a functioning full-stack application with real business logic, database persistence, authentication, authorization, role-based dashboards, financial workflows, booking management, room allocation, complaint management, mess management, transport management, reporting, and AI integration architecture.

The application will initially use realistic demonstration data, which must be easily replaceable with actual hostel information later.

**Critical requirement: Student attendance is intentionally excluded. Do not implement any student attendance page, feature, table, API, navigation item, analytics metric, or attendance-related business workflow anywhere in the system.**

---

# PART 1 — VISUAL DESIGN AND UI/UX REQUIREMENTS

## 1.1 Reference Design

I will provide an image named `design-reference.png`.

This image represents the visual design direction for the complete application.

You must inspect this image before implementing the frontend.

Reproduce its visual language as faithfully as possible:

- Dark navy-blue overall theme
- Premium electric-blue highlights
- Elegant dashboard cards
- Modern white/light content panels
- Dark blue gradient page headers
- Professional SaaS-style layouts
- Rounded navigation components
- Subtle shadows
- Clean typography
- Data-rich dashboard layouts
- Color-coded operational statuses
- Interactive charts
- Attractive metric cards
- Modern sidebar navigation
- Premium-looking tables
- Professional icons
- Visually structured floor maps
- Smooth transitions and hover states
- Consistent desktop, tablet, and mobile designs

The image is a visual design reference, not a requirement to display all modules on one page.

**Each section shown in the reference must become its own fully navigable, detailed, functional page.**

Do not generate one static collage.

Do not substitute an unrelated generic admin template.

If the reference image is unavailable, follow the design specification below and clearly mention the absence of the reference in your final implementation report.

## 1.2 Design Tokens

Use approximately the following design system:

| Element | Color |
|---|---|
| Primary background | `#071A35` |
| Secondary navy | `#0D2A52` |
| Electric blue | `#1677FF` |
| Bright blue accent | `#4C9AFF` |
| Light page background | `#F4F7FB` |
| White surface | `#FFFFFF` |
| Primary text | `#17233B` |
| Secondary text | `#6D7A91` |
| Success | `#16A66A` |
| Error | `#E84B5B` |
| Warning | `#E8A600` |
| Unverified | `#8454D8` |
| Border | `#E5EAF2` |

Create shared theme tokens rather than hardcoding colors throughout the application.

Use modern typography such as Inter.

Use Lucide icons consistently.

Use professional card spacing, border radii, table density, and typography hierarchy.

## 1.3 Responsive Design

The platform must support:

1. Large desktop monitors
2. Standard laptops
3. Tablets
4. Android mobile devices
5. iPhones

Desktop navigation should feature a collapsible dark sidebar.

Mobile navigation should use an appropriately designed drawer or compact navigation interface.

No horizontal overflow or broken dashboard components should appear at normal viewport sizes.

All major tables must provide responsive behavior, search, filtering, and pagination.

Charts must adapt to smaller screens.

The application should be designed mobile-first where practical without compromising desktop information density.

## 1.4 Professional Interaction Design

Implement:

- Skeleton loading states
- Empty states
- Search interfaces
- Filter controls
- Modal dialogs
- Confirmation dialogs
- Form validation
- Toast notifications
- Success/error feedback
- Pagination
- Keyboard-accessible controls
- Status badges
- Tooltips
- Navigation breadcrumbs
- Dark/light mode where practical
- Consistent interaction patterns

Animations must remain subtle and should respect reduced-motion preferences.

Meet WCAG 2.2 AA accessibility standards where practical.

---

# PART 2 — TECHNOLOGY STACK

## 2.1 Frontend

Use:

- Next.js App Router
- React
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui or equivalent accessible component primitives
- Lucide React icons
- Recharts for analytics
- TanStack Query for server-state management
- React Hook Form
- Zod for form validation
- Zustand only if lightweight global client state is genuinely needed

Use modern Next.js architectural conventions.

Separate server and client components appropriately.

Create reusable components instead of duplicating interfaces.

Do not introduce unnecessary frontend dependencies.

## 2.2 Backend

Use:

- Python 3.12 or later, using a supported version
- FastAPI
- Pydantic v2
- SQLAlchemy 2.x
- Alembic
- PostgreSQL
- Redis when needed for caching, rate limiting, queues, and temporary state
- A reliable background task worker such as Celery when appropriate
- Object storage abstraction for uploaded documents
- Structured Python logging

The backend must use professional Object-Oriented Programming architecture.

## 2.3 Backend Design Principles

Follow:

- OOP principles
- SOLID principles
- Separation of concerns
- Dependency inversion
- Dependency injection
- Repository pattern where beneficial
- Service layer pattern
- Domain-oriented modular organization
- Interface segregation
- Composition over inheritance
- DRY
- KISS
- Explicit transaction boundaries
- Type hints
- Testable service classes

Avoid unnecessarily complicated abstraction layers.

The goal is enterprise-level maintainability, not architectural overengineering.

Use a well-organized modular monolith as the initial architecture.

Do not create microservices without a justified requirement.

## 2.4 Suggested Backend Organization

```text
backend/
  app/
    main.py
    core/
      config.py
      security.py
      permissions.py
      exceptions.py
      logging.py
      dependencies.py
    database/
      base.py
      session.py
      migrations/
    modules/
      authentication/
      users/
      roles/
      students/
      rooms/
      beds/
      bookings/
      invoices/
      payments/
      payment_verification/
      complaints/
      mess/
      transport/
      notifications/
      analytics/
      ai_assistant/
      document_management/
      audit_logs/
      settings/
    shared/
      schemas/
      services/
      repositories/
      utilities/
    workers/
    tests/
  pyproject.toml
```

Each business module should contain appropriate models, schemas, repositories, services, and API routers.

Example:

```text
modules/payments/
  models.py
  schemas.py
  repository.py
  service.py
  router.py
  exceptions.py
  tests/
```

Create classes such as:

- `StudentService`
- `RoomService`
- `BedAllocationService`
- `BookingService`
- `InvoiceService`
- `PaymentService`
- `PaymentVerificationService`
- `ComplaintService`
- `MessService`
- `TransportService`
- `NotificationService`
- `AnalyticsService`
- `AuditLogService`
- `AIKnowledgeService`

Services must contain actual business logic, rather than just forwarding requests between routers and repositories.

## 2.5 Frontend Organization

```text
frontend/
  src/
    app/
      (public)/
      (auth)/
      (student)/
      (warden)/
      (owner)/
    components/
      ui/
      layout/
      dashboard/
      charts/
      forms/
      tables/
      floor-map/
      payments/
      ai/
    features/
      authentication/
      bookings/
      students/
      rooms/
      payments/
      complaints/
      mess/
      transport/
      reports/
      settings/
    hooks/
    lib/
      api/
      auth/
      schemas/
      utils/
    types/
    config/
    styles/
  public/
```

Adopt feature-based frontend organization.

Implement a shared design system and reusable feature components.

Avoid giant components containing thousands of lines.

---

# PART 3 — SYSTEM ROLES AND ACCESS CONTROL

Create four distinct roles:

1. Owner / Super Administrator
2. Warden / Operations Manager
3. Assistant Warden
4. Student

Visitors must also be able to access the public website without authentication.

## 3.1 Owner / Super Administrator

The owner has complete authorized control over:

- All hostel settings
- Student accounts
- Booking approvals
- Floor configurations
- Rooms and beds
- Prices
- Monthly invoices
- Payment verification
- Financial corrections
- Late fees
- Refund approvals
- Revenue analytics
- Outstanding dues
- Complaints
- Mess management
- Transportation
- Staff accounts
- Role permissions
- AI knowledge base
- Security settings
- Audit logs
- Reports
- Payment integrations
- Notifications

High-risk financial operations must require additional confirmation and, where appropriate, recent MFA authentication.

## 3.2 Warden

The warden should manage authorized operational functions:

- Students and allocated rooms
- Booking operations
- Room availability
- Complaints
- Mess
- Transportation
- Operational reports
- Maintenance issues
- Student move-in and move-out workflows

Financial access must be configurable by the owner.

The warden must not automatically inherit unrestricted permission to alter paid transactions, erase debt, or modify immutable financial records.

## 3.3 Assistant Warden

The assistant warden has strictly limited access.

Allowed:

- View assigned operational tasks
- View necessary room and resident information
- Update mess counts
- Manage assigned complaints
- Update maintenance progress
- View operational notices

Prohibited by default:

- Financial overrides
- Editing payment amounts
- Marking invoices paid
- Deleting transactions
- Changing historical payment records
- Editing rent pricing
- Creating hidden bed allocations
- Managing user roles
- Modifying audit logs
- Changing system security settings

All permissions must be enforced server-side.

Hiding buttons in the UI is not sufficient security.

## 3.4 Student

Each student can access only their own authorized account information.

Features:

- Personal dashboard
- Room information
- Monthly rent
- Invoices
- Challans
- Payment history
- Receipt uploads
- Payment status
- Complaints
- Mess menu
- Pick & drop information
- Notifications
- Profile settings
- Support requests

Students must never be able to view another student's financial information or personal documents.

## 3.5 RBAC and Object-Level Authorization

Implement a permissions model supporting:

- Role definitions
- Permission assignments
- Resource ownership
- Authorized administrative scopes
- Least privilege
- Default deny
- Object-level access control

Do not trust a role claim supplied by the browser.

Authorization decisions must use validated server-side identity and permissions.

Include automated tests proving that lower-privileged users cannot access restricted resources by directly modifying URLs or API parameters.

---

# PART 4 — PUBLIC HOSTEL WEBSITE

The public website is both a marketing interface and a booking platform.

Create a beautiful premium homepage matching the reference image.

## 4.1 Homepage

Hero section:

Title:

**Your Home Away From Home**

Subtitle:

"Comfortable rooms, modern facilities, secure living, and reliable transport for university students in Islamabad."

Display:

- High-quality hostel building imagery
- Hostel identity and logo
- Book Your Seat button
- Explore Rooms button
- 360° Tour button
- AI Assistant access
- Navigation menu

Show important facilities:

- Furnished rooms
- WiFi
- Mess
- Laundry
- Pick & drop
- Security
- Room cleaning
- Maintenance support

Use clearly labeled placeholder images until actual hostel photographs are supplied.

Do not misrepresent stock images as photographs of the actual property.

## 4.2 Room Types and Pricing

Implement these configurable initial prices:

| Room Type | Monthly Fee |
|---|---|
| 2 Seater | PKR 22,000 |
| 3 Seater | PKR 20,000 |
| 4 Seater | PKR 19,000 |
| 5 Seater | PKR 18,000 |
| 6 Seater | PKR 16,000 |

Assume these are per-student monthly prices unless configured otherwise.

Allow the owner to change prices through the admin dashboard.

Each room-type card should display:

- Image
- Room type
- Monthly price
- Included facilities
- Number of available seats
- Availability indicator
- View Details
- Book Now

Availability must eventually come directly from the database.

Never maintain separate, inconsistent availability figures for the public website and owner dashboard.

## 4.3 Room Details

Create room-detail interfaces containing:

- Images
- Optional video
- Optional 360° tour
- Room capacity
- Furnishings
- Facilities
- Pricing
- Available seats
- House rules
- Booking requirements

Photos, pricing, descriptions, and room metadata must be manageable from the owner dashboard.

## 4.4 Booking Workflow

Implement:

```text
Visitor
  ↓
Select Room Type
  ↓
Check Available Seats
  ↓
Enter Booking Details
  ↓
Validate Information
  ↓
Submit Booking Request
  ↓
Owner / Warden Review
  ↓
Approve / Reject
  ↓
Assign Room and Bed
  ↓
Student Account Activation
```

Create booking statuses:

- Draft
- Submitted
- Under Review
- Approved
- Rejected
- Cancelled
- Expired

Approval and actual bed allocation are separate operations.

A booking request must not automatically create an occupied bed.

Implement prevention of duplicate or conflicting allocations.

If temporary reservations are introduced, use explicit expiration and concurrency-safe reservation logic.

## 4.5 Additional Public Pages

Create:

- Home
- Rooms & Pricing
- Gallery
- Facilities
- About Us
- FAQ
- Contact
- Booking
- Privacy Policy
- Terms and Conditions

Provide an owner-controlled content-management capability for updating public information.

---

# PART 5 — AI HOSTEL ASSISTANT

Build a floating AI assistant closely matching the reference design.

It must be visually attractive and easy to use.

## 5.1 Public Assistant

The public assistant should answer questions about:

- Room prices
- Facilities
- Available room categories
- Mess facilities
- Pick & drop services
- Hostel location
- Booking procedures
- Refund policies
- Hostel rules
- Contact details

It should also guide visitors through booking requests.

Example:

User: "2-seater room ka monthly rent kitna hai?"

Assistant:

"2-seater room ka monthly rent Rs. 22,000 hai. Main aapko room facilities aur availability bhi bata sakta hoon."

Support English, Urdu, and Roman Urdu where practical.

## 5.2 RAG Architecture

Use Retrieval-Augmented Generation.

Knowledge sources should include:

- Approved hostel policies
- FAQs
- Facilities descriptions
- Room descriptions
- Mess policies
- Booking instructions
- Refund rules

Build:

- Document ingestion service
- Document parsing
- Text chunking
- Embedding generation
- Vector search
- Retrieval pipeline
- Response generation
- Source attribution
- Knowledge-base management interface

Prefer PostgreSQL with pgvector if suitable.

Use a configurable provider abstraction so that the LLM or embedding model can be replaced later.

Never hardcode API keys.

## 5.3 AI Safety and Authorization

The public assistant must never access:

- Private student financial records
- Student identity documents
- Internal staff details beyond approved public information
- Owner-only financial analytics
- Database credentials
- Secret configuration

Treat retrieved documents and user messages as untrusted input.

Protect against prompt injection.

All AI tools must enforce the same permissions as ordinary application APIs.

Do not allow unrestricted SQL generation or arbitrary database execution.

Require explicit confirmation for actions such as submitting a booking.

Never allow an AI answer itself to mark a payment verified.

## 5.4 Owner AI Assistant

Create a separate, authenticated administrative AI assistant.

Example owner questions:

- "How much rent was collected this month?"
- "How many seats are vacant?"
- "Which rooms have unpaid invoices?"
- "What are the most common complaints?"
- "Show monthly revenue trends."
- "Summarize the last 30 days of hostel operations."

Implement approved, typed, read-only analytical tools backed by authorized backend services.

Do not let the model freely execute SQL.

Return understandable answers supported by actual system data.

For the initial demo, use seeded data.

If no AI credentials are configured, provide clearly labeled demo responses or a deterministic FAQ fallback.

Do not pretend a real LLM has been integrated.

---

# PART 6 — STUDENT DASHBOARD

Create a dedicated student dashboard matching the visual style of the reference.

## 6.1 Dashboard Overview

Display:

- Welcome message
- Student name
- Room number
- Room category
- Monthly rent
- Current invoice
- Next due date
- Pending amount
- Payment status
- Recent transactions
- Complaint summary
- Notices
- Useful quick actions

Use visually polished metric cards.

## 6.2 My Room

Show:

- Assigned room
- Floor
- Bed number
- Room capacity
- Allocated services
- Current pricing
- Room-related notices

Only show roommate information where legitimately authorized and appropriate.

## 6.3 My Payments

Provide:

- Current invoice
- Payment history
- Download challan
- Upload receipt
- Payment processing status
- Due date
- Late charges, if applicable
- Transaction reference information

## 6.4 My Complaints

Allow students to:

- Open a ticket
- Select category
- Add a description
- Attach a photo
- Track status
- View staff responses
- Confirm resolution
- Reopen a ticket when appropriate

## 6.5 Mess Menu

Show:

- Today's breakfast
- Today's lunch
- Today's dinner
- Weekly menu
- Special notices
- Meal-related complaints or feedback

## 6.6 Pick & Drop

Show:

- Assigned route
- Pickup time
- Drop-off time
- Vehicle information
- Service announcements
- Driver contact information only when authorized for student access

## 6.7 Notifications

Show:

- Payment reminders
- Booking updates
- Complaint updates
- Maintenance announcements
- Mess updates
- Transport changes
- General hostel notices

All notifications must be associated with appropriate users or roles.

---

# PART 7 — OWNER / WARDEN MASTER CONTROL PANEL

This is the application's most important administrative interface.

Reproduce the premium dashboard aesthetics from the reference.

## 7.1 Dashboard Metric Cards

Display:

1. Total active students
2. Total rooms
3. Total beds
4. Occupied beds
5. Vacant beds
6. Current occupancy percentage
7. Total rent expected
8. Total verified rent collected
9. Outstanding dues
10. Overdue invoices
11. Unverified receipts
12. Open complaints

Financial metrics must come from consistent accounting logic.

For example:

```text
Occupancy Rate =
Occupied Beds / Active Usable Beds × 100
```

Exclude out-of-service beds from usable capacity where appropriate.

Use a clear distinction between verified revenue, receivables, refunds, and pending payment submissions.

## 7.2 Dashboard Charts

Implement:

- Monthly revenue trend
- Expected versus collected rent
- Occupancy percentage
- Room-category occupancy
- Pending dues distribution
- Complaint categories
- Complaint resolution performance
- Mess consumption
- Transport utilization

Charts should be interactive where useful.

Support date filters such as:

- This month
- Previous month
- Last three months
- Last six months
- Custom range

## 7.3 Recent Activity

Show:

- New booking requests
- Approved bookings
- Room allocations
- Verified payments
- Pending receipt submissions
- New maintenance tickets
- Resolved complaints
- Operational configuration changes

Avoid exposing unnecessary sensitive information in activity summaries.

## 7.4 Quick Actions

Provide:

- Add Student
- Add Room
- Assign Bed
- Generate Invoice
- Review Payment
- View Outstanding Dues
- Manage Complaints
- Manage Mess Menu
- View Reports
- Configure Hostel

---

# PART 8 — VISUAL FLOOR MAP AND ROOM MANAGEMENT

The floor map must visually resemble the reference image.

## 8.1 Building Layout

Initial demonstration configuration:

- 5 floors
- 5 rooms per floor
- 25 rooms in total
- Room capacities configurable between 2 and 6 beds

This is an initial seed configuration, not a hardcoded product limitation.

The owner must be able to create, modify, or deactivate floors, rooms, and individual beds.

Do not assume a fixed physical layout beyond the demo configuration.

## 8.2 Interactive Floor Map

Show:

- Floor selector
- Room blocks
- Room numbers
- Corridors
- Staircase indicators
- Available-bed count
- Occupied-bed count
- Room status
- Room details on click

Example:

```text
3RD FLOOR

[ Room 301 ] [ Room 302 ] [ Room 303 ]

           MAIN CORRIDOR

[ Room 304 ] [ Room 305 ]
```

Use the reference image's clean architectural floor-map styling.

The map should feel like a real hostel management tool rather than a basic HTML table.

## 8.3 Status Colors

Use:

- Green — Available bed
- Red — Occupied bed with current verified rent
- Yellow — Occupied bed with outstanding rent
- Purple — Unverified allocation or reconciliation exception

**Important:** These are display states derived from independent booking, occupancy, invoice, and reconciliation records.

Do not store payment status as the sole room-occupancy status.

A room containing multiple beds can have mixed statuses.

Use bed-level indicators and room-level summaries.

## 8.4 Room Details Panel

Clicking a room must open a drawer or modal showing:

- Room number
- Floor
- Room category
- Monthly rate
- Bed capacity
- Occupied beds
- Vacant beds
- Allocated students
- Allocation dates
- Relevant invoice indicators
- Maintenance status

Show permitted actions according to the logged-in role.

## 8.5 Hidden / Unverified Occupancy Detection

Create a reconciliation feature to identify possible inconsistencies such as:

- Occupied beds without valid allocation records
- Duplicate active bed assignments
- Conflicting room assignments
- Unverified move-in records
- Physical occupancy reconciliation discrepancies
- Unauthorized changes to allocation records

Display these records as **Unverified / Requires Reconciliation**.

Do not automatically accuse a student or employee of fraud.

Provide an owner review workflow.

Maintain immutable-style append-only audit events for all relevant actions.

---

# PART 9 — STUDENT AND BED ALLOCATION MANAGEMENT

Implement a complete student management system.

## 9.1 Student Profile

Fields:

- Unique student identifier
- Full name
- Email
- Phone number
- University
- Emergency contact
- Registration date
- Status
- Assigned room
- Assigned bed
- Pricing plan
- Joining date
- Expected checkout date
- Optional documents

Minimize collection of sensitive identity information.

Where sensitive identity documents are genuinely required, enforce explicit access controls, encryption, retention policies, and restricted downloads.

Do not populate demonstration records with real identity numbers.

## 9.2 Student Lifecycle

```text
Booking Request
   ↓
Approval
   ↓
Student Profile
   ↓
Bed Assignment
   ↓
Active Resident
   ↓
Room Transfer (Optional)
   ↓
Checkout
   ↓
Archived Resident
```

## 9.3 Allocation Constraints

Guarantee:

- One bed cannot have multiple conflicting active assignments.
- A student cannot have two conflicting active primary bed assignments.
- A room cannot exceed usable capacity.
- A disabled bed cannot be assigned.
- Booking approval does not bypass availability checks.

Use PostgreSQL transactions and appropriate locking or constraints.

Prevent concurrency-based overbooking.

Room transfers must be transactional and auditable.

---

# PART 10 — RENT, INVOICES, CHALLANS AND PAYMENTS

Build a secure financial management module.

## 10.1 Automatic Monthly Invoicing

Generate monthly invoices based on:

- Student contract
- Room category
- Assigned pricing
- Billing period
- Due date
- Additional authorized charges
- Discounts
- Late fees
- Previous adjustments

Initial configurable due date: 5th of each month.

Use a configurable grace period and late-fee policy.

Do not hardcode financial rules into frontend components.

## 10.2 Invoice Statuses

Support:

- Draft
- Issued
- Partially Paid
- Paid
- Overdue
- Voided

Track payment verification separately.

An uploaded receipt must not automatically mark an invoice as paid.

## 10.3 Challan Generation

Generate a professional downloadable PDF challan containing:

- Hostel logo
- Hostel name
- Unique challan number
- Student identifier
- Student name
- Room and bed information
- Billing month
- Rent breakdown
- Adjustments
- Total payable
- Due date
- Payment instructions
- QR code representing a safe invoice reference or supported verified payment link

A QR code alone must not falsely imply bank integration.

## 10.4 Payment Methods

Architect the system to support:

- Bank transfer
- Easypaisa
- JazzCash
- Compatible Pakistani merchant gateways

Use adapter interfaces such as:

```text
PaymentGateway
  create_payment()
  verify_webhook()
  get_payment_status()
  refund_payment()
```

Implement gateway-specific adapters only when their official, supported documentation and credentials are available.

Provide a working mock/sandbox gateway for development.

Never fabricate production integrations.

## 10.5 Receipt Upload

Student workflow:

```text
Login
  ↓
Open Invoice
  ↓
Upload Payment Receipt
  ↓
Enter Transaction Reference
  ↓
Submit
  ↓
Receipt Under Review
  ↓
Authorized Verification
  ↓
Invoice Balance Updated
```

Implement OCR extraction for:

- Amount
- Date
- Transaction reference
- Payment channel

OCR is an assistance feature, not proof of payment.

## 10.6 Payment Verification

Payment confirmation must be based on one of:

1. A verified and authenticated payment gateway event.
2. Authorized reconciliation against trusted bank transaction information.
3. Explicit authorized manual approval supported by a proper audit trail.

A screenshot or receipt must never be treated as definitive payment evidence.

For payment gateway webhooks:

- Verify signatures
- Verify transaction identifiers
- Verify amounts and currency
- Check expected merchant identity
- Enforce idempotency
- Prevent replay
- Reject invalid events
- Use database transactions
- Log verification decisions

## 10.7 Financial Integrity

Implement:

- Unique transaction constraints
- Double-processing prevention
- Payment allocation to invoices
- Partial payments
- Refund records
- Adjustment records
- Payment reversals
- Authorized correction workflows
- Full audit trails

Prefer an append-only financial event or ledger-like design.

Do not silently overwrite previously verified financial history.

Financial totals must be computed from trustworthy financial records.

## 10.8 Defaulter Management

Create:

- Outstanding balance list
- Days overdue
- Rent reminder notices
- Payment history
- Penalty status
- Manual review actions

Include filters by floor, room, student, month, and overdue period.

---

# PART 11 — COMPLAINTS AND MAINTENANCE

Create a complete issue tracking system.

## 11.1 Complaint Categories

- WiFi
- Electricity
- Plumbing
- Furniture
- Cleaning
- Mess
- Water supply
- Pick & drop
- Other

## 11.2 Ticket Lifecycle

```text
Open
  ↓
Assigned
  ↓
In Progress
  ↓
Resolved
  ↓
Closed
```

Support reopening where necessary.

## 11.3 Ticket Properties

Each ticket contains:

- Unique ID
- Student
- Room
- Category
- Title
- Description
- Priority
- Attachments
- Assigned staff
- Created date
- Updated date
- Resolution details
- Status history

## 11.4 Management Features

Provide:

- Ticket assignment
- Comments
- Priority changes
- Resolution notes
- Attachment handling
- Status tracking
- Notification triggers
- Average resolution time reports

All actions must respect role permissions.

---

# PART 12 — MESS MANAGEMENT

Create a dedicated mess dashboard.

## 12.1 Menu Management

Support:

- Breakfast
- Lunch
- Dinner
- Weekly menu
- Menu changes
- Meal announcements

The owner or authorized staff should edit the menu.

Students should view the current approved menu.

## 12.2 Meal Counts

Track operational meal counts:

- Breakfast portions
- Lunch portions
- Dinner portions
- Meals prepared
- Meals served
- Remaining portions
- Waste quantity, when entered

Do not implement individual student attendance or attendance-derived meal tracking.

## 12.3 Mess Analytics

Generate:

- Daily meal count
- Weekly consumption
- Monthly consumption
- Food wastage trends
- Meal cost estimates
- Feedback summaries

Only calculate metrics for which actual underlying data exists.

## 12.4 Inventory (Extensible Module)

Design for future:

- Grocery inventory
- Ingredient stock
- Supplier management
- Purchase records
- Low-stock notifications
- Meal cost analysis

A basic version may be included after completing core modules.

---

# PART 13 — PICK & DROP MANAGEMENT

Build the transportation management module.

## 13.1 Destinations

Initial configured universities:

- Air University
- Bahria University
- National Defence University (NDU)

Routes must be editable.

## 13.2 Vehicles

Fields:

- Vehicle ID
- Vehicle number
- Vehicle type
- Capacity
- Assigned driver
- Operational status
- Route
- Notes

## 13.3 Drivers

Maintain:

- Driver name
- Authorized contact details
- Assigned vehicle
- Operational status

Restrict access to sensitive staff details.

## 13.4 Routes and Schedules

Each route should support:

- Route name
- Destination
- Pickup location
- Pickup time
- Drop-off time
- Vehicle
- Driver
- Student assignments
- Seat capacity

Do not display fabricated live GPS tracking.

Real-time tracking must be a future optional integration requiring appropriate hardware and permissions.

## 13.5 Student View

Show the student's assigned transport route and relevant announcements.

---

# PART 14 — REPORTS AND ANALYTICS

Build a professional reporting interface.

## 14.1 Financial Reports

- Monthly verified revenue
- Invoice totals
- Outstanding dues
- Overdue invoices
- Payment methods
- Adjustments
- Refunds
- Collection trends

## 14.2 Hostel Operations Reports

- Total active residents
- Available beds
- Occupied beds
- Occupancy by floor
- Occupancy by room type
- Booking trends
- Check-in / checkout records
- Maintenance trends

## 14.3 Mess Reports

- Meals prepared
- Meals served
- Waste
- Estimated cost
- Menu statistics

## 14.4 Transport Reports

- Route utilization
- Vehicle assignments
- Available transport capacity
- Operational service summaries

## 14.5 Export

Support:

- CSV
- Excel
- Professional PDF reports

Apply authorization checks to exports.

Ensure exports cannot leak student data to unauthorized roles.

Use appropriate server-side filtering and pagination.

---

# PART 15 — NOTIFICATIONS SYSTEM

Create an extensible notification service.

Support:

- In-app notifications
- Email notifications
- Future SMS integration
- Future WhatsApp integration via authorized providers

Initial events:

- Booking submitted
- Booking approved
- Booking rejected
- Invoice generated
- Rent approaching due date
- Payment receipt received
- Payment verified
- Payment rejected
- Complaint assigned
- Complaint resolved
- Maintenance notice
- Transport schedule update

Use background jobs where appropriate.

Ensure notification dispatch is retryable and idempotent.

Store delivery status.

Implement provider abstractions and development-safe mock providers.

Never hardcode provider secrets.

---

# PART 16 — HIGH-SECURITY APPLICATION ARCHITECTURE

Security is a foundational requirement, not an optional feature.

Implement a defense-in-depth security architecture.

## 16.1 Authentication

Use established, maintained authentication standards and libraries.

Requirements:

- Secure login
- Secure logout
- Password reset
- Email verification where configured
- Session expiry
- Session revocation
- Suspicious login handling
- Account lockout or adaptive throttling
- MFA for privileged accounts
- Secure password hashing with Argon2id

Never store plaintext passwords.

Never log credentials.

Never put authentication tokens in URLs.

Prefer secure, HttpOnly, appropriately configured cookies for browser sessions.

If using access and refresh tokens, implement secure rotation, revocation, expiry, CSRF protection, and replay protections appropriate to the selected architecture.

## 16.2 Authorization

Enforce server-side checks for every protected endpoint.

Follow the principle of least privilege.

Validate both:

- Role/permission
- Ownership of requested resources

Prevent IDOR/BOLA vulnerabilities.

## 16.3 Input Security

Implement:

- Pydantic validation
- Strict data schemas
- Parameterized database queries
- Request size limits
- Safe file upload validation
- Correct output encoding
- XSS protection
- CSRF protection
- SQL injection protection
- Appropriate SSRF prevention
- Secure error handling

Do not expose stack traces to ordinary users.

## 16.4 Security Headers

Configure appropriate:

- Content Security Policy
- HSTS in HTTPS environments
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Secure cookie attributes
- Frame restrictions

Use a restrictive production CORS configuration.

## 16.5 Rate Limiting

Implement appropriate rate limits for:

- Login
- Password reset
- Public booking
- AI chat
- File upload
- Sensitive administrative operations

Rate limiting must consider trusted proxy configuration and should not depend blindly on user-supplied forwarding headers.

## 16.6 File Upload Security

For images, PDFs, and receipts:

- Enforce allowed MIME types
- Validate actual file content
- Enforce size limits
- Randomize stored filenames
- Store files outside public executable directories
- Prevent path traversal
- Use authenticated access
- Use signed short-lived download URLs where suitable
- Integrate malware scanning when available
- Block executable content

Sensitive uploads must not be publicly accessible.

## 16.7 Database Security

Use:

- Parameterized queries
- Dedicated least-privilege database accounts
- Encrypted connections where applicable
- Strong migration practices
- Proper constraints
- Transaction isolation
- Secure backups
- Restricted database network exposure

## 16.8 Data Protection

Apply:

- Encryption in transit
- Encryption at rest where supported
- Sensitive field encryption where justified
- Data minimization
- Access control
- Retention policies
- Secure deletion procedures
- Appropriate redaction
- Privacy-conscious audit logging

Do not include unnecessary sensitive information in application logs or AI context.

## 16.9 Audit Logging

Record important actions such as:

- Login security events
- Student record changes
- Bed allocations
- Room transfers
- Invoice changes
- Payment verification
- Financial adjustments
- Role changes
- Security setting changes
- Administrative overrides

Each audit event should contain:

- Actor ID
- Authorized role
- Action
- Resource type
- Resource ID
- Timestamp
- Safe metadata
- Request/correlation ID

Make audit events append-only at the application level.

Restrict deletion and modification.

For stronger tamper detection, implement integrity checks or external protected audit storage.

Do not claim that ordinary database logs are impossible to modify.

## 16.10 Payment Fraud Prevention

Prevent:

- Duplicate receipt approval
- Reusing transaction references improperly
- Unauthorized payment status changes
- Client-side payment manipulation
- Webhook replay
- Fake payment success callbacks
- Invalid amount matching
- Unapproved financial adjustments

All final payment confirmation must occur in trusted backend services.

## 16.11 Dependency and Supply-Chain Security

Implement:

- Dependency lockfiles
- Automated dependency vulnerability scanning
- Secret scanning
- Static analysis
- Secure CI checks
- Trusted package selection
- Minimal production containers

Avoid adding packages without a clear purpose.

## 16.12 Backup and Disaster Recovery

Provide:

- Automated backup configuration
- Backup retention strategy
- Database restore instructions
- Restore verification procedure
- Protected backup access
- Migration recovery guidance

Do not assume a backup system works until restore tests demonstrate it.

## 16.13 Security Testing

Include automated tests for:

- Authentication bypass attempts
- Missing authorization
- Cross-account data exposure
- Role escalation
- CSRF protections
- Duplicate payment requests
- Invalid webhook signatures
- Overbooking race conditions
- Malicious file uploads
- Input validation
- Sensitive data exposure

Follow OWASP ASVS principles and use relevant OWASP Top 10 guidance.

No system should be described as unhackable or perfectly secure.

Document residual risks and controls requiring production configuration.

---

# PART 17 — DATABASE DESIGN

Create a normalized PostgreSQL schema.

Expected core entities include:

```text
users
roles
permissions
role_permissions
user_roles
user_sessions
students
student_documents
floors
rooms
beds
room_types
room_prices
room_allocations
booking_requests
booking_events
invoices
invoice_line_items
payments
payment_allocations
payment_receipts
payment_verifications
financial_adjustments
refunds
complaints
complaint_comments
complaint_events
mess_menus
mess_counts
mess_inventory
vehicles
drivers
transport_routes
transport_schedules
student_transport_assignments
notifications
notification_deliveries
ai_knowledge_documents
ai_knowledge_chunks
ai_chat_sessions
ai_chat_messages
audit_events
system_settings
```

Use:

- UUID primary keys where appropriate
- Foreign keys
- Unique constraints
- Database indexes
- Check constraints
- Created/updated timestamps
- Consistent monetary decimal types
- Explicit status enums
- Soft deletion only where justified
- Referential integrity

Never use floating-point storage for money.

Use integer minor units or an exact decimal monetary representation consistently.

Maintain a single authoritative source of truth for each business concept.

Create Alembic migrations.

Do not use `create_all()` as a substitute for proper production migrations.

## 17.1 Data Integrity

Implement database-level protections against:

- Duplicate active bed assignments
- Duplicate payment event processing
- Duplicate transaction references within relevant scopes
- Invalid room capacity
- Orphaned financial records
- Invalid foreign-key references

Use transactional operations to avoid inconsistent intermediate states.

## 17.2 Demo Data

Create a deterministic development seed system.

Provide:

- Demo owner account
- Demo warden account
- Demo assistant warden account
- Demo student accounts
- 5 floors
- 5 rooms per floor
- Room categories from 2 to 6 seats
- Student allocations
- Invoices
- Payment records
- Payment review examples
- Complaints
- Mess menus
- Vehicles
- Transport routes
- Booking requests
- Charts and reports

All seeded information must be clearly identified as demonstration data.

Generate consistent dates and amounts.

Keep occupancy, revenue, payment statuses, and other aggregates mathematically consistent.

Do not create contradictions such as 50 available beds while storing 100 occupied allocations.

Make seeding idempotent and development-only.

---

# PART 18 — API DESIGN

Use RESTful API design with OpenAPI documentation.

Initial namespace:

`/api/v1/`

Create logically structured endpoints.

Examples:

```text
/auth/login
/auth/logout
/auth/me
/auth/refresh
/auth/mfa/setup
/auth/mfa/verify

/students
/students/{id}

/floors
/floors/{id}
/rooms
/rooms/{id}
/beds
/beds/{id}

/bookings
/bookings/{id}
/bookings/{id}/approve
/bookings/{id}/reject

/allocations
/allocations/{id}

/invoices
/invoices/{id}
/invoices/{id}/challan

/payments
/payments/{id}
/payments/{id}/receipts
/payments/{id}/verification

/complaints
/complaints/{id}

/mess/menus
/mess/counts

/transport/routes
/transport/vehicles
/transport/schedules

/reports/financial
/reports/occupancy
/reports/complaints

/notifications

/ai/public-chat
/ai/admin-chat

/audit-events

/settings
```

These are design examples; refine endpoints to follow consistent resource-oriented conventions.

Requirements:

- Input validation
- Authentication and authorization
- Structured responses
- Structured error format
- Pagination
- Filtering
- Sorting
- API versioning
- Transaction safety
- OpenAPI documentation

Define clear request and response schemas.

Do not expose internal database models directly without appropriate serialization.

Add correlation IDs for troubleshooting.

---

# PART 19 — FRONTEND PAGE SPECIFICATION

Create the following navigation structure.

## Public Portal

```text
Home
Rooms & Pricing
Gallery
Facilities
About
FAQ
Contact
Booking
AI Assistant
Login
```

## Student Portal

```text
Dashboard
My Profile
My Room
My Payments
My Complaints
Mess Menu
Pick & Drop
Notifications
Settings
Support
```

## Owner Portal

```text
Dashboard
Students
Floor Map
Rooms & Beds
Bookings
Payments
Rent & Invoices
Outstanding Dues
Complaints
Mess Management
Transport Management
Reports & Analytics
AI Assistant
Staff & Permissions
Notifications
Audit Logs
System Settings
Public Website Settings
```

## Warden Portal

```text
Dashboard
Students
Rooms & Beds
Floor Map
Bookings
Complaints
Mess Management
Transport
Operational Reports
Notifications
```

Financial pages may be added only where explicitly authorized by owner-controlled permissions.

## Assistant Warden Portal

```text
Dashboard
Assigned Tasks
Room Overview
Complaints
Mess Counts
Operational Notices
Profile
```

Do not include forbidden financial controls.

**Do not include any student attendance section anywhere.**

Every navigation entry must lead to a functioning route.

No broken pages.

No fake buttons that imply a completed action when nothing happened.

---

# PART 20 — UI COMPONENT LIBRARY

Create reusable components including:

```text
AppSidebar
AppTopbar
PageHeader
MetricCard
RevenueChart
OccupancyChart
PaymentStatusBadge
RoomStatusBadge
FloorSelector
FloorMap
RoomCard
BedCard
StudentTable
PaymentTable
InvoiceCard
ReceiptUpload
ChallanPreview
ComplaintCard
ComplaintTimeline
MessMenuCard
TransportRouteCard
NotificationPanel
AIAssistantWidget
AdminAIChat
AuditLogTable
ConfirmDialog
DataTable
EmptyState
ErrorState
LoadingSkeleton
```

Use shared spacing, typography, and colors.

Keep visuals consistent across all roles.

Do not create different unrelated designs for different dashboard sections.

---

# PART 21 — ADMIN CONFIGURATION AND FUTURE DATA IMPORT

I currently do not have the final real hostel dataset.

Therefore, design everything for easy future configuration.

The owner must be able to update:

- Hostel name
- Logo
- Contact details
- Address
- Photos
- Building floors
- Rooms
- Bed capacities
- Room prices
- Facilities
- Mess menu
- Vehicles
- Routes
- Staff
- Payment instructions
- Booking policies
- Rent rules

Provide secure CSV import functionality for suitable data categories.

Imports should support:

1. Upload
2. Schema validation
3. Preview
4. Duplicate detection
5. Error reporting
6. Owner confirmation
7. Transactional import
8. Import audit record

Do not silently overwrite existing production information.

Demo data must never be automatically imported into the production database.

---

# PART 22 — TESTING AND QUALITY ASSURANCE

Implement automated tests at multiple levels.

## 22.1 Backend Tests

Use pytest.

Test:

- Authentication
- Authorization
- Student creation
- Room creation
- Bed assignments
- Booking approval
- Booking conflicts
- Invoice generation
- Rent calculation
- Late fee calculation
- Partial payments
- Payment verification
- Duplicate webhook handling
- Complaint transitions
- Mess data
- Reporting calculations
- Security constraints

## 22.2 Frontend Tests

Use appropriate modern React testing tools.

Test:

- Login forms
- Route protection
- Dashboard rendering
- Responsive navigation
- Student forms
- Floor interactions
- Payment review interface
- Complaint forms
- Validation
- Error handling

## 22.3 End-to-End Tests

Use Playwright.

Required journeys:

### Journey A — Visitor Booking

Visitor selects a room, submits a request, and receives a booking reference.

### Journey B — Owner Approval

Owner reviews the request, approves it, and assigns an available bed.

### Journey C — Student Payment

Student opens an invoice, downloads a challan, and submits a receipt for review.

### Journey D — Payment Verification

Authorized owner verifies a properly reconciled payment, and the invoice balance updates.

### Journey E — Complaint Handling

Student submits a complaint, authorized staff processes it, and the student sees the updated status.

### Journey F — Role Security

Assistant warden attempts to access an owner-only financial endpoint and receives an authorization error.

### Journey G — Allocation Conflict

Two simultaneous requests attempt to claim the same bed. Only one succeeds.

## 22.4 General Code Quality

Use:

- Python Ruff
- Python type checking
- ESLint
- TypeScript strict checking
- Formatting
- Security scanning
- Unit tests
- Integration tests
- End-to-end tests

Eliminate avoidable lint and type errors.

---

# PART 23 — DEPLOYMENT AND DEVOPS

Prepare the application for containerized deployment.

## 23.1 Docker

Create:

- Frontend Dockerfile
- Backend Dockerfile
- Docker Compose
- PostgreSQL service
- Redis service
- Background worker where required

Use multi-stage builds and non-root processes where practical.

## 23.2 Environment Configuration

Create an `.env.example` with placeholders for:

```text
DATABASE_URL
REDIS_URL
APP_ENV
FRONTEND_URL
BACKEND_URL
SESSION_SECRET
ENCRYPTION_KEY
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
AI_PROVIDER
AI_API_KEY
EMBEDDING_MODEL
PAYMENT_GATEWAY_MODE
PAYMENT_GATEWAY_KEY
PAYMENT_WEBHOOK_SECRET
```

Adapt this list to the actual implementation.

Never place real secrets in source files.

Never commit `.env` files containing secrets.

## 23.3 CI/CD

Set up a CI workflow that checks:

- Code formatting
- Linting
- Type checking
- Tests
- Dependency vulnerabilities
- Secret exposure
- Build integrity

## 23.4 Deployment Documentation

Document:

- Local development setup
- Database migrations
- Running seed scripts
- Building frontend
- Running backend
- Docker startup
- Production environment requirements
- HTTPS configuration
- Storage configuration
- Backup and recovery
- AI provider configuration
- Payment provider integration
- Production security checklist

Do not deploy real financial integrations without proper credentials, provider authorization, testing, and review.

---

# PART 24 — IMPLEMENTATION EXECUTION PLAN

You must implement the actual application in the repository.

Do not respond with architecture recommendations alone.

Do not stop after producing a mockup.

Work incrementally and maintain a functioning application.

## Phase 1 — Repository and Foundation

Create:

- Monorepo structure
- Environment configuration
- Docker Compose
- Next.js application
- FastAPI application
- PostgreSQL connection
- Alembic migrations
- Authentication
- Authorization foundation
- Shared design system
- Error handling
- Initial tests

Verify that the application starts.

## Phase 2 — Complete Premium Frontend

Implement the full frontend according to the screenshot.

Build:

- Public website
- Student dashboard
- Owner dashboard
- Warden dashboard
- Assistant warden dashboard
- Floor map
- Rooms
- Payments
- Complaints
- Mess
- Transport
- Analytics
- Settings
- Login screens

Initially use typed mock data adapters where necessary.

Do not let a temporary frontend mock become the final source of truth.

## Phase 3 — Core Backend and Database

Implement:

- Users
- Roles
- Permissions
- Students
- Rooms
- Beds
- Bookings
- Allocations
- Invoices
- Payments
- Complaint workflows
- Mess services
- Transport services

Connect frontend screens to real backend APIs.

## Phase 4 — Financial and Security Features

Implement:

- Challan PDFs
- Receipt uploads
- Manual verification
- Gateway abstraction
- Financial controls
- Audit logging
- Secure document access
- MFA
- Security middleware
- Rate limiting
- Role restrictions

## Phase 5 — AI and Automation

Implement:

- Public chatbot
- Knowledge-base management
- RAG pipeline
- Owner AI assistant
- OCR receipt extraction
- Safe tool interfaces
- Notification jobs

External integrations must degrade gracefully without credentials.

## Phase 6 — Testing and Hardening

Run:

- Backend tests
- Frontend tests
- End-to-end tests
- Security checks
- Database migration tests
- Production builds

Fix identified defects.

## Phase 7 — Documentation and Delivery

Produce:

- README
- Installation guide
- Environment guide
- Architecture guide
- Database documentation
- API documentation
- Role-permission documentation
- Security documentation
- Deployment guide
- Future integration guide

---

# PART 25 — NON-NEGOTIABLE ACCEPTANCE CRITERIA

The final application is acceptable only when:

- [ ] It follows the provided reference design closely.
- [ ] Every required role has a dedicated dashboard.
- [ ] Public website and booking pages work.
- [ ] Student profiles persist in PostgreSQL.
- [ ] Rooms and beds are database-driven.
- [ ] Floor maps reflect real allocation data.
- [ ] Booking workflows work end to end.
- [ ] Database constraints prevent double booking.
- [ ] Invoices are generated with correct calculations.
- [ ] Challan PDFs can be downloaded.
- [ ] Receipts can be uploaded securely.
- [ ] Payment verification requires trusted evidence and authorization.
- [ ] Outstanding dues update correctly.
- [ ] Complaints can be submitted and processed.
- [ ] Mess menus can be updated.
- [ ] Meal counts can be recorded without student attendance features.
- [ ] Transport routes can be managed.
- [ ] Reports use consistent database calculations.
- [ ] Notifications are integrated into actual workflows.
- [ ] AI features have a clear working/demo distinction.
- [ ] Roles cannot bypass backend permissions.
- [ ] Sensitive files are not publicly accessible.
- [ ] Security-sensitive actions are audited.
- [ ] Tests cover critical business rules.
- [ ] Docker development startup works.
- [ ] Database migrations work.
- [ ] Demo seed data works.
- [ ] No attendance module exists.
- [ ] The application is responsive.
- [ ] The README explains how to run everything.

---

# PART 26 — ENGINEERING RULES

Follow these rules throughout development.

**Rule 1:** Write production-quality, readable, maintainable code.

**Rule 2:** Do not create a static HTML demonstration as the final product.

**Rule 3:** Do not use fake authentication or frontend-only authorization.

**Rule 4:** Do not hardcode student information into production components.

**Rule 5:** Do not place business logic directly into frontend UI components.

**Rule 6:** Do not trust uploaded payment screenshots as proof of settled payment.

**Rule 7:** Do not sacrifice security to make the demo appear functional.

**Rule 8:** Do not implement an unnecessary microservices architecture.

**Rule 9:** Do not generate hundreds of unused abstraction files.

**Rule 10:** Prefer secure, mature, maintained libraries over custom security implementations.

**Rule 11:** Use database constraints and transactions for critical data integrity.

**Rule 12:** Implement meaningful automated tests.

**Rule 13:** Keep configuration external to source code.

**Rule 14:** Make demo content replaceable without rewriting the application.

**Rule 15:** Avoid irrelevant features beyond the specified product.

**Rule 16:** Never create student attendance functionality.

**Rule 17:** If functionality requires unavailable external credentials, implement the adapter and a clearly labeled development-safe alternative.

**Rule 18:** Do not claim a feature works unless it has actually been implemented and verified.

**Rule 19:** When a command fails, inspect the cause, fix it, and rerun the relevant verification.

**Rule 20:** Preserve working functionality throughout implementation.

---

# PART 27 — EXPECTED FINAL DELIVERY

The final repository must contain:

```text
e11-hostel/
  frontend/
  backend/
  infrastructure/
  scripts/
  docs/
  tests/
  assets/
  .env.example
  .gitignore
  docker-compose.yml
  README.md
```

The exact file organization may be improved if necessary.

Provide clear setup instructions.

An ideal development startup workflow should be close to:

```bash
cp .env.example .env

docker compose up --build -d

docker compose exec backend alembic upgrade head

docker compose exec backend python -m app.scripts.seed_demo
```

Ensure the actual commands match the files and project structure you create.

Document local URLs for:

- Public website
- Student portal
- Owner portal
- Warden portal
- Assistant warden portal
- API documentation

Provide development-only demonstration accounts for each role.

These accounts must not be enabled as insecure defaults in production.

---

# PART 28 — FINAL INSTRUCTION TO THE CODING AGENT

You are now responsible for building **E-11 HOSTEL — Smart Management Portal & AI System** as a real software engineering project.

This is a complete product-development task, not a request for advice.

Your priorities are:

1. Visual fidelity to the supplied reference screenshot.
2. Correct and secure business logic.
3. Professional OOP-based backend architecture.
4. Strict role-based authorization.
5. High-quality database design.
6. Reliable financial records and verification.
7. Fully functional core workflows.
8. Responsive modern frontend.
9. Configurable demonstration data.
10. Maintainable and testable production-oriented code.

First, inspect the existing repository and reference design.

Then write a concise implementation plan inside the repository and begin implementing immediately.

Do not stop at planning.

At the end of each major implementation phase:

1. Run relevant tests.
2. Fix critical errors.
3. Check integration with previous modules.
4. Document completed functionality.
5. Continue to the next phase.

Do not replace backend functionality with fabricated frontend data and present it as complete.

If the project cannot be finished in a single coding session, preserve working code, document the exact remaining tasks, and leave the repository ready for the next implementation session.

In the final report, distinguish:

- Fully implemented and tested features
- Implemented features needing external credentials
- Demonstration-only features
- Incomplete features
- Security checks completed
- Outstanding production risks

**BEGIN BUILDING THE APPLICATION NOW.**

The target is a professional hostel management platform that feels like a premium commercial SaaS product, follows the screenshot's visual identity, and is engineered for eventual real-world use.
