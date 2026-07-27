import Link from "next/link";
import {
  BREAK_EVEN, signedMrr, proposedMrr, medianFirstResponse, openLeadCount,
  allLeads, allProjects, allMilestones, allIntake, allInvoices,
  activeClients, internalOrgs, archivedOrgs, getOrg, daysSince, inr,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Admin() {
  const signed = signedMrr();
  const proposed = proposedMrr();
  const pct = Math.min(100, Math.round((signed / BREAK_EVEN) * 100));
  const proposedPct = Math.min(100 - pct, Math.round((proposed / BREAK_EVEN) * 100));
  const median = medianFirstResponse();
  const openLeads = openLeadCount();
  const leads = allLeads();
  const projects = allProjects();
  const milestones = allMilestones();
  const intake = allIntake();
  const invoices = allInvoices();

  const due = invoices.filter((i) => i.status === "due").reduce((s, i) => s + i.amount, 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <h1>Studio dashboard</h1>
      <p className="sub">Signed revenue only. A proposal is not money.</p>

      <div className="grid g2">
        <div className="card">
          <h3>Recurring revenue — signed</h3>
          <div className="big">
            {inr(signed)}<span style={{ fontSize: 14, color: "var(--muted)" }}> / month</span>
          </div>
          <div className="bar">
            <div className="fill" style={{ width: `${pct}%` }} />
            <div className="fill" style={{ width: `${proposedPct}%`, background: "var(--s2)", opacity: 0.45 }} />
            <div className="be" style={{ left: "100%" }}>
              <span className="belab">break-even {inr(BREAK_EVEN)}</span>
            </div>
          </div>
          <p className="mini">
            <strong>{inr(BREAK_EVEN - signed)} below the line.</strong>{" "}
            {inr(proposed)} more is proposed but unsigned — the faded bar.
          </p>
          <p className="hint">
            Even if every proposal converts you are still {inr(Math.max(0, BREAK_EVEN - signed - proposed))} short.
            Collected {inr(collected)} · outstanding {inr(due)}
          </p>
        </div>

        <div className="card">
          <h3>Pipeline</h3>
          <div className="big" style={{ color: openLeads === 0 ? "var(--crit)" : "var(--good)" }}>
            {openLeads}
          </div>
          <p className="mini">
            {openLeads === 0
              ? "No open leads. This is the number that decides the month — not the dashboard."
              : `${openLeads} open. Median first response ${median === null ? "—" : median < 60 ? `${median}m` : `${Math.round(median / 60)}h`}.`}
          </p>
          <p className="hint">
            Won {leads.filter((l) => l.stage === "won").length} · lost or cold{" "}
            {leads.filter((l) => l.stage === "lost").length}. Industry median first
            response is ~42 hours; under five minutes makes qualification ~21× more likely.
          </p>
        </div>
      </div>

      <h2>Delivery health</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Project</th><th>Next milestone</th><th>Waiting on</th>
              <th className="num">Due</th><th>Health</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const next = milestones.find((m) => m.projectId === p.id && m.status !== "done");
              const open = intake.filter((i) => i.projectId === p.id && !i.done);
              const oldest = open.length ? Math.max(...open.map((i) => daysSince(i.raisedAt))) : 0;
              const health = oldest > 3 ? "r" : oldest > 0 ? "y" : "g";
              const label = oldest > 3 ? `Blocked ${oldest}d` : oldest > 0 ? "At risk" : "On track";
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/clients/${p.orgId}`}>{getOrg(p.orgId)?.name}</Link>
                    {!p.billable && <span className="tag" style={{ marginLeft: 8 }}>unpaid</span>}
                  </td>
                  <td>{next?.title ?? "—"}</td>
                  <td>
                    {next ? (
                      <span className={"tag " + (next.owner === "client" ? "cl" : "us")}>
                        {next.owner === "client" ? "Client" : "Us"}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{p.dueAt}</td>
                  <td><span className={"dot " + health} />{label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">
          Two of these four are unpaid. That is a capacity decision, not an accident.
        </p>
      </div>

      <h2>Active clients</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th>Client</th><th className="num">Retainer</th><th>Open items</th><th className="num">Revenue to date</th></tr>
          </thead>
          <tbody>
            {activeClients().map((o) => {
              const ps = projects.filter((p) => p.orgId === o.id);
              const open = intake.filter((i) => ps.some((p) => p.id === i.projectId) && !i.done).length;
              const rev = invoices.filter((n) => n.orgId === o.id && n.status === "paid")
                .reduce((s, n) => s + n.amount, 0);
              return (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/clients/${o.id}`}>{o.name}</Link>
                    {o.note && <div className="help" style={{ color: "var(--muted)", fontSize: 11.5 }}>{o.note}</div>}
                  </td>
                  <td className="num">
                    {o.retainerStatus === "signed" ? (
                      <span className="tag ok">{inr(o.retainer)}/mo signed</span>
                    ) : o.retainerStatus === "proposed" ? (
                      <span className="tag w">{inr(o.retainer)}/mo proposed</span>
                    ) : (
                      <span className="tag r">None</span>
                    )}
                  </td>
                  <td>{open || "—"}</td>
                  <td className="num">{inr(rev)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">
          Three proposals sitting unsigned. Each one is a conversation you have not had yet.
        </p>
      </div>

      <h2>Internal projects</h2>
      <div className="card">
        <table>
          <tbody>
            {internalOrgs().map((o) => (
              <tr key={o.id}>
                <td>
                  <strong>{o.name}</strong>
                  {o.note && <div className="help" style={{ color: "var(--muted)", fontSize: 11.5 }}>{o.note}</div>}
                </td>
                <td className="num"><span className="tag r">₹0</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Your own work and free builds. They consume the scarcest thing you have and
          return nothing this month — which is fine if they become products, and
          expensive if they don&apos;t.
        </p>
      </div>

      <h2>Archived</h2>
      <div className="card">
        <table>
          <tbody>
            {archivedOrgs().map((o) => (
              <tr key={o.id} style={{ opacity: 0.55 }}>
                <td>{o.name}</td>
                <td className="num"><span className="tag">Closed</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Closed. Nothing to sell, nothing to chase, no reason to look here again.</p>
      </div>
    </>
  );
}
