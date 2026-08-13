# Brand Mint Studios Agency OS — Data Model

This model is limited to the approved operational scope. Database timestamps are stored in UTC, monetary amounts are stored in paise, and stored-file bytes remain in S3 rather than database columns.

| Domain | Record | Core relationships and purpose |
|---|---|---|
| Client relationship | `clients` | One client organization; linked to its account contact, onboarding record, projects, invoices, documents, and files. |
| Client relationship | `clientContacts` | A client contact and, once authenticated, the corresponding application user. |
| Client relationship | `onboardingSubmissions` | Lead details, selected service, project brief, and onboarding stage before activation. |
| Legal compliance | `legalAcceptances` | Immutable acceptance event for the Terms & Conditions, Privacy Policy, Cookie Policy, or Service Agreement, including document version, accepted-at timestamp, and accepting user. |
| Project delivery | `projects` | A client project with a status, deadline, and project brief. |
| Project delivery | `deliverables` | A project delivery item with assignment and completion status. |
| Documents | `documents` | A contract, NDA, or SOW linked to a client/project, its signature status, and finalized stored-file record. |
| Billing | `invoices` | Invoice number, client, issue date, due date, payment status, subtotal, GST amount, total amount, and PDF file record. |
| Billing | `invoiceItems` | Itemised line items belonging to one invoice. |
| File storage | `storedFiles` | S3 object key, source filename, content type, owner, and relationships to a document or invoice. |
| Operations | `notifications` | In-app notification delivered to a CEO/admin or linked client account for the approved event types. |

## Access model

| Role | Scope |
|---|---|
| CEO/admin | Full access to every client, onboarding submission, project, deliverable, invoice, document, file, notification, and configuration record. |
| Client | Only its linked organization’s projects, deliverables, invoices, documents, stored files, and client-targeted notifications; only after required legal acceptances have been recorded. |

## Workflow invariants

Client account activation is permitted only once all four required legal acceptances exist for the active document versions. Invoice totals are calculated from line items and stored amounts, never accepted from the browser as a client-supplied total. Documents and invoice PDFs are represented by metadata in the database and stored as S3 objects. A payment-status update, legal acceptance, onboarding completion, or document-signature-status change may create an in-app notification and a CEO owner alert. External client email delivery remains provider-dependent and is not stored as a substitute for the source workflow record.
