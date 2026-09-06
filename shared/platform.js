/**
 * Site + CRM — the second service line, separate from the store tiers.
 *
 * A store tier is a project: we build it, hand it over, you own it. This is a
 * product: a website with a CRM behind it that keeps running, so it is priced
 * as a setup fee plus a monthly rather than one number.
 *
 * Read by login.html (to label the sign-in), index.html (the band pointing at
 * the page) and admin/modules/leads.js (to name the service on a lead).
 *
 * The copy on platform.html is static HTML on purpose — crawlers read markup
 * far more reliably than JS output, and that page is meant to rank. If you
 * change a price here, change it on platform.html too.
 */

export const PLATFORM = {
  id: "platform",
  name: "Site + CRM",
  tagline: "A website, and the system that works the leads it brings in.",
  setup: 79999,
  monthly: 9999,
  weeks: "6 weeks",
  term: "12-month minimum on the monthly",
  blurb:
    "One setup, one dashboard: your site, every enquiry, WhatsApp, and the numbers behind both. Built for teams who live on their phones.",
};

/** What the setup fee buys. */
export const PLATFORM_INCLUDES = [
  {
    title: "The website",
    body: "A fast multi-page site on your own domain — listings or projects you edit yourself, galleries, search and filters, and enquiry forms that go straight into the CRM. Built to load on a 4G phone.",
  },
  {
    title: "Your own admin dashboard",
    body: "One place to run it. Add and edit what's on the site, see every enquiry, assign it to someone, and know where it stands. No separate logins for separate tools.",
  },
  {
    title: "Lead CRM, built in",
    body: "Every enquiry becomes a record with a stage, an owner and a follow-up date that chases people. Notes, calls and site visits logged against the person, so nothing lives only in someone's head.",
  },
  {
    title: "WhatsApp, both ways",
    body: "Enquiries arrive on WhatsApp and replies go back from the dashboard, logged against the lead. Set up on the official WhatsApp Business API in your business's name.",
  },
  {
    title: "Chat agent on the site",
    body: "Answers the questions you get twenty times a day — price, location, availability, timelines — and hands over to a human the moment someone is serious, with the whole conversation attached.",
  },
  {
    title: "Meta leads, imported",
    body: "Leads from your Facebook and Instagram ads land in the CRM within seconds, assigned and ready to call, instead of sitting in a CSV nobody downloads.",
  },
  {
    title: "Visitor analytics and footfall",
    body: "Who came, from where, on what, and what they actually looked at — with a click heat map over the real pages and scroll depth, so you can see where people lose interest.",
  },
  {
    title: "Set up, verified, indexed",
    body: "Domain, SSL, Google Search Console verified and the sitemap submitted, structured data, and the analytics live from day one. Not a to-do list handed to you at the end.",
  },
];

/** One engine, configured per business. Real estate ships first. */
export const PLATFORM_VERTICALS = [
  {
    id: "realestate",
    name: "Real estate",
    status: "Available now",
    body: "Projects, units and localities on the site. Enquiry → contacted → site visit → negotiation → booked. Site visits scheduled with reminders, and leads from 99acres, MagicBricks and Housing landing in the same inbox as the rest.",
  },
  {
    id: "hr",
    name: "HR — Modcon",
    status: "Launching soon",
    body: "A careers page on the site. Applied → screening → interview → offer → onboarding. People records, attendance and leave, documents and payroll-ready exports.",
  },
  {
    id: "general",
    name: "General CRM",
    status: "Launching soon",
    body: "For everyone else. Your site, your pipeline with your own stages, the same WhatsApp desk, the same reporting. Nothing about it is specific to one industry.",
  },
];

/** Said plainly, because hiding it is how these deals sour in month three. */
export const PLATFORM_COSTS = [
  { item: "Setup", who: "One-time to us", note: "₹79,999, GST extra. 50% to start, 50% at launch." },
  { item: "Monthly", who: "To us", note: "₹9,999/month, GST extra. Hosting, support, updates, and the CRM staying up. 12-month minimum." },
  { item: "WhatsApp messages", who: "Meta, on your account", note: "Meta bills per template message, and the WhatsApp provider adds a small monthly fee. Your account, your card — so you keep it if you ever leave us." },
  { item: "Chat agent usage", who: "On your account", note: "Charged per conversation by the AI provider. Typically a few hundred rupees a month at normal volumes." },
  { item: "Domain and ads", who: "Yours", note: "Your domain, and whatever you spend on Meta or Google. We never mark these up." },
];

export const PLATFORM_STEPS = [
  { title: "Pick it and sign in", body: "Sign in with Google. That's the whole form — we get your email and call you within one working day." },
  { title: "One call to scope it", body: "Thirty minutes: what goes on the site, how your pipeline actually works, who needs a login, which number WhatsApp runs on." },
  { title: "Six weeks to live", body: "Site, dashboard and CRM built and tested. WhatsApp and Meta connected to your own accounts. We train your team on a call and stay on the monthly." },
];

export const PLATFORM_FAQ = [
  {
    q: "Why a monthly as well as a setup fee?",
    a: "Because it doesn't stop working when we hand it over. The monthly covers hosting, security updates, support, and the WhatsApp and Meta connections staying alive — those break when tokens expire, and someone has to fix them. A one-time fee for a living system is how you end up with an abandoned one.",
  },
  {
    q: "Does WhatsApp take over my existing number?",
    a: "It can, and you should know this before you decide. A number on the official WhatsApp Business API can no longer be used in the normal WhatsApp or WhatsApp Business app. Most teams put the business line on the API and keep personal numbers as they are. We settle it on the call, not during the build.",
  },
  {
    q: "Do I own it?",
    a: "The domain, the website, the data and the WhatsApp and ad accounts are all in your business's name. Export your leads any time. The platform itself is licensed while you're on the monthly, the same as any tool you'd pay for.",
  },
  {
    q: "How is this different from the CRMs already selling to us?",
    a: "Those are sold to the person who reads the reports, not the person standing outside a site at 4pm who has to feed it. Ours is built for that person's phone and runs on WhatsApp, which is where they already work. If the field team actually updates it, the reports are worth reading. That's the whole design.",
  },
  {
    q: "What if I already have a website?",
    a: "Then we can connect the CRM to it and skip the build, which brings the setup down. Tell us on the call what it's built on. If it's slow or nobody can edit it, we'll say so.",
  },
  {
    q: "Can I cancel?",
    a: "After the first twelve months, with 30 days' notice. Your data comes with you as a full export. The setup is deliberately priced below what the work costs us, which is why the first year is committed.",
  },
];
