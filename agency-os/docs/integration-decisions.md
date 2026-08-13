# Brand Mint Studios Agency OS — Integration Decisions

The existing Brand Mint Studios website uses a calm premium visual language with an ivory background, deep evergreen type, fresh mint accents, concise operational labels, and editorial display typography. The Agency OS interface follows that existing language without introducing an unrelated visual direction.

## E-signature and automated email status

The platform stores document records, signature state, legal acceptance events, owner alerts, and S3-backed finalized files. A third-party e-signature service and transactional email provider have not been selected or connected in this project. Their credentials, sender/domain verification, end-user delivery, legally appropriate audit trail, and event callbacks must be configured before the project can claim provider-backed e-signature delivery or automatic client email delivery.

The DocuSign developer webhooks page was checked on 13 August 2026, but its documentation content did not load in the available research environment. No provider-specific webhook claim is therefore embedded in this application pending confirmed provider documentation and user-approved credentials.

## Selected operating model

The user selected the provider-independent operating model. Brand Mint Studios will use the platform for client onboarding, legal-acceptance records, project delivery, document status, S3-backed document/invoice files, billing records, and CEO alerts. The CEO remains responsible for sending any client email through approved existing channels, initiating and completing signatures through an approved existing signing process, uploading finalized PDF records, and updating the corresponding document status in the Agency OS.

This choice intentionally does not claim automated client email delivery, provider-backed e-signature sending, signature audit-trail verification, email delivery tracking, or provider event callbacks. These capabilities may be added only after Brand Mint Studios selects an approved provider, verifies its domain/account requirements, and supplies the required credentials.
