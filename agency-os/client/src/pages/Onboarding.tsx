import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Check, FileText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const steps = ["Contact", "Service", "Brief", "Legal"];
const policyTypes = ["terms", "privacy", "cookies", "service_agreement"] as const;
type ServiceType = "website" | "internal_tool" | "brand_identity" | "performance_media" | "ecommerce";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", email: "", phone: "", serviceType: "" as ServiceType | "", preferredTimeline: "", projectBrief: "", deliverables: "" });
  const submit = trpc.onboarding.submit.useMutation({
    onSuccess: () => { setComplete(true); toast.success("Onboarding recorded"); },
    onError: (error) => toast.error(error.message),
  });
  const lastStep = step === steps.length - 1;
  const canContinue = step === 0 ? Boolean(form.name && form.companyName && form.email) : step === 1 ? Boolean(form.serviceType) : step === 2 ? Boolean(form.projectBrief) : accepted;
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const next = () => {
    if (!canContinue) { toast.error("Complete the required fields before continuing"); return; }
    if (!lastStep) { setStep((current) => current + 1); return; }
    if (!form.serviceType) return;
    submit.mutate({ ...form, serviceType: form.serviceType, phone: form.phone || undefined, preferredTimeline: form.preferredTimeline || undefined, deliverables: form.deliverables || undefined, acceptedPolicies: [...policyTypes] });
  };

  return (
    <main className="min-h-screen bg-[#f6f8f4] px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="flex items-center justify-between border-b border-[#dbe9e2] pb-5"><Link href="/" aria-label="Return to overview"><BrandMark /></Link><Link href="/portal" className="text-xs font-bold text-[#315347] underline-offset-4 hover:underline">Client portal</Link></header>
        <div className="grid gap-10 py-12 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20"><aside><p className="eyebrow">New client</p><h1 className="mt-4 font-display text-4xl leading-[0.98] tracking-[-0.055em] text-[#0f2c23]">Project onboarding, made considered.</h1><ol className="mt-10 space-y-5" aria-label="Onboarding progress">{steps.map((label, index) => <li key={label} className="flex items-center gap-3 text-sm"><span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] font-bold ${index < step || complete ? "border-[#0d8855] bg-[#0d8855] text-white" : index === step ? "border-[#0d8855] bg-[#e5fff0] text-[#0d8855]" : "border-[#cfddd6] text-[#8ca198]"}`}>{index < step || complete ? <Check className="h-3.5 w-3.5" /> : index + 1}</span><span className={index === step ? "font-bold text-[#163d31]" : "text-[#789087]"}>{label}</span></li>)}</ol></aside>
          <section className="rounded-[28px] border border-[#dbe9e2] bg-white p-6 shadow-[0_16px_50px_rgba(25,70,53,0.05)] sm:p-10">
            {complete ? <div className="max-w-xl py-10"><p className="eyebrow">Complete</p><h2 className="form-heading">Onboarding recorded.</h2><p className="form-description">The CEO has been notified. Client portal access is enabled after account sign-in and the recorded legal acceptance check.</p><Link href="/portal"><Button className="mt-8 bg-[#103c2e] text-white hover:bg-[#0b3024]">Go to client portal</Button></Link></div> : <>
              {step === 0 && <div className="max-w-xl"><p className="eyebrow">01 — Contact</p><h2 className="form-heading">Start with the essentials.</h2><p className="form-description">Create the client profile that will connect their project, documents and invoices.</p><div className="mt-9 grid gap-6 sm:grid-cols-2"><Field label="Name"><Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Full name" /></Field><Field label="Company"><Input value={form.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Company name" /></Field><Field label="Email"><Input value={form.email} onChange={(event) => update("email", event.target.value)} type="email" placeholder="Email address" /></Field><Field label="Phone"><Input value={form.phone} onChange={(event) => update("phone", event.target.value)} type="tel" placeholder="Phone number" /></Field></div></div>}
              {step === 1 && <div className="max-w-xl"><p className="eyebrow">02 — Service</p><h2 className="form-heading">Choose the engagement.</h2><p className="form-description">Select the service that best reflects the work to be scoped.</p><div className="mt-9 space-y-6"><Field label="Service"><Select value={form.serviceType} onValueChange={(value) => update("serviceType", value)}><SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger><SelectContent><SelectItem value="website">Custom website</SelectItem><SelectItem value="internal_tool">Custom internal tool</SelectItem><SelectItem value="brand_identity">Brand & identity</SelectItem><SelectItem value="performance_media">Performance media</SelectItem><SelectItem value="ecommerce">Ecommerce store</SelectItem></SelectContent></Select></Field><Field label="Preferred timeline"><Input value={form.preferredTimeline} onChange={(event) => update("preferredTimeline", event.target.value)} placeholder="Timeline" /></Field></div></div>}
              {step === 2 && <div className="max-w-xl"><p className="eyebrow">03 — Brief</p><h2 className="form-heading">Set the project context.</h2><p className="form-description">Capture the project goal, required outcomes and any information the studio should consider.</p><div className="mt-9 space-y-6"><Field label="Project brief"><Textarea value={form.projectBrief} onChange={(event) => update("projectBrief", event.target.value)} className="min-h-36" placeholder="Project goals, context and requirements" /></Field><Field label="Key deliverables"><Textarea value={form.deliverables} onChange={(event) => update("deliverables", event.target.value)} className="min-h-28" placeholder="Deliverables" /></Field></div></div>}
              {step === 3 && <div className="max-w-xl"><p className="eyebrow">04 — Legal acceptance</p><h2 className="form-heading">Review before activation.</h2><p className="form-description">Account activation requires explicit acceptance of the policies and service agreement. These documents are presented as working drafts pending legal review.</p><div className="mt-8 rounded-2xl border border-[#dbe9e2] bg-[#f8fbf8] p-5">{[["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Cookie Policy", "/cookies"], ["Service Agreement", "/terms"]].map(([label, href]) => <div key={label} className="flex items-center justify-between border-b border-[#e3ece7] py-3 last:border-0"><span className="flex items-center gap-2 text-sm font-semibold text-[#214438]"><FileText className="h-4 w-4 text-[#0d8855]" />{label}</span><Link href={href} className="text-xs font-bold text-[#0d8855] hover:underline">Review</Link></div>)}</div><Label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#dbe9e2] p-4 text-sm leading-6 text-[#4d695f]"><Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} className="mt-1" /><span>I have read and accept the required policy documents and service agreement.</span></Label></div>}
              <div className="mt-12 flex items-center justify-between border-t border-[#e4ece8] pt-6"><Button variant="ghost" className="gap-2 text-[#557268]" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || submit.isPending}><ArrowLeft className="h-4 w-4" />Back</Button><Button className="gap-2 bg-[#103c2e] px-5 text-white hover:bg-[#0b3024]" disabled={!canContinue || submit.isPending} onClick={next}>{lastStep ? <><ShieldCheck className="h-4 w-4" />{submit.isPending ? "Recording" : "Complete review"}</> : <>Continue<ArrowRight className="h-4 w-4" /></>}</Button></div>
            </>}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-xs font-bold uppercase tracking-[0.12em] text-[#5e766d]">{label}</Label>{children}</div>; }
