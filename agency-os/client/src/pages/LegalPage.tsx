import { BrandMark } from "@/components/BrandMark";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

type PolicyType = "terms" | "privacy" | "cookies";

const policyDetails: Record<PolicyType, { title: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: "Terms & Conditions",
    sections: [
      { heading: "Engagement and payment", body: "The current service terms state that payment is 50% to start and 50% on completion. Completion means the build is finished, tested and signed off on staging; go-live follows payment." },
      { heading: "Scope and timelines", body: "Timelines run from signed scope and receipt of client assets. Delays in client input or feedback extend the timeline day for day. Scope changes during the build are quoted as change orders before work begins." },
      { heading: "Testing and ownership", body: "UAT covers defects against the agreed scope. New functionality identified during testing is quoted separately. On final payment, all code, design files and accounts transfer to the client." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "Working draft", body: "This policy requires legal review before publication. The final version must identify the data controller, contact details, personal-data categories, purposes of processing, retention periods, service providers, security measures and data-subject rights for Brand Mint Studios." },
      { heading: "Platform records", body: "The operations platform is designed to store client onboarding information, project records, invoices, legal acceptances and document metadata only where required for the defined client engagement and account access." },
      { heading: "Before activation", body: "Clients must receive the legally reviewed policy and explicitly record their acceptance before their account is activated." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    sections: [
      { heading: "Working draft", body: "This policy requires legal review before publication. The final version must list cookie categories, names, purposes, duration, first- or third-party status, and the user choices available for each non-essential technology." },
      { heading: "Consent", body: "The client onboarding flow is designed to capture explicit acceptance of the final Cookie Policy as a versioned legal record. Cookie-consent controls must match the actual technologies used on the published application." },
      { heading: "Policy maintenance", body: "The policy must be updated when analytics, advertising, support, authentication or other embedded services change their browser-storage behavior." },
    ],
  },
};

export default function LegalPage({ type }: { type: PolicyType }) {
  const policy = policyDetails[type];
  return (
    <main className="min-h-screen bg-[#f6f8f4] px-5 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-[800px]"><header className="flex items-center justify-between border-b border-[#dbe9e2] pb-5"><Link href="/"><BrandMark /></Link><Link href="/onboarding" className="text-xs font-bold text-[#315347] underline-offset-4 hover:underline">Client onboarding</Link></header>
        <article className="py-14 sm:py-20"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-[#59776b] hover:text-[#0d8855]"><ArrowLeft className="h-3.5 w-3.5" />Return to overview</Link><p className="eyebrow mt-10">Brand Mint Studios</p><h1 className="mt-4 font-display text-5xl tracking-[-0.06em] text-[#103328] sm:text-6xl">{policy.title}</h1>
          <div className="mt-8 flex gap-3 rounded-2xl border border-[#f1dcad] bg-[#fff8e8] p-4 text-sm leading-6 text-[#795b22]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Working draft.</strong> This content is not formal legal advice and requires review by qualified counsel before publication or reliance.</p></div>
          <div className="mt-12 space-y-10">{policy.sections.map((section) => <section key={section.heading}><h2 className="font-display text-2xl tracking-[-0.035em] text-[#183f31]">{section.heading}</h2><p className="mt-3 text-sm leading-7 text-[#547067]">{section.body}</p></section>)}</div>
        </article>
      </div>
    </main>
  );
}
