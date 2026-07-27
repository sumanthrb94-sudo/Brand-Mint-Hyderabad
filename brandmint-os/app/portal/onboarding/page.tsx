import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { projectsFor, intakeFor, toggleIntake, daysSince } from "@/lib/db";

export const dynamic = "force-dynamic";

const KINDS: Record<string, string> = {
  asset: "Assets",
  content: "Content",
  access: "Access",
  decision: "Decisions",
};

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const projects = projectsFor(user.orgId);
  if (!projects.length) {
    return (
      <>
        <h1>Onboarding</h1>
        <p className="sub">Nothing to collect yet.</p>
      </>
    );
  }

  const project = projects[0];
  const items = intakeFor(project.id);
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  async function toggle(formData: FormData) {
    "use server";
    toggleIntake(String(formData.get("id")), formData.get("done") === "1");
    revalidatePath("/portal/onboarding");
    revalidatePath("/portal");
  }

  return (
    <>
      <h1>Onboarding</h1>
      <p className="sub">
        Everything we need to build {project.name}. Tick items off as you send them —
        the list is the same one we work from.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Complete</h3>
        <div className="big">
          {done} <span style={{ fontSize: 15, color: "var(--muted)" }}>of {items.length}</span>
        </div>
        <div className="prog"><i style={{ width: `${pct}%` }} /></div>
        <p className="hint">
          We can&apos;t start a step until its inputs are in. Anything sitting here more
          than a few days pushes the ship date.
        </p>
      </div>

      {Object.entries(KINDS).map(([kind, title]) => {
        const group = items.filter((i) => i.kind === kind);
        if (!group.length) return null;
        return (
          <div className="card" key={kind} style={{ marginBottom: 12 }}>
            <h3>{title}</h3>
            <ul className="list">
              {group.map((i) => {
                const age = daysSince(i.raisedAt);
                return (
                  <li key={i.id}>
                    <div>
                      <div className="lab" style={i.done ? { opacity: 0.5, textDecoration: "line-through" } : undefined}>
                        {i.label}
                      </div>
                      <div className="help">{i.help}</div>
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {!i.done && (
                        <span className={"age" + (age < 2 ? " ok" : "")}>
                          {age === 0 ? "today" : `${age}d`}
                        </span>
                      )}
                      <form action={toggle} className="inline">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="done" value={i.done ? "0" : "1"} />
                        <button className={i.done ? "" : "p"} type="submit">
                          {i.done ? "Undo" : "Mark sent"}
                        </button>
                      </form>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <div className="note" style={{ borderLeftColor: "var(--crit)" }}>
        <b>Never send us a password.</b>
        Where an item asks for access, add <strong>hello@brandmintstudios.in</strong> as a
        user on your own account instead. We will never ask you to type a password or an
        API key into this portal, and you should refuse if anyone claiming to be us does.
      </div>
    </>
  );
}
