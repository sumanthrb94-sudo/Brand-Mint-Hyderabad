# Firebase Authentication Setup — Brand Mint Agency OS

The application uses Firebase Authentication in the browser and Firebase Admin on Vercel. **Google is the sole public sign-in method.** The current owner email is `sumanthbolla97@gmail.com`, configured in Vercel as the sole initial value for `FIREBASE_ADMIN_EMAILS`.

## Required authorised domains

In **Firebase Console → Authentication → Settings → Authorised domains**, add the following domains without protocol, path, or trailing slash:

| Environment | Domain |
| --- | --- |
| Production | `brandmintstudios.in` |
| Production | `www.brandmintstudios.in` |
| Vercel preview | `brand-mint-sdmk-git-manus-bra-30cf5f-sumanthrb94-3803s-projects.vercel.app` |
| Firebase hosted auth | `brandmintstudios.firebaseapp.com` |

For any deployment with a temporary Vercel URL, use the stable branch-preview domain above rather than adding individual deployment URLs.

### Confirmed console state — 14 August 2026

The Firebase project is `brandmintstudios-a5eb7`. Google is enabled. The following domains were confirmed in the Firebase authorised-domain list: `brandmintstudios.in`, `www.brandmintstudios.in`, the prior Claude branch preview domain, and `brand-mint-sdmk-git-manus-bra-30cf5f-sumanthrb94-3803s-projects.vercel.app`.

## Provider configuration

Google sign-in must be enabled with the project support email configured in Firebase. Phone/SMS sign-in is intentionally absent from the Agency OS interface. Firebase lists Phone Auth as unavailable on the Spark plan and billed per SMS on Blaze, so removing the path avoids presenting a billing-dependent access option to users.[^firebase-pricing]

## Vercel variables

Apply all values to both **Production** and **Preview** environments, then redeploy.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_CONFIG` | Browser Firebase configuration JSON. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Encrypted Firebase Admin credential. |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name. |
| `FIREBASE_ADMIN_EMAILS` | Comma-separated CEO/admin allowlist; initial value: `sumanthbolla97@gmail.com`. |

Never commit the service-account JSON or a `.env` file.

[^firebase-pricing]: https://firebase.google.com/pricing
