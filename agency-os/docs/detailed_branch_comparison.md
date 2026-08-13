# Detailed Comparison: Claude Branch vs. Manus Agency OS

**Comparison date:** 13 August 2026  
**Branches:** `claude/new-session-glceza` and `manus/brand-mint-agency-os`  
**Scope:** This is an analysis-only comparison. Neither branch was changed while preparing it.

## Executive conclusion

These branches are **not alternate versions of the same application**. They are two different products that happen to live in one repository.

The **Claude branch** is a deployable public Brand Mint marketing site with an integrated studio/client portal. It is a static Vercel-oriented application whose operational data path centers on **Firebase Authentication and Firestore**. It also contains a separate **Supabase-backed admin code path**, which is the origin of the Supabase references you saw. The restored Vercel production site currently points to this branch at commit [`811c8cb`](https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/commit/811c8cb32db98c0e6e3cd214e8e7732a083f7848). [1]

The **Manus branch** is a separate full-stack **Agency OS** focused on CEO operations: onboarding, legal acceptance, documents, client access, project delivery, invoices, file records, and notifications. It uses React/Vite, Express/tRPC, Drizzle/MySQL, Manus OAuth, and S3-backed file records. It is not a static Vercel application and should not be promoted into the existing Vercel project without a deliberate hosting and integration migration. [2]

> **Key decision:** Do not merge these branches as-is. First decide whether the canonical live product is the public Brand Mint website/portal or the internal Agency OS. They can coexist, but they should not share an unplanned data model, authentication system, or deployment target.

## Branch identity and deployment status

| Dimension | Claude branch | Manus Agency OS branch |
|---|---|---|
| Branch | `claude/new-session-glceza` | `manus/brand-mint-agency-os` |
| Current verified source commit | `811c8cb32db98c0e6e3cd214e8e7732a083f7848` | `a672891247c5fa7d2857c8a5c791ea1d8e3c5139` |
| Current deployment relationship | Restored Vercel production source for `www.brandmintstudios.in` | Preserved GitHub branch; not current Vercel production |
| Intended product | Public marketing site plus studio/client portal | Internal CEO/client agency-operations system |
| Repository shape measured locally | 555 files; roughly 29,131 lines across selected source formats | 158 non-dependency files; roughly 12,983 lines in client/server/schema source |
| Vercel suitability | Direct: static root application with no build command | Requires a deployment redesign because it expects a Node server, database, OAuth, and S3 environment |

The source-size numbers indicate scope and maintenance surface, not quality. The Claude branch contains a significantly broader existing portal/catalogue implementation; the Manus branch is narrower in scope but has a more conventional structured full-stack application boundary.

## Product scope and user journeys

| Journey | Claude branch | Manus Agency OS branch |
|---|---|---|
| Public brand discovery | Complete public site with Services, Care plans, Work, Process, Studio, FAQ, contact details, budget selection, and a project enquiry form | Not implemented as a public marketing site; the root experience is a CEO operations dashboard |
| Client acquisition | Public `Start a project` journey, then portal/onboarding routes in the same site | Step-by-step onboarding for contact information, service selection, project brief, and legal acceptance |
| Studio operations | Broader operational model: organizations, staff roles, projects, milestones, deliverables, invoices, leads, catalog, rates, and activity log | Focused CEO workflow: clients, projects, deliverables, invoices, documents, stored files, notifications, and legal acceptance |
| Client portal | Firebase-authenticated portal with organization-scoped project/invoice/portal data | Client portal restricted to linked client organization records only after required legal acceptance |
| Legal gate | No equivalent four-policy, versioned activation invariant was identified in the reviewed branch documentation/rules | Four explicit legal acceptances: Terms & Conditions, Privacy Policy, Cookie Policy, and Service Agreement; recorded with version and timestamp before portal activation [2] |
| Documents | Portal and database rules support project deliverables and operational records; this comparison did not verify a dedicated contract-signature workflow | Records for contracts, NDAs, and SOWs; status tracking and S3-backed PDF records; managed e-signature integration deliberately deferred |
| Billing | Firestore invoice collection with role-controlled access | Server-calculated itemised invoices, payment status, GST calculation, and server-generated PDF stored as a file record |

### What the Claude branch is strongest at

The Claude implementation is stronger today as a **public-facing website and Vercel-native portal**. Its restored deployment visibly includes the public marketing journey, contact capture, service selection, budget options, navigation, and calls to action. It is designed to run with no build process or dedicated application server, which matches the current Vercel project. [3]

It also has a more granular internal role model: **admin, partner, collaborator, finance, and client**. Its documented Firestore rules distinguish commercial access from delivery access, make cross-organization client access fail closed, and isolate collaborator rates into a separate collection because Firestore rules cannot hide individual document fields. [4]

### What the Manus branch is strongest at

The Manus implementation is stronger as a deliberately scoped **Agency OS**. Its model explicitly connects onboarding, legal acceptance, projects, documents, invoices, file records, and notifications around a CEO/client operating model. The contract between the browser and backend is typed through tRPC, and invoice totals are designed to be calculated server-side rather than trusted from browser input. [2]

It directly addresses workflows that were requested for the Agency OS: legal gating, client isolation, document records, S3-backed files, invoice PDFs, and a CEO-oriented delivery/billing overview. It also makes the selected operational boundary explicit: client email and provider-backed e-signature are currently manual because no external provider was approved.

## Architecture and data boundaries

| Area | Claude branch | Manus Agency OS branch | Implication |
|---|---|---|---|
| Frontend architecture | Static HTML, CSS, and ES modules | React 19, TypeScript, Vite, Tailwind/shadcn UI | Claude is simpler to serve; Manus has stronger component/state conventions but a larger runtime surface |
| Backend | No conventional application server; browser calls Firebase/Firestore and Vercel functions where present | Express server with tRPC procedures | Manus permits centralized business rules; Claude pushes more responsibility into Firestore rules and browser modules |
| Primary data store | Firebase Firestore | MySQL via Drizzle | These are incompatible persistence models and must not be merged casually |
| Additional data path | Separate Supabase admin synchronization code under `/admin` | None | The Claude branch has two data-service concepts to rationalize: Firestore for portal/studio and Supabase for a separate admin area |
| Authentication | Firebase Auth | Manus OAuth/session context | Both can support secure applications, but user identities and role assignment are not interchangeable |
| Files | Firebase project configuration includes a Storage bucket; actual file workflow needs separate review | S3 object metadata plus protected download procedure | Manus has a clearer modeled document/invoice-file boundary |
| Invoices | Firestore records controlled by Firestore rules | Server-calculated invoice totals with PDF generation | Manus has stronger server-side invoice calculation; Claude is better integrated into its existing role matrix |

### Why you saw both Firestore and Supabase

Your observation is correct. The Claude branch explicitly describes itself as Firebase Auth + Firestore for its client portal and studio dashboard. [3] However, it also contains `/admin/config.js`, `/admin/db.js`, and `/admin/supabase.js`. Those files describe a separate offline-first admin cache synchronized with Supabase. This is not a single unified Firestore architecture.

The practical risk is not merely naming. Two operational data paths create questions that must have one clear answer: **Which system is the source of truth for clients, projects, invoices, and staff roles? Which login governs the admin? Which database backup and retention policy applies?** Until this is decided, production changes should avoid adding more data pathways.

### Authentication and default admin access

The Claude rules identify the admin using the Firebase token email `admin@brandmintstudios.in`. This is not a default password; the Firebase account must exist and sign in through Firebase Auth. [4]

The Manus branch has no default username/password either. The project owner is elevated through the existing Manus OAuth owner identity; its user table supports `admin` and `user` roles. The application cannot be verified by sharing a static default credential because none was created.

## Authorization and tenant isolation

| Question | Claude branch | Manus Agency OS branch |
|---|---|---|
| Enforcement location | Firestore security rules | Server-side tRPC procedures, database helpers, and UI guards |
| Role granularity | Five explicit roles plus organization/assignment checks | CEO/admin and client scopes |
| Client isolation | Client organization ID is checked in Firestore rules for project and invoice reads | Linked contact/client association plus legal-acceptance eligibility check before portal data is returned |
| Default posture | Firestore rules deny unknown documents/users and final wildcard denies access | Protected procedure rejects unauthorized callers; client portal rejects incomplete legal acceptance |
| Audit log | Append-only Firestore activity records, CEO-readable | Operational notifications; no equivalent immutable audit-log model was implemented |
| Known trade-off | Rule language is sophisticated and must be continuously tested with emulator scenarios | Server model is easier to centralize but needs more endpoint-level test coverage and operational hardening |

The Claude branch has the more mature **role matrix and rules test design**. Its rules cover anonymous lockout, cross-tenant access, URL-editing attempts, privilege escalation, and field-touch limitations. [5]

The Manus branch has a more straightforward client/CEO boundary, but its independent review found it needs further production hardening: endpoint/UI guard coverage, potential N+1 queries for deliverables, upload size constraints caused by base64 transfer, explicit database UTC/session-timezone checks, and stronger client-binding rules than email matching alone.

## UI, design system, and motion

| Dimension | Claude branch | Manus Agency OS branch |
|---|---|---|
| Primary visual job | Sell Brand Mint services and route prospects into a conversation | Make operations legible for CEO/admin and clients |
| Design system | Hand-rolled mint identity, Instrument Serif/Inter/JetBrains Mono, custom SVG assets | Mint/evergreen semantic tokens, Manrope/Playfair Display/DM Mono, shadcn/Radix primitives |
| Navigation | Public sections plus Studio/Login/Start a project | Persistent dashboard sidebar, CEO workspace, onboarding, client portal, policy pages |
| Motion | Hand-written scroll reveal, sticky nav, hero parallax, and mobile menu behavior [3] | Restrained CSS transitions and entrance animation; `prefers-reduced-motion` is respected for card entrance effects |
| Framer Motion | Not part of the static implementation | Listed as a dependency but not currently imported in client source |
| Lenis | Not used | Listed as a dependency but not currently imported in client source |
| Accessibility evidence | E2E specification checks protected signed-out routes, contrast for sign-in CTA, and password-field placement [5] | Focus-visible styling, shadcn keyboard-capable primitives, responsive screenshots, and reduced-motion CSS; browser E2E suite is absent |

The current Claude branch has a stronger **brand/marketing UI** because that is its product. The current Manus branch has a more appropriate **internal-tool UI**: it uses an editorial serif hierarchy, muted mint surfaces, an operations sidebar, metric cards, and project/invoice/document areas. It is intentionally calmer and more dashboard-like.

However, the requested shortlist polish is not yet fully implemented in the Agency OS. Framer Motion and Lenis were installed, but no client source file currently imports either package. This means the Agency OS does **not** currently have the planned Framer Motion route/panel animation system or selective Lenis scrolling layer. That work should be resumed only after the branch/product decision is made.

## Testing and delivery confidence

| Test / check | Claude branch | Manus Agency OS branch |
|---|---|---|
| Typecheck | Not applicable to its static JavaScript architecture | Passed `pnpm check` |
| Unit tests | Firestore rules suite documented as 21 tests | 7 Vitest tests passed |
| Browser E2E | Isolated execution reported 24 of 25 passing; one content expectation mismatch | No equivalent browser E2E suite |
| Rules/tenant security tests | Firestore emulator suite focuses on tenant isolation and role boundaries | One admin-procedure denial test plus legal/invoice tests; less comprehensive coverage |
| Production deployment | Direct static Vercel deployment; current production restored and verified | Managed development project; not yet a compatible replacement for this Vercel project |

The Claude branch currently provides stronger evidence for **browser-level and Firestore-rule-level** regression testing. The Manus branch provides stronger evidence for **typed backend logic, invoice calculations, and PDF generation**, but it needs end-to-end browser coverage and deeper authorization tests before it should be treated as production-ready for a business-critical operations system.

## Operational risks and decisions required

| Priority | Claude branch decision | Manus Agency OS decision |
|---|---|---|
| Critical | Decide whether Firestore or Supabase is the canonical admin data service; do not maintain duplicate operational truth by accident | Do not promote to the existing Vercel project without a planned server/auth/storage migration |
| High | Review the public marketing claims, service labels, pricing/crore references, and any content you do not approve in a dedicated corrective branch | Replace working-draft legal pages with counsel-approved content before relying on them; keep email/e-signature manual until a provider is approved |
| High | Verify Firebase admin account ownership and recovery process for `admin@brandmintstudios.in` | Expand authorization and browser workflow tests; eliminate base64 upload bottlenecks before larger real documents |
| Medium | Decide whether staff roles beyond client/admin are necessary for the studio | Decide whether the final role model needs partner, finance, and collaborator roles instead of only CEO/admin and client |
| Medium | Add a data migration/backup plan before changing the admin path | Choose final hosting: managed application hosting or a deliberate Vercel/serverless redesign |

## Recommended finalization path

The right immediate posture is to treat the products separately.

**For the live Brand Mint public site:** keep the restored Claude production release as the live baseline because it is already aligned to the existing Vercel project, its custom domain, and its static delivery model. Create a *new corrective Claude branch* to remove only the material you reject—such as unapproved superlatives, project/crore language, or the Supabase admin path—after you identify the affected pages and desired wording. Do not delete Firestore until the true source-of-truth decision has been made.

**For the Agency OS:** retain the Manus branch as an internal product candidate. Before production use, make a specific architectural decision: either keep its existing React/Express/MySQL/S3/Manus OAuth design on compatible managed hosting, or redesign it intentionally to use the same Firebase/Firestore/Vercel ecosystem as the public site. Do not attempt a superficial merge.

**For UI polish:** once the product boundaries are accepted, resume the Agency OS UI task. Implement Framer Motion for modal, status, and route transitions; use Lenis only on the editorial onboarding/policy pages; keep native scrolling on dense dashboard screens; add browser E2E coverage; and validate reduced-motion behavior.

## References

[1]: https://vercel.com/sumanthrb94-3803s-projects/brand-mint-sdmk/9f8i9yZw5qGsJcsCro7RuGdQ72iz "Restored Vercel production deployment"
[2]: https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/blob/manus/brand-mint-agency-os/agency-os/docs/data-model.md "Agency OS data model"
[3]: https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/blob/claude/new-session-glceza/README.md "Claude branch README"
[4]: https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/blob/claude/new-session-glceza/firestore.rules "Claude branch Firestore rules"
[5]: https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/blob/claude/new-session-glceza/tests/README.md "Claude branch test guide"
