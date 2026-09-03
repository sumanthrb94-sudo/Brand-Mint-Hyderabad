/**
 * Portal data layer.
 *
 * Deliberately thinner than admin/db.js: no localStorage mirror, no seeding,
 * no offline queue. A client's device is not somewhere to cache someone's
 * commercial data, and every read here is already scoped by RLS to the
 * client(s) they belong to — this module never filters for security, it
 * filters for display.
 *
 * Everything is async and returns plain camelCase objects.
 */

import { getClient, getProfile } from "/auth/session.js";

const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

function fromRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out;
}
function toRow(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[toSnake(k)] = v;
  return out;
}

let _clientId = null;

/** The client workspace this user is viewing. */
export async function activeClientId() {
  if (_clientId) return _clientId;
  const profile = await getProfile();
  _clientId = profile?.clientIds?.[0] || null;
  return _clientId;
}

async function select(table, build) {
  const sb = await getClient();
  const clientId = await activeClientId();
  if (!clientId) return [];
  let q = sb.from(table).select("*").eq("client_id", clientId);
  if (build) q = build(q);
  const { data, error } = await q;
  if (error) {
    console.error(`[portal] load ${table}`, error);
    throw error;
  }
  return (data || []).map(fromRow);
}

/* ------------------------------------------------------------------ reads */

export async function loadWorkspace() {
  const clientId = await activeClientId();
  if (!clientId) return null;

  const sb = await getClient();
  const [
    clientRes,
    projects,
    milestones,
    deliverables,
    invoices,
    messages,
    briefRes,
  ] = await Promise.all([
    sb.from("clients").select("*").eq("id", clientId).maybeSingle(),
    select("projects"),
    select("milestones", (q) => q.order("position", { ascending: true })),
    select("deliverables", (q) => q.order("created_at", { ascending: false })),
    select("invoices", (q) => q.order("issue_date", { ascending: false })),
    select("messages", (q) => q.order("created_at", { ascending: true })),
    sb.from("onboarding_responses").select("*").eq("client_id", clientId).maybeSingle(),
  ]);

  return {
    clientId,
    client: fromRow(clientRes.data) || { id: clientId, name: "Your workspace" },
    projects,
    milestones,
    // A draft deliverable is hidden by RLS, but filter too so a policy change
    // can never surprise a client with unfinished work.
    deliverables: deliverables.filter((d) => d.status !== "draft"),
    invoices,
    messages,
    brief: fromRow(briefRes.data) || null,
  };
}

/* ----------------------------------------------------------------- writes */

/** Create-or-update the brief. Saves on every step so nothing is lost. */
export async function saveBrief({ answers, step, status }) {
  const sb = await getClient();
  const clientId = await activeClientId();
  const profile = await getProfile();
  if (!clientId) throw new Error("No workspace linked to this account.");

  const payload = toRow({
    clientId,
    submittedBy: profile.id,
    answers,
    step,
    status,
    updatedAt: new Date().toISOString(),
  });
  if (status === "submitted") payload.submitted_at = new Date().toISOString();

  const { data, error } = await sb
    .from("onboarding_responses")
    .upsert(payload, { onConflict: "client_id" })
    .select()
    .maybeSingle();
  if (error) throw error;

  // Keep the admin's funnel column honest.
  await sb
    .from("clients")
    .update({ onboarding_status: status === "submitted" ? "submitted" : "in_progress" })
    .eq("id", clientId);

  return fromRow(data);
}

/** Record the client's verdict on a deliverable. */
export async function reviewDeliverable(id, verdict, note) {
  const sb = await getClient();
  const patch = {
    status: verdict === "approve" ? "approved" : "revision_requested",
    revision_note: verdict === "approve" ? null : (note || "").trim() || null,
  };
  const { error } = await sb.from("deliverables").update(patch).eq("id", id);
  if (error) throw error;
}

export async function postMessage(body, projectId = null) {
  const sb = await getClient();
  const clientId = await activeClientId();
  const profile = await getProfile();
  const { error } = await sb.from("messages").insert({
    client_id: clientId,
    project_id: projectId,
    author_id: profile.id,
    author_name: profile.fullName || profile.email,
    author_role: "client",
    body,
  });
  if (error) throw error;
}

export async function markThreadRead(messages) {
  const unread = messages.filter((m) => m.authorRole === "admin" && !m.readByClient);
  if (!unread.length) return;
  const sb = await getClient();
  await sb
    .from("messages")
    .update({ read_by_client: true })
    .in("id", unread.map((m) => m.id));
}

/* -------------------------------------------------------------- realtime */

/** Re-run `onChange` whenever the studio touches this client's data. */
export async function watch(onChange) {
  const sb = await getClient();
  const clientId = await activeClientId();
  if (!clientId) return () => {};

  const channel = sb.channel(`portal-${clientId}`);
  for (const table of ["milestones", "deliverables", "messages", "invoices", "projects"]) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `client_id=eq.${clientId}` },
      () => onChange(table)
    );
  }
  channel.subscribe();
  return () => sb.removeChannel(channel);
}
