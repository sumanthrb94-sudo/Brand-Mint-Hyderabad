import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrg, projectsFor, milestonesFor, intakeFor, deliverablesFor,
  invoicesFor, daysSince, inr,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Client({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = getOrg(id);
  if (!org || org.kind === "studio") notFound();

  const projects = projectsFor(org.id);
  const invoices = invoicesFor(org.id);

  return (
    <>
      <p className="sub" style={{ marginBottom: 6 }}>
        <Link href="/admin">← Dashboard</Link>
      </p>
      <h1>{org.name}</h1>
      <p className="sub">
        {org.retainerStatus === "signed"
          ? `On retainer at ${inr(org.retainer)}/month — signed`
          : org.retainerStatus === "proposed"
            ? `${inr(org.retainer)}/month proposed — not signed yet`
            : org.kind === "internal"
              ? "Internal project — no revenue"
              : "Archived"}
      </p>

      {projects.map((p) => {
        const open = intakeFor(p.id).filter((i) => !i.done);
        return (
          <div className="card" key={p.id} style={{ marginBottom: 12 }}>
            <h3>{p.type}</h3>
            <div style={{ fontSize: 16, fontWeight: 600, margin: "3px 0 2px" }}>{p.name}</div>
            <div className="mini">Due {p.dueAt} · {p.progress}% complete</div>
            <div className="prog"><i style={{ width: `${p.progress}%` }} /></div>

            <table style={{ marginTop: 16 }}>
              <thead><tr><th>Milestone</th><th>Owner</th><th>Status</th><th className="num">Due</th></tr></thead>
              <tbody>
                {milestonesFor(p.id).map((m) => (
                  <tr key={m.id}>
                    <td>{m.title}</td>
                    <td><span className={"tag " + (m.owner === "client" ? "cl" : "us")}>{m.owner === "client" ? "Client" : "Us"}</span></td>
                    <td>{m.status.replace("_", " ")}</td>
                    <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{m.dueAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {open.length > 0 && (
              <>
                <h3 style={{ marginTop: 20 }}>Waiting on the client</h3>
                <ul className="list">
                  {open.map((i) => (
                    <li key={i.id}>
                      <div className="lab">{i.label}</div>
                      <span className={"age" + (daysSince(i.raisedAt) < 2 ? " ok" : "")}>
                        {daysSince(i.raisedAt)}d
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 style={{ marginTop: 20 }}>Deliverables</h3>
            <table>
              <tbody>
                {deliverablesFor(p.id).map((d) => (
                  <tr key={d.id}>
                    <td>{d.title} <span style={{ color: "var(--muted)", fontSize: 11.5 }}>v{d.version}</span></td>
                    <td className="num">
                      <span className={"tag " + (d.status === "approved" ? "ok" : d.status === "in_review" ? "w" : "r")}>
                        {d.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      <div className="card">
        <h3>Invoices</h3>
        <table>
          <tbody>
            {invoices.length ? invoices.map((n) => (
              <tr key={n.id}>
                <td>{n.label}</td>
                <td className="num">{inr(n.amount)}</td>
                <td className="num">
                  <span className={"tag " + (n.status === "paid" ? "ok" : n.status === "due" ? "w" : "")}>
                    {n.status}
                  </span>
                </td>
                <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{n.dueAt}</td>
              </tr>
            )) : <tr><td className="empty">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
