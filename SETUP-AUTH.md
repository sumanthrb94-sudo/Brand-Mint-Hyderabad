# Turning on real logins — 15 minutes, once

Everything in the code is done. These are the steps only you can do, because
they live in the Supabase and Google dashboards.

**Until you finish step 1 and step 4, `/admin` will not open for anyone —
including you.** That is deliberate: the old admin had no real lock on it.

Do them in order.

---

## What you're building

Two doors, one database.

| | You (agency) | Your client |
|---|---|---|
| URL | `/admin` | `/portal` |
| Who gets in | `profiles.role = 'admin'` | anyone you've invited |
| How they sign in | Google, or emailed link | Google, or emailed link |
| What they see | every lead, client, invoice, project | only their own workspace |
| Enforced by | RLS policies on the database | the same RLS policies |

Both doors are behind one sign-in page at `/login`, which works out where to
send someone after they authenticate. Your client never sees the admin exists.

---

## Step 1 — Run the migration

1. Open your project: <https://supabase.com/dashboard/project/ycdfgtljxqrhyobnwwbz>
2. **SQL Editor → New query**
3. Paste the entire contents of `supabase/migrations/0001_auth_portal_onboarding.sql`
4. **Run**

It is safe to run twice. It creates the `profiles`, `client_users`, `invites`,
`milestones`, `deliverables`, `messages` and `onboarding_responses` tables, links
your existing `projects`/`invoices` rows to a client by id, and switches on Row
Level Security across every table.

> **This is the important one.** The anon key is published in the browser
> bundle — it always has been. RLS is what turns that from a problem into a
> non-problem. Before this migration, anyone who found `/admin.html` could read
> your leads, clients, invoices and bank details.

**Check it worked:** Table Editor should now list the new tables, and each one
should show an "RLS enabled" badge.

---

## Step 2 — Set the redirect URLs

**Authentication → URL Configuration**

- **Site URL:** `https://brand-mint-sdmk.vercel.app`
  (change this to your custom domain once `brandmint.studio` is pointed)
- **Redirect URLs** — add each of these on its own line:
  ```
  https://brand-mint-sdmk.vercel.app/**
  http://localhost:8000/**
  ```

Vercel also builds a preview URL for every branch push. If you want sign-in to
work on previews too, add `https://*-your-vercel-team.vercel.app/**`.

Without this, Google will bounce back with a `redirect_to is not allowed` error.

---

## Step 3 — Switch on Google sign-in

**A. Create the Google credentials**

1. <https://console.cloud.google.com/apis/credentials> → create or pick a project
2. **Configure consent screen** → External → fill in app name, your support
   email, and the developer email. Save. (You can leave it in "Testing" while
   you try it out; add your own and your client's Gmail under **Test users**.
   Publish it before you onboard real clients, or only test users can sign in.)
3. **Create Credentials → OAuth client ID → Web application**
4. **Authorised redirect URI** — exactly this, no trailing slash:
   ```
   https://ycdfgtljxqrhyobnwwbz.supabase.co/auth/v1/callback
   ```
5. Copy the **Client ID** and **Client secret**

**B. Paste them into Supabase**

**Authentication → Providers → Google** → toggle **Enabled**, paste both
values, **Save**.

> Prefer not to do this today? Skip it. The email magic-link option on `/login`
> works with no setup at all, and the Google button will tell the user to use
> the link instead. You can come back and switch Google on later without
> touching any code.

---

## Step 4 — Make yourself the admin

You cannot grant yourself admin from inside the app; that is the point. Do it
once in SQL.

1. Go to `https://brand-mint-sdmk.vercel.app/login` and sign in with the Google
   account you'll use as the studio (`mintstudios823@gmail.com`, or whichever
   you prefer). You'll land on the portal and it'll say no workspace is linked
   — that's correct, you aren't a client.
2. Back in **SQL Editor**, run:

   ```sql
   update public.profiles
      set role = 'admin'
    where email = 'mintstudios823@gmail.com';
   ```

3. Reload `/admin`. You're in.

Repeat step 2 for any teammate who should have full access.

---

## Step 5 — Onboard your first client

This is the flow you'll run for every client from now on.

1. **`/admin` → Onboarding → "+ Invite client"**
   Pick an existing client or create a new one, and enter the email address
   attached to their Google account.
2. **Copy the message** the dialog gives you and send it — WhatsApp, email,
   however you normally talk to them. Nothing is emailed automatically.
3. **They open `/login`** and hit *Continue with Google*. The database trigger
   turns your pending invite into a real membership the moment their account is
   created, so they land straight in their own workspace. No password is ever
   created, sent, or stored.
4. **They fill the brief** — five steps, autosaved. You see the percentage tick
   up live in the Onboarding table.
5. **They submit.** It shows up under "Needs you" on your dashboard.
6. **You read it and hit "Kick off project."** That creates their project, five
   standard milestones and a first message. From their side, their portal turns
   from a form into a live project view.

From then on: you add deliverables under **Delivery** and hit *Send to client*;
they approve or request changes; anything they say lands in your thread and
badges your sidebar.

---

## Checking it actually locked

Worth five minutes, once.

1. Open `/admin` in a **private window** with no session. You should be bounced
   to `/login`, not shown the dashboard.
2. In that window, open devtools and run:
   ```js
   localStorage.setItem("sb-ycdfgtljxqrhyobnwwbz-auth-token",
     JSON.stringify({ access_token: "fake", expires_at: 9999999999 }));
   ```
   Reload `/admin`. The shell may flash, but you must end up back at `/login` —
   and even if it didn't, every query would come back empty. That is RLS doing
   its job, and it's why the client-side check is only a convenience.
3. Sign in as a test client and confirm the portal shows only their rows.

---

## Things worth knowing

**Nothing is emailed automatically.** Invites are a copy-paste message today.
If you want a real invite email, Supabase Edge Functions plus Resend is the
usual route — say the word and it can be wired to the same `invites` table.

**Deliverable files are links, not uploads.** Paste a Google Drive, Figma or
WeTransfer URL. Supabase Storage with per-client buckets is the upgrade when
you want files living in one place.

**One person, several clients.** The `client_users` table is a join table, so
the same email can be attached to more than one client. The portal currently
shows the first; a workspace switcher is a small addition when you need it.

**Rotating the anon key** (Supabase → Settings → API) means updating it in
three files: `admin/config.js`, `auth/session.js`, and `script.js`. The old key
keeps working until you disable it, so there's no downtime.

**The demo accounts are gone.** `admin@brandmint.studio / Admin@2026` and the
other two hard-coded logins have been removed from `auth/marketing.js`, along
with the `bm.demo.session` key they wrote. Any browser still holding one has it
cleared on next page load.
