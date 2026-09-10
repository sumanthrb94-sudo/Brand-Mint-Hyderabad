# WhatsApp automation on a VPS — Brand Mint's own number

**Scope: our line only.** This is Evolution API, a REST wrapper around Baileys,
which reverse-engineers the WhatsApp Web protocol. It breaches Meta's terms and
numbers do get banned. That is a risk we can choose to take on a spare SIM of
ours. It is **not** what we sell: `shared/platform.js` promises clients the
official WhatsApp Business API on their own Meta account, and that promise
stands. Nothing here goes near a client's number.

## Which number

Not `+91 77999 34943`. It is on the site, in every `wa.me` link, on the video
end card and on invoices, and a ban takes it off the phone too — there is no
partial failure.

Buy a prepaid SIM for it. Counter-intuitively a new number is *more* likely to
be banned than an aged one, because account age is weighted heavily in the spam
heuristics and a fresh number that starts automating looks like exactly what
they hunt. That is the trade: the business line is less likely to be banned but
catastrophic if it is; a spare SIM is more likely and costs ₹300.

Before it does anything, use it like a person for a week or two — real
conversations, replies both ways. An aged number with organic history survives
far more.

**Reply only to people who message first.** Bans come overwhelmingly from
outbound patterns, blocks and reports. Inbound-triggered replies barely
register. Whatever else this does, it should not start conversations.

## The VPS

Hetzner CX22, ~€3.79/mo, Ubuntu 24.04. Anything with 2GB+ RAM and a persistent
disk works; this needs an always-on process, which is why Vercel, Cloudflare
Workers and Firebase Functions cannot host it — they are serverless, the
process dies between requests, and the WhatsApp session dies with it.

```bash
# on a fresh box, as root
adduser bm && usermod -aG sudo bm
curl -fsSL https://get.docker.com | sh
usermod -aG docker bm

ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw enable        # note: 8080 is NOT opened — Caddy reaches it over the docker network
```

## docker-compose.yml

```yaml
services:
  evolution:
    image: atendai/evolution-api:latest      # pin a real version tag in production
    restart: always
    depends_on: [postgres, redis]
    environment:
      - SERVER_URL=https://wa.brandmintstudios.in
      - AUTHENTICATION_API_KEY=${EVO_KEY}     # long random string, not a word
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evo:${PG_PASS}@postgres:5432/evolution
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://redis:6379
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=https://brandmintstudios.in/api/wa-hook
    volumes:
      - evo_instances:/evolution/instances    # THE session lives here
    expose: ["8080"]                          # expose, not ports — never public

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=evo
      - POSTGRES_PASSWORD=${PG_PASS}
      - POSTGRES_DB=evolution
    volumes: [pg:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    restart: always
    volumes: [redis:/data]

  caddy:
    image: caddy:2-alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on: [evolution]

volumes: { evo_instances: , pg: , redis: , caddy_data: }
```

`Caddyfile` — two lines, and TLS is automatic:

```
wa.brandmintstudios.in {
  reverse_proxy evolution:8080
}
```

Env var names shift between Evolution v1 and v2. Check the docs for the tag you
pin rather than trusting this file.

## The three things that actually break it

**`evo_instances` must be a real named volume.** The WhatsApp session lives
there. Miss it and you re-scan the QR on every restart, every deploy, every
crash — and repeated re-pairing is itself a ban signal. This is the single most
common self-hosting complaint.

**`AUTHENTICATION_API_KEY` must be long and random, and 8080 must never be
public.** An exposed Evolution instance with a weak key means anyone who finds
it sends WhatsApp messages as us. People scan for these. `expose:` publishes to
the docker network only; `ports:` would publish to the world.

**Back up `evo_instances` and the Postgres volume.** Losing the session means
re-pairing, and re-pairing repeatedly is what gets numbers flagged.

## DNS

Cloudflare, where our zone already is. `A` record `wa` → the VPS IP.

**Grey-cloud it (DNS only, proxy off).** Caddy needs to reach port 80 directly
to issue and renew its certificate; with Cloudflare's proxy on, that challenge
fails and TLS silently stops renewing 90 days later.

## Pairing

```bash
curl -X POST https://wa.brandmintstudios.in/instance/create \
  -H "apikey: $EVO_KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"brandmint","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
```

Returns a QR payload. On the phone: **Settings → Linked Devices → Link a
Device**, scan it. The VPS is now a linked device — the phone stays a normal
WhatsApp and keeps working.

Confirm with `GET /instance/connectionState/brandmint`. If the phone's WhatsApp
is uninstalled or the number re-registered elsewhere, the link dies and you
re-scan.

## Wiring it into the site

`WEBHOOK_GLOBAL_URL` points at a new `api/wa-hook.js` on Vercel. Same shape as
`api/book.js`: verify the request, write the enquiry to Firestore so it lands in
Admin → Leads, then reply through Evolution's `/message/sendText/brandmint`.

That endpoint is public, so it must verify the caller — an unauthenticated
webhook is a way to write junk straight into our leads collection.

## Before spending anything

If this is a handful of enquiries a day, the WhatsApp Business app does it free
with quick replies and labels, and carries no ban risk at all. Self-hosting
earns its keep when enquiries have to land in the admin dashboard automatically
— which is the Site + CRM feature we sell, and the reason to build it here first
on a number of ours rather than learning on a client's.
