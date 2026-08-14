import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Download, FileText, FolderKanban, LogOut, ReceiptText, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

function SecureDownload({ fileId }: { fileId: number }) {
  const download = trpc.files.download.useMutation({ onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer") });
  return <Button size="sm" variant="outline" className="gap-2 text-xs text-[#0d8855]" onClick={() => download.mutate({ id: fileId })} disabled={download.isPending}><Download className="h-3.5 w-3.5" />{download.isPending ? "Preparing" : "Download"}</Button>;
}

export default function ClientPortal() {
  const { isAuthenticated, user, logout } = useAuth();
  const overview = trpc.portal.overview.useQuery(undefined, { enabled: isAuthenticated && user?.role !== "admin", retry: false });
  const areas = [
    { icon: FolderKanban, title: "Project status", value: overview.data?.projects.length ?? "—", detail: "Project records available to your account." },
    { icon: ReceiptText, title: "Invoices", value: overview.data?.invoices.length ?? "—", detail: "Issued invoices and payment status." },
    { icon: FileText, title: "Signed documents", value: overview.data?.documents.filter((document) => document.status === "signed").length ?? "—", detail: "Contracts, NDAs and Statements of Work." },
  ];
  const files = overview.data?.files ?? [];
  const switchAccount = async () => {
    await logout();
    window.location.assign("/sign-in?returnTo=%2Fportal");
  };

  return <main className="min-h-screen bg-[#f6f8f4] px-5 py-5 sm:px-8 sm:py-8"><div className="mx-auto max-w-[1120px]"><header className="flex items-center justify-between gap-4 border-b border-[#dbe9e2] pb-5"><Link href="/"><BrandMark /></Link><div className="flex items-center gap-3"><Link href="/onboarding" className="text-xs font-bold text-[#315347] underline-offset-4 hover:underline">Start a project</Link>{isAuthenticated ? <Button size="sm" variant="outline" onClick={() => void switchAccount()} className="gap-2 rounded-full border-[#b8c8c0] text-xs text-[#254b3d]"><LogOut className="h-3.5 w-3.5" />Sign out</Button> : null}</div></header><section className="pt-16 sm:pt-24"><div className="max-w-2xl"><p className="eyebrow">Client portal</p><h1 className="mt-4 font-display text-5xl leading-[0.96] tracking-[-0.065em] text-[#103328] sm:text-6xl">Your work with Brand Mint, in one place.</h1><p className="mt-6 max-w-lg text-sm leading-7 text-[#557268]">Sign in after your onboarding and required legal acceptance are complete.</p></div><div className="mt-10 rounded-[26px] border border-[#dbe9e2] bg-[#103c2e] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-8"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#a8ffcf]"><ShieldCheck className="h-4 w-4" />Secure client access</div><p className="mt-2 text-sm text-[#d5eee1]">Access is limited to your own eligible records.</p></div>{!isAuthenticated ? <Button onClick={() => startLogin("/portal")} className="mt-5 bg-[#a8ffcf] text-[#093326] hover:bg-[#c9ffdf] sm:mt-0">Log in to know more</Button> : <span className="mt-5 text-xs font-bold text-[#a8ffcf] sm:mt-0">{overview.isLoading ? "Loading records" : overview.error ? "Access review required" : "Secure access active"}</span>}</div><div className="mt-8 grid gap-4 md:grid-cols-3">{areas.map(({ icon: Icon, title, value, detail }) => <article key={title} className="rounded-2xl border border-[#dbe9e2] bg-white p-6"><Icon className="h-5 w-5 text-[#0d8855]" /><p className="mt-7 font-display text-4xl tracking-[-0.05em] text-[#173d30]">{value}</p><h2 className="mt-2 font-display text-2xl tracking-[-0.035em] text-[#173d30]">{title}</h2><p className="mt-3 text-sm leading-6 text-[#698279]">{detail}</p></article>)}</div>{isAuthenticated && !overview.isLoading && !overview.error ? <section className="mt-10 rounded-2xl border border-[#dbe9e2] bg-white p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Files</p><h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">Available downloads</h2></div><FileText className="h-5 w-5 text-[#0d8855]" /></div><div className="mt-5 space-y-2">{files.length ? files.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e3ece7] px-4 py-3"><div><p className="text-xs font-bold text-[#35564a]">{file.filename}</p><p className="mt-1 text-[11px] text-[#789087]">{file.fileKind.replace("_", " ")}</p></div><SecureDownload fileId={file.id} /></div>) : <div className="rounded-xl border border-dashed border-[#d6e3dc] bg-[#fbfcfa] p-4 text-xs text-[#789087]">Invoices and signed documents will be available here when they are issued.</div>}</div></section> : null}</section></div></main>;
}
