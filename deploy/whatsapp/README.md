# WhatsApp box — deploy

Background, the number choice and the risks are in `/SETUP-WHATSAPP.md`. This
is just the run sheet.

```bash
git clone https://github.com/sumanthrb94-sudo/Brand-Mint-Hyderabad.git
cd Brand-Mint-Hyderabad/deploy/whatsapp
cp .env.example .env
openssl rand -hex 32   # EVO_KEY
openssl rand -hex 32   # PG_PASS
nano .env
docker compose up -d
docker compose logs -f evolution
```

Point `wa.brandmintstudios.in` at the instance IP in Cloudflare first, **proxy
off**, and give it a minute before starting Caddy — it needs the name to resolve
to issue the certificate.

Pair the number:

```bash
source .env
curl -X POST https://$WA_HOST/instance/create \
  -H "apikey: $EVO_KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"brandmint","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
```

Scan the QR from the phone: **Settings → Linked Devices → Link a Device**.

```bash
curl -H "apikey: $EVO_KEY" https://$WA_HOST/instance/connectionState/brandmint
```

## Back up the session

Losing `evo_instances` means re-pairing, and repeated re-pairing is itself a ban
signal.

```bash
docker run --rm -v whatsapp_evo_instances:/d -v $PWD:/b alpine \
  tar czf /b/evo-session-$(date +%F).tgz -C /d .
```
