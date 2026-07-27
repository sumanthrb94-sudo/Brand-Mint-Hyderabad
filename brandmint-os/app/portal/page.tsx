import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import {
  projectsFor, milestonesFor, openIntakeFor, deliverablesFor,
  invoicesFor, decideDeliverable, daysSince, inr,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const dotFor = (s: string) =>
  s === "done" ? "g" : s === "in_progress" ? "y" : s === "blocked" ? "r" : "n";

export default async function Portal() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const projects = projectsFor(user.orgId);
  if (!projects.length) {
    return (
      <>
        <h1>Nothing here yet</h1>
        <p className="sub">Your project will appear as soon as it kicks off.</p>
      </>
    );
  }

  const project = projects[0];
  const milestones = milestonesFor(project.id);
  const blockers = openIntakeFor(project.id);
  const deliverables = deliverablesFor(project.id);
  const invoices = invoicesFor(user.orgId);

  async function decide(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const action = String(formData.get("action"));
    decideDeliverable(id, action === "approve" ? "approved" : "changes_requested");
    revalidatePath("/portal");
  }

  return (
    <>
      <h1>{project.name}</h1>
      <p className="sub">
        {project.type} · shipping {project.dueAt}
      </p>
      <div className="card" style={{ marginBottom: 22 }}>
        <h3>Progress</h3>
        <div className="big">{project.progress}%</div>
        <div className="prog"><i style={{ width: `${project.progress}%` }} /></div>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>What we need from you</h3>
          {blockers.length ? (
            <ul className="list">
              {blockers.map((b) => {
                const age = daysSince(b.raisedAt);
                return (
                  <li key={b.id}>
                    <div>
                      <div className="lab">{b.label}</div>
                      <div className="help">{b.help}</div>
                    </div>
                    <span className={"age" + (age < 2 ? " ok" : "")}>
                      {age === 0 ? "today" : `${age} day${age > 1 ? "s" : ""}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="empty">Nothing outstanding. We&apos;ll shout if that changes.</p>
          )}
          <p className="hint">
            <Link href="/portal/onboarding">Go to onboarding</Link> to mark these off.
          </p>
        </div>

        <div className="card">
          <h3>Waiting on your approval</h3>
          {deliverables.filter((d) => d.status === "in_review").length ? (
            <ul className="list">
              {deliverables
                .filter((d) => d.status === "in_review")
                .map((d) => (
                  <li key={d.id}>
                    <div>
                      <div className="lab">{d.title}</div>
                      <div className="help">Version {d.version}</div>
                    </div>
                    <span style={{ display: "flex", gap: 6 }}>
                      <form action={decide} className="inline">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button className="p" type="submit">Approve</button>
                      </form>
                      <form action={decide} className="inline">
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="action" value="changes" />
                        <button type="submit">Changes</button>
                      </form>
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="empty">Nothing waiting on you.</p>
          )}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>Where we are</h3>
          <table>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className={"dot " + dotFor(m.status)} />
                    {m.title}
                  </td>
                  <td className="num">
                    <span className={"tag " + (m.owner === "client" ? "cl" : "us")}>
                      {m.owner === "client" ? "You" : "Us"}
                    </span>
                  </td>
                  <td className="num" style={{ color: "var(--muted)", fontSize: 12 }}>{m.dueAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Invoices</h3>
          <table>
            <tbody>
              {invoices.map((n) => (
                <tr key={n.id}>
                  <td>{n.label}</td>
                  <td className="num">{inr(n.amount)}</td>
                  <td className="num">
                    {n.status === "paid" ? (
                      <span className="tag ok">Paid</span>
                    ) : n.status === "due" ? (
                      <a className="btn p" href={n.payUrl || "#"}>Pay now</a>
                    ) : (
                      <span className="tag">{n.dueAt}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">Razorpay link on every unpaid row.</p>
        </div>
      </div>
    </>
  );
}
