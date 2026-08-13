import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import Lenis from "lenis";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const steps = ["Contact", "Store tier", "Brief", "Legal"];
const policyTypes = ["terms", "privacy", "cookies", "service_agreement"] as const;
const addOns = [
  { value: "android_app", label: "Android app — ₹50,000" },
  { value: "additional_payment_gateway", label: "Additional payment gateway — ₹25,000" },
  { value: "extra_design_revision", label: "Extra design revision round — ₹15,000" },
] as const;
type StoreTier = "starter_store" | "growth_store" | "commerce_store";
type AddOn = (typeof addOns)[number]["value"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", email: "", phone: "", serviceTier: "" as StoreTier | "", preferredTimeline: "", projectBrief: "", deliverables: "", selectedAddons: [] as AddOn[] });
  const submit = trpc.onboarding.submit.useMutation({ onSuccess: () => { setComplete(true); toast.success("Ecommerce onboarding recorded"); }, onError: (error) => toast.error(error.message) });

  useEffect(() => {
    const rawInquiry = sessionStorage.getItem("brand-mint-inquiry");
    if (!rawInquiry) return;
    try {
      const inquiry = JSON.parse(rawInquiry) as Partial<Pick<typeof form, "name" | "companyName" | "email">>;
      setForm((current) => ({ ...current, name: inquiry.name || current.name, companyName: inquiry.companyName || current.companyName, email: inquiry.email || current.email }));
    } catch { /* Ignore an invalid browser-only prefill. */ }
    sessionStorage.removeItem("brand-mint-inquiry");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, smoothWheel: true, lerp: 0.09 });
    return () => lenis.destroy();
  }, []);

  const lastStep = step === steps.length - 1;
  const canContinue = step === 0 ? Boolean(form.name && form.companyName && form.email) : step === 1 ? Boolean(form.serviceTier) : step === 2 ? Boolean(form.projectBrief) : accepted;
  const update = (key: keyof Omit<typeof form, "selectedAddons">, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const toggleAddOn = (value: AddOn, checked: boolean) => setForm((current) => ({ ...current, selectedAddons: checked ? [...current.selectedAddons, value] : current.selectedAddons.filter((item) => item !== value) }));
  const next = () => {
    if (!canContinue) { toast.error("Complete the required fields before continuing"); return; }
    if (!lastStep) { setStep((current) => current + 1); return; }
    if (!form.serviceTier) return;
    submit.mutate({ name: form.name, companyName: form.companyName, email: form.email, phone: form.phone || undefined, serviceType: "ecommerce", serviceTier: form.serviceTier, selectedAddons: form.selectedAddons, preferredTimeline: form.preferredTimeline || undefined, projectBrief: form.projectBrief, deliverables: form.deliverables || undefined, acceptedPolicies: [...policyTypes] });
  };

  return <main className="min-h-screen bg-[#f7f1e6] px-5 py-5 sm:px-8 sm:py-8"><div className="mx-auto max-w-[1180px]"><header className="flex items-center justify-between border-b border-[#d8cdbc] pb-5"><Link href="/" aria-label="Return to Brand Mint home"><BrandMark /></Link><Link href="/portal" className="text-xs font-bold text-[#315347] underline-offset-4 hover:underline">Client portal</Link></header><div className="grid gap-10 py-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20"><aside><p className="eyebrow">New ecommerce project</p><h1 className="mt-4 font-display text-4xl leading-[0.98] tracking-[-0.055em] text-[#0f2c23]">A store scope, made considered.</h1><ol className="mt-10 space-y-5" aria-label="Onboarding progress">{steps.map((label, index) => <li key={label} className="flex items-center gap-3 text-sm"><span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-bold ${index < step || complete ? "border-[#0d8855] bg-[#0d8855] text-white" : index === step ? "border-[#0d8855] bg-[#e5fff0] text-[#0d8855]" : "border-[#cfddd6] text-[#8ca198]"}`}>{index < step || complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={index === step ? "font-bold text-[#163d31]" : "text-[#789087]"}>{label}</span></li>)}</ol></aside><section className="rounded-[28px] border border-[#ded3c4] bg-white/85 p-6 shadow-[0_16px_50px_rgba(25,70,53,0.05)] sm:p-10">{complete ? <div className="max-w-xl py-10"><p className="eyebrow">Complete</p><h2 className="form-heading">Ecommerce onboarding recorded.</h2><p className="form-description">The CEO has been notified. Client portal access is enabled after account sign-in and the recorded legal acceptance check.</p><Link href="/portal"><Button className="mt-8 rounded-full bg-[#103c2e] text-white hover:bg-[#0b3024]">Go to client portal</Button></Link></div> : <>{step === 0 && <div className="max-w-xl"><p className="eyebrow">01 — Contact</p><h2 className="form-heading">Start with the essentials.</h2><p className="form-description">Create the contact record that will connect the ecommerce scope, documents and invoices.</p><div className="mt-9 grid gap-6 sm:grid-cols-2"><Field label="Name"><Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Full name" /></Field><Field label="Company"><Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Company name" /></Field><Field label="Email"><Input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="Email address" /></Field><Field label="Phone"><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} type="tel" placeholder="Phone number" /></Field></div></div>}{step === 1 && <div className="max-w-xl"><p className="eyebrow">02 — Store tier</p><h2 className="form-heading">Choose the store depth.</h2><p className="form-description">All prices are exclusive of 18% GST. Add-ons are quoted within the recorded project scope.</p><div className="mt-9 space-y-6"><Field label="Ecommerce tier"><Select value={form.serviceTier} onValueChange={(value) => update("serviceTier", value)}><SelectTrigger><SelectValue placeholder="Select a store tier" /></SelectTrigger><SelectContent><SelectItem value="starter_store">Starter Store — ₹99,000 · 8 weeks</SelectItem><SelectItem value="growth_store">Growth Store — ₹2,00,000 · 12 weeks</SelectItem><SelectItem value="commerce_store">Commerce Store — ₹3,00,000 · 12+ weeks</SelectItem></SelectContent></Select></Field><Field label="Add-ons (optional)"><div className="space-y-3 rounded-2xl border border-[#e2d8ca] bg-[#fdf9f2] p-4">{addOns.map((addOn) => <Label key={addOn.value} className="flex cursor-pointer items-center gap-3 text-sm text-[#415f53]"><Checkbox checked={form.selectedAddons.includes(addOn.value)} onCheckedChange={(value) => toggleAddOn(addOn.value, value === true)} />{addOn.label}</Label>)}</div></Field><Field label="Preferred timeline"><Input value={form.preferredTimeline} onChange={(event) => update("preferredTimeline", event.target.value)} placeholder="Timeline" /></Field></div></div>}{step === 2 && <div className="max-w-xl"><p className="eyebrow">03 — Brief</p><h2 className="form-heading">Set the store context.</h2><p className="form-description">Describe the catalogue, business context, required outcomes and anything the ecommerce build needs to account for.</p><div className="mt-9 space-y-6"><Field label="Project brief"><Textarea value={form.projectBrief} onChange={(event) => update("projectBrief", event.target.value)} className="min-h-36" placeholder="Business, catalogue and project requirements" /></Field><Field label="Key deliverables"><Textarea value={form.deliverables} onChange={(event) => update("deliverables", event.target.value)} className="min-h-28" placeholder="Priorities and deliverables" /></Field></div></div>}{step === 3 && <div className="max-w-xl"><p className="eyebrow">04 — Legal acceptance</p><h2 className="form-heading">Review before activation.</h2><p className="form-description">Account activation requires explicit acceptance of the policy documents and service agreement. Policy content remains a working draft pending legal review.</p><div className="mt-8 rounded-2xl border border-[#dfd5c6] bg-[#fdf9f2] p-5">{[["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Cookie Policy", "/cookies"], ["Service Agreement", "/terms"]].map(([label, href]) => <div key={label} className="flex items-center justify-between border-b border-[#e8dfd1] py-3 last:border-0"><span className="flex items-center gap-2 text-sm font-semibold text-[#214438]"><FileText className="h-4 w-4 text-[#0d8855]" />{label}</span><Link href={href} className="text-xs font-bold text-[#0d8855] hover:underline">Review</Link></div>)}</div><Label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d8cdbc] p-4 text-sm leading-6 text-[#4d695f]"><Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} className="mt-1" /><span>I have read and accept the required policy documents and service agreement.</span></Label></div>}<div className="mt-12 flex items-center justify-between border-t border-[#e4ddd3] pt-6"><Button variant="ghost" className="gap-2 text-[#557268]" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || submit.isPending}><ArrowLeft className="h-4 w-4" />Back</Button><Button className="gap-2 rounded-full bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]" disabled={!canContinue || submit.isPending} onClick={next}>{lastStep ? <><ShieldCheck className="h-4 w-4" />{submit.isPending ? "Recording" : "Complete review"}</> : <>Continue<ArrowRight className="h-4 w-4" /></>}</Button></div></>}</section></div></div></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.12em] text-[#5e766d]">{label}</Label>{children}</div>; }
