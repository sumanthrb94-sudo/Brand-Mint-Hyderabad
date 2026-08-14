import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

const emptyForm = { name: "", companyName: "", email: "", request: "" };

export function PublicInquiry() {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const submit = trpc.inquiries.submit.useMutation({
    onSuccess: () => { setSubmitted(true); setForm(emptyForm); },
  });

  const sendInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    submit.mutate(form);
  };

  if (submitted) return <div className="ecom-enquiry-form rounded-2xl border border-[#bde6cb] bg-[#f0fff5] p-6 text-[#184c3a]"><CheckCircle2 className="h-5 w-5" /><h3 className="mt-3 font-display text-2xl">Request received.</h3><p className="mt-2 text-sm leading-6">Your details are now in the Brand Mint CEO workspace for review. We will contact you using the email provided.</p><Button type="button" variant="outline" onClick={() => setSubmitted(false)} className="mt-5 border-[#8ec9a4] bg-white text-[#174b38]">Send another request</Button></div>;

  return <form onSubmit={sendInquiry} className="ecom-enquiry-form"><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" aria-label="Your name" /><Input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} placeholder="Business name" aria-label="Business name" /><Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" aria-label="Email address" /><Textarea required minLength={10} value={form.request} onChange={(event) => setForm({ ...form, request: event.target.value })} placeholder="Tell us about your store, catalogue, and request" aria-label="Project request" className="min-h-28" /><Button type="submit" disabled={submit.isPending} className="ecom-button ecom-button--large">{submit.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending request</> : <>Send project request <ArrowRight className="h-4 w-4" /></>}</Button>{submit.error ? <p role="alert" className="text-sm text-[#a43a2a]">We could not send your request. Please try again.</p> : null}</form>;
}
