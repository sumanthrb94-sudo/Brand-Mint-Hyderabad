import { Button } from "@/components/ui/button";
import { carePlans, lessons, perks, tiers } from "@/lib/ecommerceOffer";
import { ArrowRight, BookOpen, Check, Gift, ShoppingBag } from "lucide-react";
import { useState } from "react";

/**
 * What a signed-in visitor sees before they are a client.
 *
 * Signing in with Google routes every non-admin account to the portal, but a
 * fresh account has no client record, so the portal's own data is empty by
 * definition. This is the part that is useful on day one: what the studio
 * builds, what it gives away for free, and the ecommerce background a first
 * store owner needs. Requests route through the public enquiry form so they
 * land in the CEO inbox rather than a dead end.
 */
export function MemberResources({ email }: { email?: string | null }) {
  return (
    <div className="mt-12 space-y-12">
      <Services />
      <Perks email={email} />
      <Lessons />
    </div>
  );
}

function SectionHead({ kicker, title, detail, icon }: { kicker: string; title: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="eyebrow">{kicker}</p>
        <h2 className="mt-2 font-display text-3xl tracking-[-0.05em] text-[#173d30]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#698279]">{detail}</p>
      </div>
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#ebf8ef] text-[#0d8855]">{icon}</span>
    </div>
  );
}

function Services() {
  return (
    <section aria-labelledby="member-services">
      <SectionHead
        kicker="What we build"
        title="Studio services"
        detail="Fixed scope and fixed price, agreed in writing before anything starts. All prices are exclusive of 18% GST."
        icon={<ShoppingBag className="h-5 w-5" />}
      />
      <h3 id="member-services" className="sr-only">
        Store build tiers
      </h3>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article key={tier.name} className="surface-card flex flex-col">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4c9674]">{tier.name}</p>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <strong className="font-display text-3xl font-medium tracking-[-0.05em] text-[#14392d]">{tier.price}</strong>
              <span className="text-[11px] font-bold text-[#789087]">{tier.timing}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#64796e]">{tier.intro}</p>
            <ul className="mt-5 space-y-2">
              {tier.groups.flatMap(([, ...items]) => items).map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-[#60776b]">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[#0d8855]" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {carePlans.map(([name, price, details]) => (
          <article key={name} className="surface-card">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4c9674]">Care plan</p>
            <h4 className="mt-2 font-display text-2xl tracking-[-0.04em] text-[#173d30]">{name}</h4>
            <strong className="mt-1 block font-display text-xl font-medium text-[#9a7f42]">{price}</strong>
            <p className="mt-3 text-xs leading-5 text-[#698279]">{details}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Perks({ email }: { email?: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  // The enquiry form on the public homepage is the one path that reaches the
  // CEO inbox, so requesting a resource uses it rather than pretending to be
  // an instant download.
  const requestHref = (title: string) => `/?resource=${encodeURIComponent(title)}#enquiry`;

  return (
    <section aria-labelledby="member-perks">
      <SectionHead
        kicker="Free, no engagement needed"
        title="Perks"
        detail={email ? `Available on your account (${email}). Ask for any of these and we will send it across — there is no charge and no obligation to build with us.` : "Ask for any of these and we will send it across — there is no charge and no obligation to build with us."}
        icon={<Gift className="h-5 w-5" />}
      />
      <h3 id="member-perks" className="sr-only">
        Free resources
      </h3>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {perks.map((perk) => {
          const isOpen = open === perk.title;
          return (
            <article key={perk.title} className="surface-card">
              <h4 className="font-display text-2xl tracking-[-0.04em] text-[#173d30]">{perk.title}</h4>
              <p className="mt-2 text-sm leading-6 text-[#698279]">{perk.summary}</p>
              {isOpen ? <p className="mt-3 text-xs leading-5 text-[#789087]">{perk.detail}</p> : null}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a href={requestHref(perk.title)}>
                  <Button size="sm" className="gap-2 rounded-full bg-[#103c2e] text-xs text-white hover:bg-[#0b3024]">
                    Request this <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(isOpen ? null : perk.title)}
                  aria-expanded={isOpen}
                  className="rounded-full border-[#b8c8c0] bg-white text-xs text-[#254b3d] hover:bg-[#f3f7f3]"
                >
                  {isOpen ? "Less" : "What's in it"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Lessons() {
  return (
    <section aria-labelledby="member-lessons">
      <SectionHead
        kicker="Ecommerce, explained"
        title="What to know before you sell online"
        detail="The parts of running an Indian online store that most often catch a first-time owner out. Written from what we hit on real builds."
        icon={<BookOpen className="h-5 w-5" />}
      />
      <h3 id="member-lessons" className="sr-only">
        Ecommerce essentials
      </h3>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {lessons.map((lesson) => (
          <article key={lesson.title} className="surface-card">
            <span className="rounded-full bg-[#e5fff0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#0d8855]">{lesson.tag}</span>
            <h4 className="mt-4 font-display text-2xl tracking-[-0.04em] text-[#173d30]">{lesson.title}</h4>
            <p className="mt-3 text-sm leading-6 text-[#698279]">{lesson.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
