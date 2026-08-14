import { AgencyNav } from "@/components/AgencyNav";
import { BrandMark } from "@/components/BrandMark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Bell, ChevronDown, FileSignature, FolderKanban, LogOut, MessageSquare, MoreHorizontal, Plus, ReceiptText, UsersRound } from "lucide-react";
import { Link, useLocation } from "wouter";

const columns = ["Discovery", "In progress", "Client review", "Complete"];

function formatRupees(paise: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100); }

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const overview = trpc.dashboard.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", retry: false });
  const signOut = async () => {
    await logout();
    setLocation("/sign-in");
  };
  const metrics = [
    { label: "Active clients", value: overview.data ? String(overview.data.metrics.activeClients) : "—", icon: UsersRound, note: "Current client records" },
    { label: "Open projects", value: overview.data ? String(overview.data.metrics.openProjects) : "—", icon: FolderKanban, note: "Across the project pipeline" },
    { label: "Pending invoices", value: overview.data ? String(overview.data.metrics.pendingInvoices) : "—", icon: ReceiptText, note: "Awaiting payment status" },
    { label: "Revenue summary", value: overview.data ? formatRupees(overview.data.metrics.revenuePaise) : "—", icon: ArrowUpRight, note: "Paid invoice totals" },
  ];
  return (
    <div className="agency-app-shell">
      <AgencyNav />
      <main className="agency-main">
        <header className="agency-topbar">
          <div className="flex items-center gap-3 lg:hidden"><BrandMark compact /><span className="text-xs font-bold text-[#305246]">Agency OS</span></div>
          <div className="hidden lg:block"><p className="eyebrow">Operations overview</p><p className="mt-1 text-xs text-[#748b82]">Brand Mint Studios</p></div>
          <div className="ml-auto flex items-center gap-3"><button className="grid h-9 w-9 place-items-center rounded-full border border-[#dbe9e2] bg-white text-[#446359]" aria-label="Notifications"><Bell className="h-4 w-4" /></button><button className="flex items-center gap-2 rounded-full border border-[#dbe9e2] bg-white py-1.5 pl-1.5 pr-3 text-xs font-bold text-[#26483c]"><Avatar className="h-6 w-6"><AvatarFallback className="bg-[#dff8e9] text-[10px] text-[#0d8855]">BM</AvatarFallback></Avatar><span className="hidden sm:inline">CEO</span><ChevronDown className="h-3.5 w-3.5" /></button><Button type="button" size="sm" variant="outline" onClick={() => void signOut()} className="gap-2 rounded-full border-[#b8c8c0] bg-white text-xs text-[#254b3d] hover:bg-[#f3f7f3]"><LogOut className="h-3.5 w-3.5" />Sign out</Button></div>
        </header>

        <section className="pt-10 sm:pt-14">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="eyebrow">CEO dashboard</p><h1 className="mt-3 font-display text-4xl tracking-[-0.06em] text-[#102f25] sm:text-5xl">The studio, in view.</h1><p className="mt-3 max-w-md text-sm leading-6 text-[#668078]">Client relationships, delivery, documents and billing in one operating view.</p></div><Link href="/onboarding"><Button className="h-11 gap-2 rounded-full bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]"><Plus className="h-4 w-4" />New client</Button></Link></div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({ label, value, icon: Icon, note }) => <article key={label} className="metric-card"><div className="flex items-start justify-between"><span className="metric-icon"><Icon className="h-4 w-4" /></span><button className="text-[#9aada5]" aria-label={`Options for ${label}`}><MoreHorizontal className="h-4 w-4" /></button></div><p className="mt-8 text-[11px] font-bold uppercase tracking-[0.12em] text-[#738a81]">{label}</p><p className="mt-1 font-display text-4xl tracking-[-0.055em] text-[#14392d]">{value}</p><p className="mt-3 text-[11px] text-[#8aa096]">{note}</p></article>)}</div>
        </section>

        <section className="mt-12 surface-card"><div className="flex items-start justify-between"><div><p className="eyebrow">Lead inbox</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Incoming project requests</h2><p className="mt-2 text-xs text-[#789087]">Anonymous public requests appear here for qualification before onboarding.</p></div><MessageSquare className="h-5 w-5 text-[#0d8855]" /></div><div className="mt-6 space-y-3">{overview.data?.inquiries.length ? overview.data.inquiries.map((inquiry) => <article key={inquiry.id} className="rounded-xl border border-[#e3ece7] bg-[#fbfcfa] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#35564a]">{inquiry.companyName}</p><p className="mt-1 text-xs text-[#789087]">{inquiry.name} · {inquiry.email}</p></div><span className="rounded-full bg-[#e5fff0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0d8855]">{inquiry.status}</span></div><p className="mt-3 text-sm leading-6 text-[#557268]">{inquiry.request}</p></article>) : <div className="rounded-xl border border-dashed border-[#d6e3dc] bg-[#fbfcfa] p-5 text-sm text-[#789087]">No public project requests yet.</div>}</div></section>

        <section id="projects" className="mt-12"><div className="flex items-end justify-between"><div><p className="eyebrow">Delivery</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Project pipeline</h2></div><button className="hidden text-xs font-bold text-[#0d8855] sm:block">View projects <span aria-hidden="true">→</span></button></div>
          <div className="pipeline-scroll mt-6 grid grid-cols-4 gap-3">{columns.map((column) => { const key = column.toLowerCase().replace(" ", "_") as "discovery" | "in_progress" | "client_review" | "complete"; const columnProjects = overview.data?.projects.filter((project) => project.status === key) ?? []; return <section key={column} className="pipeline-column"><div className="flex items-center justify-between"><h3 className="text-xs font-bold text-[#315347]">{column}</h3><span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#eaf1ed] px-1 text-[9px] font-bold text-[#738a81]">{columnProjects.length}</span></div>{columnProjects.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-[#d6e3dc] bg-white/45 p-4"><p className="text-xs font-semibold text-[#667f75]">No project record</p><p className="mt-1 text-[11px] leading-5 text-[#93a59e]">Projects will appear here with their deadline and deliverables.</p></div> : <div className="mt-3 space-y-2">{columnProjects.map((project) => <div key={project.id} className="rounded-xl bg-white p-3 text-xs font-bold text-[#315347]">{project.title}</div>)}</div>}</section>; })}</div>
        </section>

        <section className="mt-12 grid gap-5 xl:grid-cols-[1.24fr_0.76fr]"><article id="invoices" className="surface-card"><div className="flex items-start justify-between"><div><p className="eyebrow">Billing</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Invoices</h2></div><ReceiptText className="h-5 w-5 text-[#0d8855]" /></div>{overview.data?.invoices.length ? <div className="mt-6 space-y-2">{overview.data.invoices.map((invoice) => <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-[#e3ece7] px-4 py-3"><span className="text-xs font-bold text-[#35564a]">{invoice.invoiceNumber}</span><span className="text-xs font-semibold text-[#0d8855]">{formatRupees(invoice.totalPaise)}</span></div>)}</div> : <div className="mt-8 rounded-xl border border-dashed border-[#d6e3dc] bg-[#fbfcfa] p-5"><p className="text-sm font-bold text-[#35564a]">No invoice record</p><p className="mt-1 text-xs leading-5 text-[#789087]">Itemised invoices, due dates, payment status and downloadable bills will be managed here.</p></div>}</article>
            <article id="documents" className="surface-card bg-[#103c2e] text-white"><div className="flex items-start justify-between"><div><p className="eyebrow text-[#9cf7c5]">Documents</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em]">Ready for agreement.</h2></div><FileSignature className="h-5 w-5 text-[#a8ffcf]" /></div><p className="mt-6 text-sm leading-6 text-[#d3e9de]">Contracts, NDAs and SOWs will track signature status and secure file access.</p><Link href="/terms" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#a8ffcf]">Review legal documents <ArrowUpRight className="h-3.5 w-3.5" /></Link></article></section>
      </main>
    </div>
  );
}
