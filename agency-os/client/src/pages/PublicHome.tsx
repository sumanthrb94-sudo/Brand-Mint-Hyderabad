import { PublicInquiry } from "@/components/PublicInquiry";
import { PublicMotion } from "@/components/PublicMotion";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, type Transition, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Menu, PackageCheck, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const rise = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } };

const tiers = [
  { name: "Starter Store", price: "₹99,000", timing: "8 weeks", tone: "standard", intro: "A complete, working online store. Everything needed to take orders and get paid.", groups: [["Foundation", "Database design and setup", "Phone OTP customer accounts", "Deployment, domain connection and SSL"], ["Storefront", "Homepage and design system", "Product listing and detail pages", "Search, category filters and cart"], ["Checkout, orders and admin", "Razorpay online payments and COD", "Order confirmation and customer history", "Products, stock and order management"]] },
  { name: "Growth Store", price: "₹2,00,000", timing: "12 weeks", tone: "featured", intro: "Everything in Starter, plus the systems that reduce daily manual work.", groups: [["Shipping and returns", "Courier API integration", "Live tracking", "Returns and Razorpay refunds"], ["Selling", "Coupons and discount codes", "Abandoned-cart recovery", "Order lifecycle emails"], ["Quality and data", "Sales reporting and low-stock alerts", "GA4, Meta Pixel and conversion tracking", "Playwright suite, SEO audit and Lighthouse pass"]] },
  { name: "Commerce Store", price: "₹3,00,000", timing: "12+ weeks", tone: "standard", intro: "Everything in Growth, plus depth for stores with a team and volume.", groups: [["Access and reporting", "Staff, manager and owner roles", "Advanced reporting and data exports"], ["Customer features", "Product reviews and ratings", "Wishlist", "Loyalty or referral programme"], ["Scale", "Performance budgets enforced in CI", "60-day bug warranty"]] },
];

const carePlans = [
  ["Care", "₹12,500/mo", "Hosting, SSL, security updates, backups, uptime monitoring and small fixes."],
  ["Growth", "₹25,000/mo", "Everything in Care, plus content updates, a monthly report and one small feature each month."],
  ["Managed Commerce", "₹50,000/mo", "Everything in Growth, plus catalogue operations, campaign management and priority support."],
];

const faqs = [
  ["What is included in every build?", "Every tier includes a fixed scope and price agreed before work begins. The final build is tested, reviewed during a 5-day UAT window, and handed over with documentation and a walkthrough video."],
  ["What does the client need to provide?", "Product photography, descriptions and product data, brand assets if they exist, business and GST details, legal-policy content sign-off, and timely testing/sign-off during UAT."],
  ["What accounts are paid directly by the client?", "The client owns and pays for their domain, hosting or cloud account, SMS/OTP credits, Razorpay transaction fees, email service, and Google Play developer account if an Android app is included."],
  ["What is outside the tiers?", "Marketplace integrations, multi-vendor functionality, multi-currency or multi-language, native React Native apps, photography/copywriting, ongoing marketing, and WhatsApp or AI-chat automation are quoted separately if required."],
];

export default function PublicHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : { duration: 0.58, ease: [0.23, 1, 0.32, 1] };

  return <main className="public-home ecom-home min-h-screen overflow-x-hidden bg-[#f7f1e6] text-[#12362a]">
    <PublicMotion />
    <div className="public-noise" aria-hidden="true" />
    <header className="public-nav ecom-nav">
      <Link href="/" className="public-brand" aria-label="Brand Mint home"><BrandMark /><span>Hyderabad</span></Link>
      <nav className="public-nav-links" aria-label="Primary navigation"><a href="#tiers">Stores</a><a href="#care">Care plans</a><a href="#scope">Scope</a><a href="#faq">FAQ</a></nav>
      <div className="hidden items-center gap-3 md:flex"><Link href="/sign-in" className="public-ceo-link">Sign in</Link><a href="#enquiry"><Button className="ecom-button">Start a project <ArrowRight className="h-3.5 w-3.5" /></Button></a></div>
      <button className="public-menu-toggle md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button>
      <AnimatePresence>{menuOpen && <motion.nav initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={transition} className="public-mobile-menu" aria-label="Mobile navigation"><a href="#tiers" onClick={() => setMenuOpen(false)}>Stores</a><a href="#care" onClick={() => setMenuOpen(false)}>Care plans</a><a href="#scope" onClick={() => setMenuOpen(false)}>Scope</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><Link href="/sign-in" onClick={() => setMenuOpen(false)}>Sign in</Link><a href="#enquiry" onClick={() => setMenuOpen(false)} className="public-mobile-cta">Start a project <ArrowRight className="h-4 w-4" /></a></motion.nav>}</AnimatePresence>
    </header>

    <section className="ecom-hero public-container">
      <motion.div initial="hidden" animate="visible" transition={{ staggerChildren: reducedMotion ? 0 : 0.09 }} className="relative z-10 max-w-3xl"><motion.p variants={rise} transition={transition} className="public-eyebrow"><span />Custom ecommerce · Built end to end</motion.p><motion.h1 variants={rise} transition={transition}>A complete online store, live in <em>8 weeks.</em></motion.h1><motion.p variants={rise} transition={transition} className="ecom-hero-copy">Catalogue, cart, checkout, Razorpay with COD, orders, and an admin you actually run the business from. Fixed scope and fixed price, agreed in writing before anything starts.</motion.p><motion.div variants={rise} transition={transition} className="flex flex-wrap gap-3"><a href="#enquiry"><Button className="ecom-button ecom-button--large">Start a project <ArrowRight className="h-4 w-4" /></Button></a><a href="#tiers" className="public-text-cta">See what is included <ArrowRight className="h-4 w-4" /></a></motion.div></motion.div>
      <motion.div initial={reducedMotion ? false : { opacity: 0, rotate: 2, y: 18 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ ...transition, delay: reducedMotion ? 0 : 0.22 }} className="ecom-hero-window" aria-label="Store management illustration"><div className="ecom-window-top"><span className="flex gap-1.5"><i /><i /><i /></span><span>yourstore.in/admin</span></div><div className="ecom-window-main"><div className="ecom-window-revenue"><span>Store status</span><strong>Live</strong><svg viewBox="0 0 240 60" aria-hidden="true"><path d="M0 49 L30 43 L60 45 L88 32 L118 36 L150 19 L176 25 L205 10 L240 6" /></svg></div><div className="ecom-window-stack"><div><span>Orders</span><strong>24</strong></div><div><span>Checkout</span><strong>Ready</strong></div></div></div><div className="ecom-window-bottom"><span><Check className="h-3.5 w-3.5" />Razorpay</span><span><Check className="h-3.5 w-3.5" />COD</span><span><Check className="h-3.5 w-3.5" />GST invoices</span></div></motion.div>
    </section>

    <section className="ecom-commitments public-container"><div><strong>50/50</strong><span>Half to start, half on completion.</span></div><div><strong>5-day UAT</strong><span>You test on staging before the balance is due.</span></div><div><strong>Yours</strong><span>Code, design files and accounts transfer on final payment.</span></div><div><strong>Fixed scope</strong><span>Changes are quoted before the additional work begins.</span></div></section>

    <section className="public-section public-container" id="tiers"><div className="public-section-intro"><p className="public-kicker">01 — Store builds</p><h2>Three depths of the same <em>working store.</em></h2><p>Fixed scope, fixed price, agreed before work starts. All prices are exclusive of 18% GST.</p></div><div className="ecom-tier-grid">{tiers.map((tier, index) => <motion.article key={tier.name} initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} variants={rise} transition={{ ...transition, delay: reducedMotion ? 0 : index * .06 }} className={`ecom-tier ecom-tier--${tier.tone}`}><div className="flex items-start justify-between gap-4"><div><p className="ecom-tier-number">Tier {index + 1}</p><h3>{tier.name}</h3></div><ShoppingBag className="h-5 w-5" /></div><p className="ecom-tier-intro">{tier.intro}</p><div className="ecom-tier-price"><strong>{tier.price}</strong><span>{tier.timing}</span></div><div className="ecom-tier-groups">{tier.groups.map(([title, ...items]) => <div key={title}><h4>{title}</h4><ul>{items.map((item) => <li key={item}><Check className="h-3.5 w-3.5" />{item}</li>)}</ul></div>)}</div><a href="#enquiry">Choose {tier.name} <ArrowRight className="h-3.5 w-3.5" /></a></motion.article>)}</div></section>

    <section className="ecom-care" id="care"><div className="public-container"><div className="public-section-intro public-section-intro--dark"><p className="public-kicker">02 — After launch</p><h2>The work does not stop at <em>launch.</em></h2><p>Every store can continue on a monthly care plan. This is defined scope of work, not an hourly bucket. Cancel with 30 days’ notice.</p></div><div className="ecom-care-grid">{carePlans.map(([name, price, details], index) => <motion.article key={name} initial={reducedMotion ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ ...transition, delay: reducedMotion ? 0 : index * .08 }}><span>Care plan</span><h3>{name}</h3><strong>{price}</strong><p>{details}</p></motion.article>)}</div></div></section>

    <section className="public-section public-container" id="scope"><div className="public-section-intro"><p className="public-kicker">03 — Scope in writing</p><h2>Know what is included before you <em>begin.</em></h2><p>Clear inputs, client-owned accounts and declared boundaries keep the delivery scope useful and predictable.</p></div><div className="ecom-scope-grid"><article><PackageCheck className="h-5 w-5" /><h3>Add-ons</h3><ul><li>Android app — ₹50,000</li><li>Additional payment gateway — ₹25,000</li><li>Extra design revision round — ₹15,000</li></ul></article><article><ShieldCheck className="h-5 w-5" /><h3>Client provides</h3><ul><li>Photography, descriptions and product data</li><li>Brand assets, business and GST details</li><li>Legal policy content sign-off and UAT sign-off</li></ul></article><article><Check className="h-5 w-5" /><h3>Client-paid accounts</h3><ul><li>Domain, hosting/cloud, SMS/OTP and email</li><li>Razorpay transaction fees</li><li>Google Play developer account if Android is included</li></ul></article><article><X className="h-5 w-5" /><h3>Quoted separately</h3><ul><li>Marketplace, multi-vendor, multi-currency or multi-language work</li><li>Native React Native app, photography or copywriting</li><li>Marketing, ads, content and WhatsApp/AI chat automation</li></ul></article></div></section>

    <section className="ecom-process public-container"><div className="public-section-intro"><p className="public-kicker">04 — Delivery terms</p><h2>Built, tested, signed off, then <em>live.</em></h2></div><div className="ecom-process-grid"><div><span>01</span><h3>Agree</h3><p>Scope, price and the required client inputs are confirmed before work starts.</p></div><div><span>02</span><h3>Build</h3><p>Timelines run from signed scope and receipt of client assets. Delays move the date day for day.</p></div><div><span>03</span><h3>Test</h3><p>UAT covers defects against the agreed scope during a five-day staging review window.</p></div><div><span>04</span><h3>Handover</h3><p>Go-live follows final payment; all code, design files and accounts transfer to the client.</p></div></div></section>

    <section className="public-section public-container" id="faq"><div className="public-section-intro"><p className="public-kicker">05 — Common questions</p><h2>Commercial terms made <em>clear.</em></h2></div><div className="public-faq-list">{faqs.map(([question, answer], index) => <Faq key={question} question={question} answer={answer} index={index} transition={transition} />)}</div></section>

    <section className="ecom-enquiry public-container" id="enquiry"><div><p className="public-kicker">Start with the project</p><h2>Bring the catalogue and the context. We will make the next step <em>clear.</em></h2><p>This short enquiry pre-fills the ecommerce onboarding flow. A client record is created only after the required brief and legal acceptance are complete.</p></div><PublicInquiry /></section>
    <footer className="public-footer public-container"><BrandMark /><div><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refund-policy">Refund</Link><Link href="/shipping-policy">Shipping</Link><Link href="/cookies">Cookies</Link></div><Link href="/sign-in">Sign in</Link></footer>
  </main>;
}

function Faq({ question, answer, index, transition }: { question: string; answer: string; index: number; transition: Transition }) {
  const [open, setOpen] = useState(index === 0);
  return <article className="public-faq"><button onClick={() => setOpen((value) => !value)} aria-expanded={open}><span>{question}</span><ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} /></button><AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={transition}><p>{answer}</p></motion.div>}</AnimatePresence></article>;
}
