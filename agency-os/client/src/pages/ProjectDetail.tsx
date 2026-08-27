import { AgencyMobileNav, AgencyNav } from "@/components/AgencyNav";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatInr } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CircleAlert, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

const STAGES = [
  { value: "discovery", label: "Discovery" },
  { value: "in_progress", label: "In progress" },
  { value: "client_review", label: "Client review" },
  { value: "complete", label: "Complete" },
] as const;

type Stage = (typeof STAGES)[number]["value"];

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = Number(params?.id);
  const utils = trpc.useUtils();
  const [newItem, setNewItem] = useState("");
  const [blocked, setBlocked] = useState<{ stage: Stage; outstanding: string[] } | null>(null);

  const detail = trpc.projects.detail.useQuery({ id: projectId }, { enabled: Number.isInteger(projectId) && projectId > 0, retry: false });
  const refresh = () => void utils.projects.detail.invalidate({ id: projectId });

  const setStatus = trpc.projects.setStatus.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        setBlocked(null);
        toast.success("Stage updated");
        refresh();
        void utils.dashboard.overview.invalidate();
        return;
      }
      // Not an error — the SOP is telling us what is still open.
      setBlocked({ stage: variables.status as Stage, outstanding: result.outstanding });
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleItem = trpc.projects.setChecklistItem.useMutation({ onSuccess: refresh, onError: (error) => toast.error(error.message) });
  const addItem = trpc.projects.addChecklistItem.useMutation({
    onSuccess: () => { setNewItem(""); toast.success("Step added"); refresh(); },
    onError: (error) => toast.error(error.message),
  });

  if (detail.isLoading) {
    return <Shell><div className="grid place-items-center py-24 text-sm text-[#668078]"><Loader2 className="h-5 w-5 animate-spin" /></div></Shell>;
  }

  if (detail.error || !detail.data) {
    return <Shell><div className="surface-card mt-10"><p className="text-sm font-bold text-[#35564a]">This project could not be opened.</p><p className="mt-2 text-xs leading-5 text-[#789087]">{detail.error?.message ?? "It may have been removed."}</p><Link href="/admin"><Button className="mt-5 rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">Back to overview</Button></Link></div></Shell>;
  }

  const { project, clientName, checklist, deliverables, invoices } = detail.data;
  const currentStage = project.status as Stage;
  const price = project.finalPricePaise ?? project.basePricePaise;

  return (
    <Shell>
      <section className="pt-8 sm:pt-12">
        <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[#557268] hover:text-[#103c2e]"><ArrowLeft className="h-3.5 w-3.5" />Back to overview</Link>
        <p className="eyebrow mt-6">{clientName}</p>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-[-0.05em] text-[#102f25] sm:text-4xl">{project.title}</h1>
        <p className="mt-3 text-sm text-[#668078]">{formatInr(price)} · {project.pricingMode === "personal" ? "self-funded" : "package"}</p>
      </section>

      <section className="mt-8">
        <p className="eyebrow">Stage</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((stage) => {
            const open = checklist.filter((item) => item.stage === stage.value && item.required && !item.done).length;
            const isCurrent = stage.value === currentStage;
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => setStatus.mutate({ id: project.id, status: stage.value, force: false })}
                disabled={setStatus.isPending || isCurrent}
                aria-current={isCurrent}
                className={`rounded-2xl border p-4 text-left transition-colors ${isCurrent ? "border-[#0d8855] bg-[#e8f9ef]" : "border-[#dbe9e2] bg-white hover:bg-[#f3f8f5]"} disabled:cursor-default`}
              >
                <p className={`text-xs font-bold ${isCurrent ? "text-[#0a6b43]" : "text-[#35564a]"}`}>{stage.label}</p>
                <p className="mt-1 text-[11px] text-[#8aa096]">{isCurrent ? "Current stage" : open ? `${open} required step${open === 1 ? "" : "s"} open` : "Ready"}</p>
              </button>
            );
          })}
        </div>

        {blocked ? (
          <div role="alert" className="mt-4 rounded-2xl border border-[#f0d9be] bg-[#fdf6ec] p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-[#8a5a1c]"><CircleAlert className="h-4 w-4" />Finish these before leaving {STAGES.find((stage) => stage.value === currentStage)?.label}</p>
            <ul className="mt-3 space-y-1">{blocked.outstanding.map((title) => <li key={title} className="text-xs leading-5 text-[#7a6134]">· {title}</li>)}</ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setBlocked(null)} className="rounded-full border-[#d9c6a6] bg-white text-xs text-[#6d5a34]">Keep working</Button>
              <Button size="sm" onClick={() => setStatus.mutate({ id: project.id, status: blocked.stage, force: true })} disabled={setStatus.isPending} className="rounded-full bg-[#8a5a1c] text-xs text-white hover:bg-[#6f4715]">Move anyway</Button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#9a8154]">Moving anyway is recorded against the project.</p>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <p className="eyebrow">Standard operating procedure</p>
        <p className="mt-2 text-xs leading-5 text-[#789087]">Required steps gate the move to the next stage. Everything else is recorded but never blocks.</p>
        <div className="mt-5 space-y-5">
          {STAGES.map((stage) => {
            const items = checklist.filter((item) => item.stage === stage.value);
            if (!items.length) return null;
            const done = items.filter((item) => item.done).length;
            return (
              <article key={stage.value} className="surface-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#315347]">{stage.label}</p>
                  <span className="rounded-full bg-[#eaf1ed] px-2 py-1 text-[10px] font-bold text-[#5f7a70]">{done}/{items.length}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-[#f5f9f6]">
                        <Checkbox checked={item.done} disabled={toggleItem.isPending} onCheckedChange={(value) => toggleItem.mutate({ id: item.id, done: value === true })} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-xs leading-5 ${item.done ? "text-[#8aa096] line-through" : "text-[#3d5a4f]"}`}>{item.title}</span>
                          {item.required ? <span className="mt-1 inline-block rounded bg-[#e8f9ef] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#0a6b43]">Required</span> : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {stage.value === currentStage ? (
                  <div className="mt-4 flex gap-2">
                    <Input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add a step for this project" className="text-xs" />
                    <Button size="sm" disabled={!newItem.trim() || addItem.isPending} onClick={() => addItem.mutate({ projectId: project.id, stage: stage.value, title: newItem.trim(), required: false })} className="shrink-0 gap-1 rounded-full bg-[#103c2e] text-xs text-white hover:bg-[#0b3024]"><Plus className="h-3.5 w-3.5" />Add</Button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-5 xl:grid-cols-2">
        <article className="surface-card">
          <p className="eyebrow">Deliverables</p>
          {deliverables.length ? (
            <ul className="mt-5 space-y-2">{deliverables.map((deliverable) => <li key={deliverable.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ece7] px-4 py-3"><span className="text-xs font-semibold text-[#35564a]">{deliverable.title}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#738a81]">{deliverable.status.replaceAll("_", " ")}</span></li>)}</ul>
          ) : <p className="mt-4 text-xs leading-5 text-[#789087]">No deliverables yet. Add them from <Link href="/deliverables" className="font-bold text-[#0d8855] hover:underline">Projects</Link>.</p>}
        </article>

        <article className="surface-card">
          <p className="eyebrow">Invoices</p>
          {invoices.length ? (
            <ul className="mt-5 space-y-2">{invoices.map((invoice) => <li key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ece7] px-4 py-3"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#35564a]">{invoice.invoiceNumber || "Incomplete record"}</span><span className="mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-[#738a81]">{invoice.status}</span></span><span className="shrink-0 text-xs font-semibold text-[#0d8855]">{formatInr(invoice.totalPaise)}</span></li>)}</ul>
          ) : <p className="mt-4 text-xs leading-5 text-[#789087]">No invoice yet. Raise one from <Link href="/operations" className="font-bold text-[#0d8855] hover:underline">Invoices</Link>.</p>}
        </article>
      </section>

      <div className="h-12" />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="agency-app-shell">
      <AgencyNav />
      <main className="agency-main">
        <header className="agency-topbar gap-3">
          <AgencyMobileNav />
          <div className="flex items-center gap-3 lg:hidden"><BrandMark compact /><span className="text-xs font-bold text-[#305246]">Agency OS</span></div>
          <div className="hidden lg:block"><p className="eyebrow">Project</p><p className="mt-1 text-xs text-[#748b82]">Brand Mint Studios</p></div>
        </header>
        {children}
      </main>
    </div>
  );
}
