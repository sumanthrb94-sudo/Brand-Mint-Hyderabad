# Firebase-backed Vercel preview

This branch runs the Agency OS on **Vercel serverless functions** with the existing Firebase project. It deliberately contains **no Razorpay integration** and does not include credentials in source control.

## Vercel project settings

Set the existing Vercel project’s **Root Directory** to `agency-os`. Vercel then reads `agency-os/vercel.json`, runs `vite build`, serves `dist/public`, and deploys the `api/` directory as serverless functions.

Create a **preview deployment first**. Do not promote it to production until public onboarding, Firebase sign-in, CEO access, client portal access, invoice generation, and a secure file download have been checked.

## Environment variables

Add the following variables in Vercel for **Preview** and **Production**. Keep all values encrypted in Vercel; do not place them in `.env` files committed to Git.

| Variable | Scope | Purpose |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server only | Complete Firebase Admin SDK service-account JSON. Enables Firebase Auth token verification, Firestore, and Firebase Storage. |
| `FIREBASE_STORAGE_BUCKET` | Server only | Existing bucket name: `brandmintstudios-a5eb7.firebasestorage.app`. |
| `FIREBASE_ADMIN_EMAILS` | Server only | Comma-separated Google-account email addresses permitted to operate the CEO/admin workspace. |
| `VITE_FIREBASE_CONFIG` | Browser build | One JSON object containing the existing Firebase Web App configuration: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. |

The `VITE_FIREBASE_CONFIG` value is browser configuration, not an Admin SDK credential. The service-account JSON and admin-email allowlist must remain server-side.

## Firebase console checks

Enable the **Google** sign-in provider in Firebase Authentication and authorize the Vercel preview and production hostnames under Authentication → Settings → Authorized domains. Ensure Firestore is provisioned and that the supplied service account can read/write Firestore and the configured Storage bucket.

## Security model

The browser signs in through Firebase Authentication and attaches a Firebase ID token to protected API calls. The serverless API verifies that token with Firebase Admin. An account becomes an admin only when its email appears in `FIREBASE_ADMIN_EMAILS`; there is no default administrator username or password. Client portal access additionally requires an onboarding contact email match and acceptance of Terms, Privacy, Cookies, and the service agreement.

## Manual preview validation

1. Load `/` and verify public ecommerce content, policies, and enquiry/onboarding links.
2. Submit a new onboarding record with all four required legal acceptances.
3. Sign in with an email in `FIREBASE_ADMIN_EMAILS` and verify `/admin` loads.
4. Create a project, document, and invoice. Confirm the invoice PDF is created and stored securely.
5. Sign in with the onboarding email and confirm `/portal` shows only that client’s eligible records.
6. Confirm that a client cannot access another client’s file URL or CEO routes.

> Legal-policy pages remain working drafts and require legal review before public publication.
