# notify-lead

Sends an email + Slack ping the moment a row is inserted into
`public.leads`. Runs as a Supabase Edge Function, triggered by a Database
Webhook.

## One-time setup

1. **Install the Supabase CLI**
   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref ycdfgtljxqrhyobnwwbz
   ```

2. **Create a sending domain on Resend**
   - Sign up at <https://resend.com>, add `brandmint.studio` (or your final
     domain), and verify the DNS records.
   - Generate an API key with `Sending access`.

3. **Set the function secrets**
   ```bash
   supabase secrets set \
     RESEND_API_KEY=re_xxx \
     LEAD_NOTIFY_FROM='Brand Mint <leads@brandmint.studio>' \
     LEAD_NOTIFY_TO='hello@brandmint.studio' \
     WEBHOOK_SECRET="$(openssl rand -hex 24)"

   # optional — Slack incoming webhook for the #leads channel
   supabase secrets set SLACK_WEBHOOK_URL='https://hooks.slack.com/services/…'
   ```

4. **Deploy the function**
   ```bash
   supabase functions deploy notify-lead --no-verify-jwt
   ```

5. **Wire up the Database Webhook**
   Supabase Dashboard → Database → Webhooks → *Create a new hook*

   | Field          | Value                                 |
   |----------------|---------------------------------------|
   | Name           | `notify-lead`                         |
   | Schema / Table | `public.leads`                        |
   | Events         | `INSERT`                              |
   | Type           | Supabase Edge Function                |
   | Function       | `notify-lead`                         |
   | HTTP Headers   | `x-bm-secret: <value from step 3>`    |

   Save. Insert a test row into `public.leads` (or fill out the contact
   form on the site) — you should get an email within seconds.

## Updating

```bash
supabase functions deploy notify-lead --no-verify-jwt
```

Logs:
```bash
supabase functions logs notify-lead --tail
```

## Notes

- Resend's free tier is 3,000 emails / month — plenty for inbound leads.
- The Slack ping is optional; the function silently skips it if
  `SLACK_WEBHOOK_URL` isn't set.
- The webhook secret prevents a public-internet attacker from invoking
  the function directly with a fake lead payload.
