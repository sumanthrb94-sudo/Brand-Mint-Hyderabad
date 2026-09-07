# Self-hosting on the GCP free-tier VM

`instance-20260902-225139` · **e2-micro, 2 shared vCPU, 1 GB RAM** ·
`us-central1-a` · Debian 13.

That instance qualifies for Google's always-free tier (one e2-micro a month in
`us-west1`, `us-central1` or `us-east1`, plus 30 GB of standard disk). It is a
genuinely useful box, but three limits decide what belongs on it.

## The three limits, in the order they will bite you

**1. Egress is capped at 1 GB a month.** Not CPU, not RAM — this is the one
that generates a bill. Inbound is free; everything the VM *sends* counts. Set
a budget alert at ₹100 before you start (Billing → Budgets & alerts) so a
runaway process cannot quietly cost you thousands.

**2. 1 GB of RAM.** Fine for one small Go or Node service. Not enough for
Chatwoot (wants 2–4 GB), and cramped for Listmonk once Postgres is beside it.
Configure swap regardless — Node processes on a 1 GB box OOM without it.

**3. us-central1 is ~250 ms from Hyderabad.** Fine for a dashboard you check
now and then. Never put anything client-facing on it.

## What to run, and what not to

| | Verdict |
|---|---|
| **Uptime Kuma** | **Yes.** ~200 MB RAM. Monitors every client site, alerts you on WhatsApp or Telegram, and gives clients a status page. |
| Listmonk | Later. It fits, barely, but Resend's free tier covers you for a long time and Listmonk still needs an SMTP relay. |
| Chatwoot | No. Not on 1 GB. |
| A mail server | **Impossible.** GCP blocks outbound TCP 25 on every instance, permanently. See `SETUP-EMAIL.md`. |
| The website | No. It stays on Vercel — free, global, zero ops. One VM in Iowa is a downgrade. |
| Firebase | No. Free at your volume, and it is the security boundary. |

## Why Uptime Kuma first

You sell care plans at ₹12,500–₹50,000 a month that promise *"uptime and
speed monitoring"*. Today you have no way to deliver that. This makes the
promise true, on a box you already have, for nothing.

## Setup

### 1. Prepare the VM

Start the instance, then SSH in from the console and run:

    curl -fsSL https://raw.githubusercontent.com/sumanthrb94-sudo/Brand-Mint-Hyderabad/main/selfhost/setup-vm.sh | sudo bash

That adds swap, installs Docker, and enables unattended security updates.
Read the script first — never pipe something into `sudo bash` without doing
that, including this.

### 2. Expose it without opening a single port

**Do not** give the VM a static IP and open 80/443. A reserved static IP bills
whenever the instance is stopped, and an open port on a box you patch by hand
is a liability.

Use a **Cloudflare Tunnel** instead. It is free, needs no inbound ports and no
static IP, survives the ephemeral IP changing every time you stop the VM, and
terminates TLS at Cloudflare — which you are already using for email routing.

    # on the VM
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
    sudo apt update && sudo apt install -y cloudflared
    cloudflared tunnel login
    cloudflared tunnel create brandmint
    cloudflared tunnel route dns brandmint status.brandmintstudios.in

Then point the tunnel at the container in `~/.cloudflared/config.yml`:

    tunnel: brandmint
    credentials-file: /home/YOU/.cloudflared/<tunnel-id>.json
    ingress:
      - hostname: status.brandmintstudios.in
        service: http://localhost:3001
      - service: http_status:404

    sudo cloudflared service install

### 3. Run Uptime Kuma

    git clone https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad.git
    cd Brand-Mint-Hyderabad/selfhost/uptime-kuma
    docker compose up -d

Open `https://status.brandmintstudios.in`, set the admin password on first
load, and add the monitors.

### 4. Keep egress under 1 GB

- **Check every 5 minutes, not every 60 seconds.** Five sites at 60s is
  roughly 200 MB a month of outbound requests; at 5 minutes it is under 50 MB.
- Turn on Cloudflare proxying for the status page so repeat loads are served
  from their edge, not from Iowa.
- Watch Billing → Reports for the first month.

## A governance note

This VM lives in a GCP project named **Freshkart** — a client. Brand Mint's
own infrastructure should not sit inside a project named after a customer:
billing, access and deletion all get tangled the day that relationship
changes. Create a `brand-mint` project and move it when convenient.
