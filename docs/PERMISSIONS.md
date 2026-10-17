# Roles and authorization

The application currently enforces a fixed role policy. Seeded role/permission records provide a foundation; they do not yet expose owner-configurable granular grants. Server-side authentication and authorization remain authoritative regardless of visible navigation.

| Capability | Owner | Warden | Assistant warden | Student |
| --- | --- | --- | --- | --- |
| Dashboard | Overall/financial | Operational | Limited operational | Own account |
| Resident records | Manage | Manage operationally | Necessary room information | Own profile |
| Room/bed configuration and pricing | Manage | Read | Read overview | Own assigned room |
| Booking review and allocation | Manage | Manage | Denied | Submit public request |
| Invoices/payments/private receipts | Full authorized review | Denied | Denied | Own records only |
| Complaint handling | Manage | Manage | Assigned tickets only | Own tickets |
| Mess menus | Manage | Manage | Read | Read |
| Aggregate meal portions | Manage | Manage | Update counts | Read permitted menu |
| Published transport routes | Manage | Manage | Denied | Shared published schedule |
| In-app operational announcements | Publish | Publish | Read | Read targeted/global |
| Staff/configuration/audit/imports | Manage | Denied | Denied | Denied |
| Administrative assistant/knowledge | Manage | Denied | Denied | Public assistant only |
| Password/MFA/profile | Own account | Own account | Own account | Own account |

Students cannot choose another resident ID to access their financial documents. Assistants cannot mutate financial data or unassigned complaints by directly calling an API. Warden financial access remains denied; configurable owner-granted exceptions are not implemented.

Production owner and warden requests require MFA. Once enabled on any account, MFA applies to that account's protected operations too. Sensitive owner writes require recent verification. The owner must explicitly confirm payment reconciliation and provide a trusted evidence reference; a browser screenshot or assistant response never grants financial authority.

Audit access is owner-only. Audit events are append-only at the application interface, rather than cryptographically immutable database storage. Independent review and a least-privilege production database account remain required.
