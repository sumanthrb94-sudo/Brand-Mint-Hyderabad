import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export function PublicInquiry() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ name: "", companyName: "", email: "" });

  const continueToOnboarding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sessionStorage.setItem("brand-mint-inquiry", JSON.stringify(form));
    setLocation("/onboarding");
  };

  return (
    <form onSubmit={continueToOnboarding} className="ecom-enquiry-form">
      <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" aria-label="Your name" />
      <Input required value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} placeholder="Business name" aria-label="Business name" />
      <Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email address" aria-label="Email address" />
      <Button type="submit" className="ecom-button ecom-button--large">Continue to project brief <ArrowRight className="h-4 w-4" /></Button>
    </form>
  );
}
