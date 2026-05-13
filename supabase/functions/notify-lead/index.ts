// Supabase Edge Function: notify-lead
//
// Triggered by a Database Webhook on `public.leads` (INSERT). Posts a
// formatted email to the studio inbox via Resend, and optionally pings a
// Slack incoming webhook so the team gets a real-time nudge.
//
// Required environment variables (set with `supabase secrets set …`):
//   RESEND_API_KEY      — from https://resend.com/api-keys
//   LEAD_NOTIFY_FROM    — e.g. "Brand Mint <leads@brandmint.studio>"
//   LEAD_NOTIFY_TO      — comma-separated list, e.g. "hello@brandmint.studio"
// Optional:
//   SLACK_WEBHOOK_URL   — incoming webhook for the #leads channel
//   WEBHOOK_SECRET      — shared secret; if set, the function rejects
//                         requests without a matching `x-bm-secret` header
//
// Deploy:
//   supabase functions deploy notify-lead --no-verify-jwt
//
// Wire it up:
//   Dashboard → Database → Webhooks → "Create a new hook"
//     Name:    notify-lead
//     Table:   public.leads
//     Events:  INSERT
//     Type:    Supabase Edge Function
//     Function: notify-lead
//     HTTP Headers (if you set WEBHOOK_SECRET):
//       x-bm-secret: <same value>

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Lead = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  project_type?: string | null;
  budget?: string | null;
  message?: string | null;
  source?: string | null;
  score?: number | null;
  created_at?: string | null;
};

const RESEND_API = "https://api.resend.com/emails";

function esc(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderEmail(lead: Lead): { subject: string; html: string; text: string } {
  const who = lead.name || lead.email || "Someone";
  const subject = `New lead — ${who}${lead.project_type ? ` · ${lead.project_type}` : ""}`;
  const rows: Array<[string, unknown]> = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Company", lead.company],
    ["Project type", lead.project_type],
    ["Budget", lead.budget],
    ["Source", lead.source],
    ["Score", lead.score],
    ["Received", lead.created_at],
  ];
  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#5d7368;font-size:13px;">${k}</td><td style="padding:6px 0;font-size:14px;color:#0b1f1a;">${esc(v)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7f4;margin:0;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #d8e0d4;border-radius:16px;padding:28px;">
    <div style="font-family:ui-monospace,Menlo,monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#5d7368;">New inquiry</div>
    <h1 style="margin:8px 0 18px;font-size:22px;color:#0b1f1a;">${esc(subject)}</h1>
    <table cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${tableRows}</table>
    ${
      lead.message
        ? `<div style="margin-top:20px;padding-top:18px;border-top:1px solid #ecefe9;color:#294a40;font-size:14px;white-space:pre-wrap;line-height:1.6;">${esc(lead.message)}</div>`
        : ""
    }
  </div>
</body></html>`;
  const text =
    rows.map(([k, v]) => `${k}: ${v ?? "—"}`).join("\n") +
    (lead.message ? `\n\n${lead.message}` : "");
  return { subject, html, text };
}

async function sendEmail(lead: Lead) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("LEAD_NOTIFY_FROM");
  const to = (Deno.env.get("LEAD_NOTIFY_TO") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!apiKey || !from || to.length === 0) {
    console.warn("[notify-lead] email env not configured; skipping");
    return;
  }
  const { subject, html, text } = renderEmail(lead);
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
      reply_to: lead.email || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[notify-lead] resend failed", res.status, body);
  }
}

async function pingSlack(lead: Lead) {
  const url = Deno.env.get("SLACK_WEBHOOK_URL");
  if (!url) return;
  const who = lead.name || lead.email || "Someone";
  const lines = [
    `*New lead* — ${who}`,
    lead.email ? `• Email: ${lead.email}` : null,
    lead.project_type ? `• Type: ${lead.project_type}` : null,
    lead.budget ? `• Budget: ${lead.budget}` : null,
    lead.company ? `• Company: ${lead.company}` : null,
    lead.message ? `> ${lead.message.slice(0, 280)}` : null,
  ].filter(Boolean);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: lines.join("\n") }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[notify-lead] slack failed", res.status, body);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-bm-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  // Supabase Database Webhooks send: { type, table, schema, record, old_record }
  const lead: Lead = payload?.record ?? payload?.new ?? payload;
  if (!lead || (!lead.email && !lead.name)) {
    return new Response("no lead in payload", { status: 400 });
  }

  await Promise.allSettled([sendEmail(lead), pingSlack(lead)]);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
