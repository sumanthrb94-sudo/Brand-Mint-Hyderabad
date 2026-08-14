import { AgencyMobileNav, AgencyNav } from "@/components/AgencyNav";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatInr, isAmountPresent } from "@/lib/money";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, FileSignature, FolderKanban, LogOut, MessageSquare, Plus, ReceiptText, UsersRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const stages = [
  { key: "discovery", label: "Discovery" },
  { key: "in_progress", label: "In progress" },
  { key: "client_review", label: "Client review" },
  { key: "complete", label: "Complete" },
] as const;
type Stage = (typeof stages)[number]["key"];

function ProjectCards({ projects }: { projects: { id: number; title: string }[] }) {
  if (!projects.length) return <div className="rounded-xl border border-dashed border-[#d6e3dc] bg-white/45 p-4"><p className="text-xs font-semibold text-[#667f75]">No project here</p><p className="mt-1 text-[11px] leading-5 text-[#93a59e]">Projects appear with their deadline and deliverables.</p></div>;
  return <>{projects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl bg-white p-3 text-xs font-bold text-[#315347] transition-colors hover:bg-[#f0f7f3]">{project.title}<span className="mt-1 block text-[10px] font-semibold text-[#8aa096]">Open →</span></Link>)}</>;
}



export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileStage, setMobileStage] = useState<Stage>("discovery");
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", retry: false });
  const signOut = async () => {
    await logout();
    setLocation("/sign-in");
  };
  const projectsIn = (stage: Stage) => overview.data?.projects.filter((project) => project.status === stage) ?? [];
  const metrics = [
    { label: "Active clients", value: overview.data ? String(overview.data.metrics.activeClients) : "—", icon: UsersRound, note: "Current client records" },
    { label: "Open projects", value: overview.data ? String(overview.data.metrics.openProjects) : "—", icon: FolderKanban, note: "Across the project pipeline" },
    { label: "Pending invoices", value: overview.data ? String(overview.data.metrics.pendingInvoices) : "—", icon: ReceiptText, note: "Awaiting payment status" },
    { label: "Revenue summary", value: overview.data ? formatInr(overview.data.metrics.revenuePaise) : "—", icon: ArrowUpRight, note: "Paid invoice totals" },
  ];
  return (
    <div className="agency-app-shell">
      <AgencyNav />
      <main className="agency-main">
        <header className="agency-topbar gap-3">
          <AgencyMobileNav />
          <div className="flex items-center gap-3 lg:hidden"><BrandMark compact /><span className="text-xs font-bold text-[#305246]">Agency OS</span></div>
          <div className="hidden lg:block"><p className="eyebrow">Operations overview</p><p className="mt-1 text-xs text-[#748b82]">Brand Mint Studios</p></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3"><Button type="button" size="sm" variant="outline" onClick={() => void signOut()} className="gap-2 rounded-full border-[#b8c8c0] bg-white text-xs text-[#254b3d] hover:bg-[#f3f7f3]"><LogOut className="h-3.5 w-3.5" />Sign out</Button></div>
        </header>

        <section className="pt-10 sm:pt-14">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">CEO dashboard</p><h1 className="mt-3 font-display text-4xl tracking-[-0.06em] text-[#102f25] sm:text-5xl">The studio, in view.</h1><p className="mt-3 max-w-md text-sm leading-6 text-[#668078]">Client relationships, delivery, documents and billing in one operating view.</p></div><Link href="/onboarding"><Button className="h-11 gap-2 rounded-full bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]"><Plus className="h-4 w-4" />New client</Button></Link></div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, note }) => <article key={label} className="metric-card"><span className="metric-icon"><Icon className="h-4 w-4" /></span><p className="mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-[#738a81]">{label}</p><p className="mt-1 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{value}</p><p className="mt-3 text-[11px] text-[#8aa096]">{note}</p></article>)}</div>
        </section>

        <section className="mt-12 surface-card"><div className="flex items-start justify-between"><div><p className="eyebrow">Lead inbox</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Incoming project requests</h2><p className="mt-2 text-xs text-[#789087]">Anonymous public requests appear here for qualification before onboarding.</p></div><MessageSquare className="h-5 w-5 text-[#0d8855]" /></div><div className="mt-6 space-y-3">{overview.data?.inquiries.length ? overview.data.inquiries.map((inquiry) => <article key={inquiry.id} className="rounded-xl border border-[#e3ece7] bg-[#fbfcfa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#35564a]">{inquiry.companyName}</p><p className="mt-1 text-xs text-[#789087]">{inquiry.name} · {inquiry.email}</p></div><span className="rounded-full bg-[#e5fff0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0d8855]">{inquiry.status}</span></div><p className="mt-3 text-sm leading-6 text-[#557268]">{inquiry.request}</p></article>) : <div className="rounded-xl border border-dashed border-[#d6e3dc] bg-[#fbfcfa] p-5"><p className="text-sm text-[#789087]">No public project requests yet.</p><p className="mt-2 text-xs leading-5 text-[#93a59e]">This inbox shows requests sent from the public site only. Clients you add through onboarding appear in the pipeline below, not here.</p></div>}</div></section>

        <section id="projects" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Delivery</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Project pipeline</h2></div><Link href="/deliverables" className="text-xs font-bold text-[#0d8855] hover:underline">All projects <span aria-hidden="true">→</span></Link></div>

          {/* Four columns side by side only when there is room for them. Below that
              they were 185px wide inside the viewport and every card was clipped
              mid-word, so a phone picks one stage at a time instead. */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {stages.map((stage) => { const count = projectsIn(stage.key).length; const active = stage.key === mobileStage; return <button key={stage.key} type="button" onClick={() => setMobileStage(stage.key)} aria-pressed={active} className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-[#0d8855] bg-[#e8f9ef] text-[#0a6b43]" : "border-[#dbe9e2] bg-white text-[#5f7a70]"}`}>{stage.label}<span className="rounded-full bg-white/70 px-1.5 text-[10px]">{count}</span></button>; })}
          </div>
          <div className="mt-3 space-y-2 lg:hidden">
            <ProjectCards projects={projectsIn(mobileStage)} />
          </div>

          <div className="pipeline-scroll mt-6 hidden grid-cols-4 gap-3 lg:grid">{stages.map((stage) => <section key={stage.key} className="pipeline-column"><div className="flex items-center justify-between"><h3 className="text-xs font-bold text-[#315347]">{stage.label}</h3><span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#eaf1ed] px-1 text-[9px] font-bold text-[#738a81]">{projectsIn(stage.key).length}</span></div><div className="mt-3 space-y-2"><ProjectCards projects={projectsIn(stage.key)} /></div></section>)}</div>
        </section>

        <section className="mt-12 grid gap-5 xl:grid-cols-[1.24fr_0.76fr]"><article id="invoices" className="surface-card"><div className="flex items-start justify-between"><div><p className="eyebrow">Billing</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Invoices</h2></div><ReceiptText className="h-5 w-5 text-[#0d8855]" /></div>{overview.data?.invoices.length ? <div className="mt-6 space-y-2">{overview.data.invoices.map((invoice) => {
              // A record missing its number or total predates the current
              // schema or was written by a failed request. Show it as needing
              // attention rather than as a blank row reading NaN.
              const incomplete = !invoice.invoiceNumber || !isAmountPresent(invoice.totalPaise);
              return <div key={invoice.id} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${incomplete ? "border-[#f0d9be] bg-[#fdf6ec]" : "border-[#e3ece7]"}`}>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-[#35564a]">{invoice.invoiceNumber || "Incomplete record"}</span>
                  <span className="mt-0.5 block text-[10px] uppercase tracking-[0.08em] text-[#738a81]">{incomplete ? `needs attention · id ${invoice.id}` : invoice.status}</span>
                </span>
                <span className={`shrink-0 text-xs font-semibold ${incomplete ? "text-[#8a5a1c]" : "text-[#0d8855]"}`}>{formatInr(invoice.totalPaise)}</span>
              </div>;
            })}</div> : <div className="mt-8 rounded-xl border border-dashed border-[#d6e3dc] bg-[#fbfcfa] p-5"><p className="text-sm font-bold text-[#35564a]">No invoice record</p><p className="mt-1 text-xs leading-5 text-[#789087]">Raise an itemised invoice from <Link href="/operations" className="font-bold text-[#0d8855] hover:underline">Invoices</Link>.</p></div>}</article>
            <article id="documents" className="surface-card bg-[#103c2e] text-white"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#9cf7c5]">Documents</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em]">Ready for agreement.</h2></div><FileSignature className="h-5 w-5 text-[#a8ffcf]" /></div><p className="mt-6 text-sm leading-6 text-[#d3e9de]">Contracts, NDAs and SOWs will track signature status and secure file access.</p><Link href="/terms" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#a8ffcf]">Review legal documents <ArrowUpRight className="h-3.5 w-3.5" /></Link></article></section>
      </main>
    </div>
  );
}
