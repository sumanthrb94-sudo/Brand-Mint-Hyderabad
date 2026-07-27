// Delivery runbooks — Growth and Business platforms.
//
// Source of truth for what each service IS remains assets/bm-catalog.js.
// This file is how one person actually delivers it: what must be true first,
// what to ask the client for, the steps in order, and how you know it worked.
//
// Two rules run through every entry and are not negotiable:
//   1. No credential is ever collected. Access is always delegated — the
//      client adds hello@brandmintstudios.in as a user on their own account.
//      Where the studio needs its own model key it lives in a Vercel
//      environment variable the studio sets, and never reaches the browser.
//   2. Any AI feature ships with a written eval suite or it does not ship.
//      State the accuracy you measured. Never promise one you have not.

export const RUNBOOKS = {
  "instagram": {
    summary:
      "Connect the client's Instagram Business account through the Meta Graph API so the site shows their feed, posts publish on a schedule, and comments and DMs get automated replies — with a token refresh job so the integration does not die in sixty days.",
    prerequisites: [
      "The client's Instagram account is Business or Creator and is linked to a Facebook Page. A personal account returns nothing useful from the Graph API.",
      "A Meta app exists under the studio's own developer account with the Instagram Graph API and messaging permissions added.",
      "The site has Vercel /api routes available — token refresh and webhooks need a server.",
    ],
    fromClient: [
      "Delegated access: ask them to add hello@brandmintstudios.in in Meta Business Suite, Settings, People, with the Instagram account and Page assigned. Never a login.",
      "Written confirmation they accept Meta's automated-messaging and platform policies.",
      "The posting cadence, and the exact wording for every automated reply case.",
    ],
    steps: [
      {
        do: "Confirm in Meta Business Suite, Settings, Accounts, Instagram that the account shows as Business and is linked to a Page.",
        where: "client",
        detail: "If it is personal, they convert it themselves in the Instagram app under Settings, Account type. Nothing else works until this is true.",
      },
      {
        do: "Ask the client to add hello@brandmintstudios.in under Meta Business Suite, Settings, People, and assign the Instagram account and the Page.",
        where: "client",
        detail: "Delegated access only. If they offer a username and password, hand it back and repeat the instruction.",
      },
      {
        do: "Generate a long-lived Page access token through the studio's Meta app and store it as a Vercel environment variable.",
        where: "Vercel",
        detail: "Project Settings, Environment Variables. It is a secret: server-side only, never in the repo, never in the client bundle.",
      },
      {
        do: "Write the Graph client in the repo under api/instagram/ as one fetch wrapper that reads the token from process.env.",
        where: "repo",
      },
      {
        do: "Add a scheduled refresh job that exchanges the token before expiry and records the new expiry date.",
        where: "repo",
        detail: "Vercel cron. Meta long-lived tokens last about sixty days; a refresh you never wrote is an integration that dies quietly.",
      },
      {
        do: "Build the feed component against a cached server route, so the browser never calls Graph directly.",
        where: "repo",
      },
      {
        do: "Build the scheduler: queued posts in Firestore, a cron worker that publishes and stamps the result back onto the row.",
        where: "repo",
      },
      {
        do: "Wire comment and DM auto-reply to the agreed wording, and log every automated reply with the message that triggered it.",
        where: "repo",
      },
      {
        do: "Add an alert to the studio if the refresh job has not succeeded for seven days.",
        where: "repo",
      },
    ],
    verify: [
      "The live site shows the client's most recent posts, and a post made on the phone appears there within the cache window.",
      "A post scheduled five minutes ahead actually publishes, and the queued row is stamped with the returned Instagram media id.",
      "Comment on a post from a second account and the agreed auto-reply arrives.",
      "The expiry date in the refresh log is at least thirty days out.",
    ],
    traps: [
      "Token expiry is the failure mode. Do not hand over until you have watched the refresh job run once and seen the recorded expiry date move.",
      "Messaging permissions need Meta app review. Start it before promising a live date — approval is not same-day, and rejections happen.",
      "A personal Instagram account looks fine in the UI and fails at the API. Check the account type first, not after building the feed.",
      "Never put the token in the repo or ship it to the browser. Vercel environment variable, read server-side.",
    ],
    handover: [
      "The feed live on the site, refreshing on its own.",
      "A screen where they queue posts and see what published.",
      "A log of every automated reply, so they can answer what it said to a customer.",
      "A written note of when the token last refreshed and who gets alerted if it stops.",
    ],
  },

  "analytics": {
    summary:
      "Instrument the five events the client will actually review, on a privacy-friendly tool, and give them a dashboard login of their own.",
    prerequisites: [
      "The site is live on its production domain. Analytics on a preview URL measures nothing real.",
      "Five events agreed with the client in advance — without that decision this becomes a dashboard nobody opens.",
    ],
    fromClient: [
      "The five actions worth counting, in their words: enquiry sent, WhatsApp tapped, price list downloaded, and so on.",
      "If they already use Google Analytics or Search Console, ask them to add hello@brandmintstudios.in as a user on their own property. Never their Google password.",
    ],
    steps: [
      {
        do: "Run a twenty-minute call and write down exactly five events. Stop at five.",
        where: "client",
        detail: "Ask what they would change if a number went down. Anything that survives that question is an event; anything else is noise.",
      },
      {
        do: "Enable Vercel Web Analytics on the project under Analytics, or add the Plausible script if they want a dashboard in their own account.",
        where: "Vercel",
      },
      {
        do: "Add the tracking snippet once in the shared layout, not per page.",
        where: "repo",
      },
      {
        do: "Fire the five custom events at the exact points they happen — form submit handler, outbound click handler — named in the client's vocabulary.",
        where: "repo",
      },
      {
        do: "Where Google Analytics or Search Console is in use, have the client add hello@brandmintstudios.in under Admin, Property Access Management, or Settings, Users and permissions.",
        where: "Google",
      },
      {
        do: "Deploy a preview, walk each of the five paths, and confirm every event lands.",
        where: "Vercel",
      },
      {
        do: "Write a one-page note naming each event, where it fires, and what a change in it would mean.",
        where: "repo",
      },
    ],
    verify: [
      "Perform all five actions on the live site and see all five appear in the dashboard within the tool's reporting delay.",
      "The dashboard shows pageviews for the production domain, not for the Vercel preview host.",
      "The client can sign into the dashboard themselves, without going through the studio.",
    ],
    traps: [
      "Instrumenting everything produces a dashboard nobody opens. Agree five, build five.",
      "A form submit that navigates away can kill the event before it sends. Send with a beacon, then navigate.",
      "Ad blockers suppress some analytics. Never present these as a complete count of visitors; say what they are.",
      "Zero events after launch is almost always the snippet living only on the preview deployment. Check the domain before debugging code.",
    ],
    handover: [
      "Their own login to the analytics dashboard.",
      "Five named events they can read without translation.",
      "A one-page note of what each event means and where it fires.",
    ],
  },

  "seo-schema": {
    summary:
      "Per-page metadata, a generated sitemap and JSON-LD emitted from the same data the page renders, submitted to the client's own Search Console property.",
    prerequisites: [
      "The site is live on its final production domain with HTTPS. Canonicals cannot be set against a domain that is about to change.",
      "Page types are settled — home, service, product, article — because schema is per type, not per page.",
    ],
    fromClient: [
      "Target keywords if they have them. If not, say so and use their own service names rather than inventing terms.",
      "Legal business name, address, phone and hours exactly as they appear elsewhere online — these go into Organization or LocalBusiness schema and must match.",
      "Ask them to add hello@brandmintstudios.in in Google Search Console under Settings, Users and permissions. Never their Google password.",
    ],
    steps: [
      {
        do: "List every page type and assign one schema type to each: Organization, LocalBusiness, Product, Article, BreadcrumbList, FAQPage.",
        where: "repo",
      },
      {
        do: "Add per-page title, description and canonical through the Next metadata API, one export per route, canonical built from a single config value.",
        where: "repo",
      },
      {
        do: "Emit JSON-LD from the same data object the page renders.",
        where: "repo",
        detail: "One helper taking the page data. Never a hand-written script tag with retyped values — that is how markup drifts from content.",
      },
      {
        do: "Generate sitemap.xml from the route and content list rather than maintaining it by hand, and add robots.txt pointing at it.",
        where: "repo",
      },
      {
        do: "Run one live URL of every page type through Google's Rich Results Test and fix every error before deploying.",
        where: "Google",
      },
      {
        do: "Have the client verify the property in Search Console, then submit the sitemap under Indexing, Sitemaps.",
        where: "Google",
      },
      {
        do: "Record the indexed-page count and coverage state on the day of handover as the baseline.",
        where: "local",
      },
    ],
    verify: [
      "Rich Results Test returns no errors for one live URL of every page type.",
      "Search Console lists the sitemap as Success, with a page count matching the number of live pages.",
      "View source on a service or product page and the JSON-LD values match the visible text, field for field.",
    ],
    traps: [
      "Schema describing something not visible on the page earns a Google manual action, not a ranking boost. Generate it from rendered data.",
      "Do not promise rankings or traffic. You control the markup and nothing else. Report what is measurable: errors fixed, pages indexed.",
      "A canonical pointing at the wrong host — apex versus www, or a Vercel preview alias — silently splits indexing. Build it from one config value.",
      "Do not submit the sitemap from the studio's own Search Console account. The property belongs to the client, with the studio delegated onto it.",
    ],
    handover: [
      "Their Search Console property, sitemap submitted, studio added as a user.",
      "Valid structured data on every page type, checked rather than assumed.",
      "The baseline indexed-page count, so the next review has something to compare against.",
    ],
  },

  "rag-docs": {
    summary:
      "Ingest a client document set and answer questions from it with a citation on every answer, plus an eval suite that shows what it gets right and where it fails.",
    prerequisites: [
      "A written data agreement, signed before any document is uploaded, naming which document classes may be sent to a third-party model and which may not.",
      "The studio's own embedding and model API key set as a Vercel environment variable by the studio. Never collected from the client, never in the browser.",
      "A named owner on the client side who can say whether a given answer is right or wrong.",
      "No prior implementation exists in the studio's repos, so treat this as a build rather than an extraction and estimate accordingly.",
    ],
    fromClient: [
      "The document set, through a drive they own — ask them to add hello@brandmintstudios.in as a viewer rather than emailing files around.",
      "Thirty to fifty real questions with the answer they expect. This is the eval suite; without it there is no build.",
      "Who may ask questions of the corpus, and which documents must never be indexed at all.",
    ],
    steps: [
      {
        do: "Agree in writing, before any upload, which document classes may go to a third-party model, and name the provider.",
        where: "client",
        detail: "Personal data, contracts under NDA and anything carrying third-party confidentiality obligations are decided here, not later. Get it countersigned.",
      },
      {
        do: "Collect the top thirty to fifty real questions with expected answers and commit them as evals/rag.jsonl before writing any retrieval code.",
        where: "repo",
      },
      {
        do: "Build ingest: read, chunk by heading with overlap, and store the source file, page or section on every chunk.",
        where: "repo",
        detail: "Citations are only possible if the pointer is captured at ingest. Retrofitting it means reingesting everything.",
      },
      {
        do: "Set the embedding and model API key as a Vercel environment variable in the studio's account, and keep every model call inside /api.",
        where: "Vercel",
      },
      {
        do: "Embed and store vectors, with a re-ingest command that is safe to run repeatedly.",
        where: "repo",
      },
      {
        do: "Implement retrieve-then-answer, instructed to answer only from retrieved chunks and to say it does not know otherwise.",
        where: "repo",
      },
      {
        do: "Render every answer with citations linking back to the source document and section.",
        where: "repo",
      },
      {
        do: "Add an excluded-documents check so anything the agreement forbids cannot be ingested by accident.",
        where: "repo",
      },
      {
        do: "Run the eval suite with promptfoo and record the measured pass rate, with the date and the corpus version.",
        where: "local",
        detail: "Report that number as it came out. Do not round it up and do not quote a figure from someone else's benchmark.",
      },
      {
        do: "Hand over the eval file and the command to run it, so the client can re-run it after any change.",
        where: "client",
      },
    ],
    verify: [
      "Every answer in the UI carries at least one citation, and opening it shows the passage that supports the answer.",
      "A promptfoo run over evals/rag.jsonl prints a pass rate, and the same number appears in the handover note.",
      "Ask something the corpus genuinely cannot answer and it says it does not know rather than inventing one.",
      "A document on the excluded list is refused by the ingest command.",
    ],
    traps: [
      "An answer without a citation cannot be checked, and an unverifiable answer is worse than none. Do not ship the answer path before the citation path.",
      "Never state an accuracy figure you have not measured on their documents. Report the eval result and the date it was run.",
      "Uploading documents before the data agreement is signed cannot be undone. The agreement is step one, not paperwork to catch up on.",
      "Scanned PDFs return no text and ingest silently as empty chunks. Check extracted character counts per file and flag the zeros.",
      "Evals written afterwards test what you built, not what they needed. Collect the questions first.",
    ],
    handover: [
      "A question box that answers from their documents, with sources they can open.",
      "The eval file, the command to run it, and the measured pass rate with its date.",
      "The signed data agreement listing what may and may not be sent to the model.",
      "A re-ingest command for when the documents change.",
    ],
  },

  "doc-extraction": {
    summary:
      "Turn invoices, POs and bills into structured rows against a strict schema, route anything low-confidence to a human review queue, and export what passes into their accounting tool.",
    prerequisites: [
      "Fifty real sample documents in hand before quoting. Layout variety is the whole risk and three samples cannot show it.",
      "A written data agreement covering supplier documents sent to a third-party model, signed before the first upload.",
      "The studio's model API key in a Vercel environment variable, set by the studio.",
      "The accounting tool's exact import format, confirmed against a real import rather than a screenshot.",
    ],
    fromClient: [
      "Fifty real documents covering their genuine spread of suppliers and layouts.",
      "The exact field list, and which fields are mandatory.",
      "The accuracy level they will accept, and who works the review queue below it.",
      "Delivery through a drive they own — ask them to add hello@brandmintstudios.in as a viewer.",
    ],
    steps: [
      {
        do: "Agree in writing what may be sent to the model provider, name the provider, and confirm its data-retention setting, before any document is uploaded.",
        where: "client",
      },
      {
        do: "Split the fifty samples and hold fifteen back as the eval set, unopened while building.",
        where: "local",
        detail: "Tuning against documents you also test on produces a number that means nothing.",
      },
      {
        do: "Write the target schema as a strict JSON schema in the repo, every field typed, required-ness explicit.",
        where: "repo",
      },
      {
        do: "Hand-key the expected output for all fifteen eval documents into evals/extraction.json before writing extraction code.",
        where: "repo",
      },
      {
        do: "Build the extraction call with structured output against the schema, storing per-field confidence alongside each value.",
        where: "repo",
      },
      {
        do: "Route any document with a missing required field, or confidence below the agreed threshold, into the review queue instead of the export.",
        where: "repo",
      },
      {
        do: "Build the review screen: document on the left, editable extracted fields on the right, approve writes the corrected row.",
        where: "repo",
      },
      {
        do: "Build the export in the confirmed format and import one real batch into their accounting tool to prove it.",
        where: "client",
      },
      {
        do: "Run the held-back eval set, record per-field accuracy and the sample size, and write both into the handover with the date.",
        where: "local",
      },
    ],
    verify: [
      "Running the fifteen held-back documents prints a per-field accuracy figure, and that exact figure goes into the handover.",
      "A deliberately poor scan lands in the review queue rather than exporting a confident wrong value.",
      "One real export file imports into their accounting tool with no manual editing.",
      "Correcting a field in the review screen changes the exported row.",
    ],
    traps: [
      "Quoting from three sample invoices is how this loses money. Layouts vary far more than anyone expects — get fifty before pricing.",
      "Never let a low-confidence extraction flow straight to export. A wrong number that looks certain is worse than a queued document.",
      "Do not promise an accuracy percentage before measuring it on their documents. State the measured figure and the sample size.",
      "Scanned and photographed documents need OCR before the model sees them. Budget for it, or exclude them in writing.",
      "Handwriting and stamped-over totals will not be solved. Say so up front and route them to review by rule.",
    ],
    handover: [
      "A drop-in queue where documents become rows they can check.",
      "A review screen for anything uncertain, showing why it was flagged.",
      "An export their accounting tool accepts, proven with one real batch.",
      "The eval set, its expected answers, and the measured per-field accuracy with its date.",
    ],
  },

  "lead-qualifier": {
    summary:
      "An intake form scored by a model against the client's written rubric, booking qualified enquiries into their own calendar and escalating anything uncertain to a human.",
    prerequisites: [
      "A qualification rubric written down and agreed. You cannot automate a judgement nobody has articulated.",
      "A calendar the client controls, with their availability rules already set on it.",
      "The studio's model API key as a Vercel environment variable, with every model call server-side.",
    ],
    fromClient: [
      "The rubric: what makes a lead qualified, disqualified, or uncertain, in their words.",
      "Calendar access by delegation — ask them to add hello@brandmintstudios.in under their own Google Calendar sharing settings. Never a password.",
      "Thirty past enquiries with their own verdict on each. That is the eval set.",
      "Who receives escalations, and the response time they are committing to.",
    ],
    steps: [
      {
        do: "Sit with the client and write the rubric as numbered rules. Do not proceed from a verbal description.",
        where: "client",
      },
      {
        do: "Collect thirty past enquiries, have the client label each one, and commit them as evals/qualifier.jsonl.",
        where: "repo",
        detail: "Their labels, not yours. The rubric is theirs to be right about.",
      },
      {
        do: "Build the intake form to write the raw enquiry to Firestore first, before any scoring.",
        where: "repo",
        detail: "An enquiry must never be lost because a model call failed.",
      },
      {
        do: "Add the /api scoring route: rubric in the system prompt, structured output of verdict, reason and confidence.",
        where: "repo",
      },
      {
        do: "Set the model API key in Vercel environment variables under the studio's account.",
        where: "Vercel",
      },
      {
        do: "Route by verdict — qualified offers the booking link, uncertain and disqualified go to a human queue with the reason shown.",
        where: "repo",
      },
      {
        do: "Wire booking against the client's calendar API so a confirmed slot lands on their real calendar.",
        where: "repo",
      },
      {
        do: "Stamp the first-response time on every enquiry, once, so the client can see how fast it actually replied.",
        where: "repo",
      },
      {
        do: "Run the eval set, record agreement with the client's labels, and walk them through every disagreement.",
        where: "local",
        detail: "Disagreements are rubric bugs at least as often as model bugs. Fix the rubric first.",
      },
    ],
    verify: [
      "Submit one clearly qualified and one clearly unqualified test enquiry; both are scored correctly and routed to different places.",
      "The eval run prints agreement against the client's thirty labels, and that number goes into the handover.",
      "A booking made through the flow appears on the client's own calendar with the right duration.",
      "Disable the model key temporarily and submit an enquiry: it still lands in the queue, unscored, rather than vanishing.",
    ],
    traps: [
      "No written rubric means no build. Everything downstream inherits the vagueness and the client will be right to reject the output.",
      "Never let a disqualified verdict delete an enquiry. Disqualified means queued with a reason.",
      "Do not claim a qualification accuracy you have not measured against their own labels.",
      "Escalation needs a human at the end with an agreed response time. Escalation into nobody's inbox is a lost lead with extra steps.",
      "Calendar access is delegated, never handed over — they add hello@brandmintstudios.in under their own calendar sharing settings. A login offered in a message goes back unused.",
    ],
    handover: [
      "Enquiries arriving already scored, with the reason for each verdict visible.",
      "Bookings landing on their calendar without a message being exchanged.",
      "A queue of everything the system was unsure about.",
      "The eval file, the command to run it, and the measured agreement with their labels.",
    ],
  },

  "voice-agent": {
    summary:
      "Discovery first — this is marked later in the catalogue because nobody has built it here yet. An inbound phone agent is sold as a paid discovery day, because latency, telephony cost and recording consent decide whether it is feasible at all.",
    prerequisites: [
      "A paid discovery day sold and booked before any build is quoted. A confident quote here is a guess with a price on it.",
      "What is unknown, stated plainly to the client: which Indian telephony provider gives acceptable round-trip latency, what a minute really costs once telephony, speech-to-text, model and text-to-speech are stacked, and whether their call volume justifies any of it.",
      "The legal position on call recording confirmed by the client's own advisor, not assumed by the studio.",
    ],
    fromClient: [
      "The phone number and telephony provider — ask them to add hello@brandmintstudios.in as a user on their own provider account. Never account credentials.",
      "A written list of what the agent may say and what it must never say.",
      "Who it hands off to, during which hours, and what happens outside them.",
      "Written consent to record calls, plus the exact wording of the disclosure played to callers.",
      "Twenty recordings or transcripts of real calls, so the eval set comes from what actually happens.",
    ],
    steps: [
      {
        do: "Run the paid discovery day before quoting a build. The output is a written feasibility note, not a plan.",
        where: "client",
        detail: "Four unknowns to answer: provider latency, call volume, real cost per minute, and the recording-consent position. Answer them or do not proceed.",
      },
      {
        do: "Measure end-to-end latency on the client's actual telephony provider with a throwaway echo test, before designing anything.",
        where: "local",
        detail: "Speech in to speech out. Beyond roughly a second of silence callers hang up, and no amount of prompt work fixes it.",
      },
      {
        do: "Price one real minute end to end — telephony plus speech-to-text plus model plus text-to-speech — and show the client the arithmetic against their volume.",
        where: "local",
      },
      {
        do: "Write the recording disclosure and have the client's advisor confirm the consent flow is lawful, before a single call is recorded.",
        where: "client",
      },
      {
        do: "Build the eval set from the twenty real transcripts with an expected outcome for each, committed as evals/voice.jsonl.",
        where: "repo",
      },
      {
        do: "Only then build: telephony webhook, speech to text, one model turn inside the agreed script boundaries, speech back.",
        where: "repo",
      },
      {
        do: "Implement human handoff as the first path built, not the last. Any caller asking for a person gets one, from any point in the call.",
        where: "repo",
      },
      {
        do: "Run the eval set over transcripts, record the measured pass rate, and label it as measured on transcripts rather than live calls.",
        where: "local",
      },
      {
        do: "Pilot on a diverted number with a small share of calls before the main line points anywhere near it.",
        where: "client",
      },
    ],
    verify: [
      "The feasibility note contains a measured latency figure, with the provider name and the date it was measured.",
      "Calling the pilot number, the recording disclosure plays before anything is recorded.",
      "Saying you want to speak to a person transfers, from any point in the call.",
      "The eval run prints a pass rate over the twenty real transcripts, and that is the number in the handover.",
      "Every call produces a transcript the client can open.",
    ],
    traps: [
      "Do not quote a build without the paid discovery day. This is marked later precisely because the path has not been walked.",
      "Latency is the product. Test it on their provider and their line; a demo on a laptop proves nothing about a phone call.",
      "Recording consent is a legal requirement, not a settings toggle. No recording until the disclosure is agreed in writing.",
      "Cost stacks four ways per minute. Show the client that arithmetic before they hear the build price, not after the first bill.",
      "Never accept telephony account credentials. Delegated user access on their own account.",
    ],
    handover: [
      "A written feasibility note with the measured latency, the measured per-minute cost, and an honest go or no-go.",
      "If built: a live number with disclosure, human handoff and transcripts.",
      "The eval set of real calls with expected outcomes, and the measured pass rate with its date.",
    ],
  },

  "internal-copilot": {
    summary:
      "Discovery first — marked later in the catalogue, and the largest, least defined thing in it. An assistant reading across the client's own systems is scoped by what it may touch, so that scope is the design, not a detail.",
    prerequisites: [
      "A paid discovery day sold before any build quote. The surface is open-ended: every extra system is a new integration, a new permission boundary and a new set of evals.",
      "What is unknown, stated plainly: which of their systems have usable APIs, what read access can be granted without over-granting, and whether the questions they want answered can be answered from those systems at all.",
      "An append-only audit log built before the copilot can do anything at all.",
      "A written data agreement naming which systems' contents may be sent to the model provider.",
    ],
    fromClient: [
      "The list of systems it may read, each with delegated access — ask them to add hello@brandmintstudios.in as a user on their own account. Never an API key by email.",
      "A written list of what it may never do without a human. This is written before the list of what it can do.",
      "Twenty-five real questions staff actually ask, with the answer a knowledgeable colleague would give.",
      "Who owns the audit log and reviews it.",
    ],
    steps: [
      {
        do: "Run the paid discovery day. The output is a written system map: each system, whether it has a usable API, what read scope is needed, and what is out of reach.",
        where: "client",
      },
      {
        do: "Write the never-without-a-human list and get it signed. Sending anything to a customer, changing a record, and spending money are the default entries.",
        where: "client",
      },
      {
        do: "Agree in writing which systems' data may be sent to the model provider and which may not, naming the provider.",
        where: "client",
      },
      {
        do: "Build the append-only audit log before any tool call exists: who asked, what was planned, what ran, what came back.",
        where: "repo",
        detail: "A Firestore collection with create-only rules. If it can be edited it is not an audit log.",
      },
      {
        do: "Build a tool registry where each tool declares read or write, and every write tool requires an explicit human confirmation.",
        where: "repo",
      },
      {
        do: "Collect the twenty-five real questions with expected answers into evals/copilot.jsonl before building the planner.",
        where: "repo",
      },
      {
        do: "Set the model API key as a Vercel environment variable in the studio's account. Every call server-side, none from the browser.",
        where: "Vercel",
      },
      {
        do: "Implement the planner over the registry, with a hard refusal path when no registered tool can answer.",
        where: "repo",
      },
      {
        do: "Run the eval set, record the measured pass rate and the refusal rate, and report both with the date.",
        where: "local",
      },
      {
        do: "Pilot with one team and one read-only system before adding a second system.",
        where: "client",
      },
    ],
    verify: [
      "Every action appears in the audit log with a timestamp and the requesting user, and the log cannot be edited from the app.",
      "A request that would trigger anything on the never list is refused, and the refusal itself is logged.",
      "The eval run over the twenty-five questions prints a pass rate and a refusal rate, and both appear in the handover.",
      "Ask something none of the connected systems can answer and it says so rather than guessing.",
    ],
    traps: [
      "Do not quote this without discovery. The catalogue estimate is for a shape nobody has built; their systems decide the real number.",
      "Define what it may never do before what it can do. The reverse order is how a draft reply reaches a customer.",
      "Scope creep is the whole risk. Each additional system is another integration, permission and eval set — price them one at a time.",
      "No audit log, no copilot. Retrofitting one means you cannot answer what it did last month.",
      "Never accept API keys or passwords for the client's systems. Delegated user access on their own accounts only.",
    ],
    handover: [
      "The written system map from discovery, including what was found to be out of reach.",
      "The signed never-without-a-human list and the data agreement.",
      "An audit log the client owns and can read.",
      "The eval set with expected answers, and the measured pass and refusal rates with their date.",
    ],
  },

  "crm": {
    summary:
      "Contacts, companies and a drag-and-drop pipeline on the shared admin shell, using the client's own stage names — extracted from REAL-ESTATE-CRM rather than written fresh.",
    prerequisites: [
      "The shared admin shell exists: auth, roles, RBAC, navigation, table and form primitives. CRM, HRMS, approvals and reporting all sit on that one shell.",
      "The client's pipeline stages captured in writing, in their order and their words.",
      "Firestore rules for tenant isolation written and tested in the emulator before a single real contact is loaded.",
    ],
    fromClient: [
      "Their pipeline stages, in order, exactly as they say them on the phone.",
      "What counts as a qualified lead, in one sentence they agree with.",
      "Their existing contacts as a spreadsheet export, one row per contact, with an owner on each.",
      "Who may see whose deals. That answer shapes the rules, not the UI.",
    ],
    steps: [
      {
        do: "Extract the admin shell into the skeleton before touching any CRM screen.",
        where: "repo",
        detail: "One shell, shared by CRM, HRMS, approvals and reporting. Extracting it once is what takes each of those from about twelve days to about six.",
      },
      {
        do: "Put their stages in a config array. Stage names are data, never enum values scattered through the code.",
        where: "repo",
      },
      {
        do: "Port contacts and companies from REAL-ESTATE-CRM, keeping the model and rebuilding the surface on the shell's components.",
        where: "repo",
      },
      {
        do: "Build the pipeline board over the stage config, recording every move as an activity row rather than only a field update.",
        where: "repo",
      },
      {
        do: "Write Firestore rules for org-scoped reads and writes, and test them in the emulator before importing anything real.",
        where: "repo",
      },
      {
        do: "Import their spreadsheet through a dry-run preview that shows the diff before anything commits.",
        where: "local",
      },
      {
        do: "Add the activity log and reminders, so a contact with no activity for the agreed number of days surfaces on its own.",
        where: "repo",
      },
      {
        do: "Sit with the client while they move three real deals across the board, and rename stages to whatever they say out loud.",
        where: "client",
      },
    ],
    verify: [
      "The stage names on the board are the words the client used, with no generic stage left over.",
      "Moving a deal writes an activity row with who moved it and when; the board and the log agree.",
      "Signed in as a user of another organisation, the contacts query returns nothing — proven by the emulator rules tests, not inferred from the UI.",
      "The import preview shows a row count matching the source file before anything is committed.",
    ],
    traps: [
      "Do not fork the admin shell per client. Configuration yes, forks no — a forked shell is four codebases within a year.",
      "A generic pipeline is a CRM that gets opened twice. Model how they actually sell, including the stage they are embarrassed about.",
      "Never import contacts without a dry-run diff. One misaligned column silently rewrites every owner.",
      "Stage names change. As enum values every change is a deploy; as configuration it is an edit.",
    ],
    handover: [
      "Contacts and companies, searchable, each with its own history.",
      "A pipeline board in their stage names.",
      "Reminders for anything that has gone quiet.",
      "Their imported data, with the import preview kept as a record of what was loaded.",
    ],
  },

  "hrms": {
    summary:
      "Employee records, attendance and leave on the shared admin shell, ending in a payroll export the client's provider actually accepts — extracted from Modcon-HR.",
    prerequisites: [
      "The shared admin shell already extracted. HRMS is a tenant of it, never a fresh build.",
      "The payroll provider's exact import specification in hand on day one. It is the only deliverable that must be byte-correct.",
      "The client's written leave policy, with accrual, carry-forward and the year boundary stated numerically.",
    ],
    fromClient: [
      "The leave policy, with the rules as numbers rather than prose.",
      "The one attendance method they will actually use — app, biometric device, or manual — and if biometric, that device's export format.",
      "The payroll provider's import template as a real file, not a description.",
      "Their current employee list with joining dates.",
      "Who approves leave, by role rather than by name.",
    ],
    steps: [
      {
        do: "Get the payroll import template as a real file and confirm one row imports successfully before designing anything else.",
        where: "client",
        detail: "Every other decision is reversible. The export format is not.",
      },
      {
        do: "Encode the leave policy as configuration — accrual rate, carry-forward cap, year boundary — not as branching code.",
        where: "repo",
      },
      {
        do: "Port employee records from Modcon-HR onto the shared admin shell components.",
        where: "repo",
      },
      {
        do: "Build attendance capture for the one agreed method. Do not build all three.",
        where: "repo",
      },
      {
        do: "Build leave request and approval against their role list, showing the balance at request time.",
        where: "repo",
      },
      {
        do: "Write Firestore rules so an employee reads only their own record and a manager only their approval scope, and test the denials in the emulator.",
        where: "repo",
      },
      {
        do: "Build the payroll export to the confirmed template and dry-run one real month with the person who does their payroll.",
        where: "client",
      },
      {
        do: "Run a parallel month — their existing process alongside this one — and reconcile the two sets of payroll inputs.",
        where: "client",
      },
    ],
    verify: [
      "A full month's export imports into the payroll provider's system with no manual editing, confirmed by the person who runs payroll.",
      "The parallel month reconciles: attendance days and leave balances match their existing process, or every difference is explained and accepted.",
      "A signed-in employee sees their own leave balance and cannot read another employee's record — proven by the emulator rules tests.",
      "A leave request cannot be routed to the wrong approver, because the approver comes from role rather than a dropdown.",
    ],
    traps: [
      "Do not fork the admin shell per client. CRM, HRMS, approvals and reporting share one; forks are how a solo studio ends up maintaining four codebases.",
      "Payroll loses trust in a single month. Run a parallel month before cutover; never go live on the export alone.",
      "Building all three attendance methods triples the surface for one client's benefit. Agree one.",
      "Leave policy written as prose becomes ten edge cases at year end. Get the numbers, including what happens to a balance on the last day of the year.",
      "Employee data is personal data. It stays in their Firestore project and never lands in a shared spreadsheet for convenience.",
    ],
    handover: [
      "Employee records with joining dates and live leave balances.",
      "Attendance running through the one agreed method.",
      "A leave flow that routes to the right approver by role.",
      "A payroll export proven against one real month.",
    ],
  },

  "approvals": {
    summary:
      "A workflow engine where approval chains are data rather than code, routed by role, escalating on a timer, with an audit trail nobody can edit — on the same shared admin shell.",
    prerequisites: [
      "The shared admin shell in place. Approvals is a tenant of it, not a new application.",
      "The client's approval matrix written down: what is approved, by whom, in what order, above what value.",
      "Escalation rules agreed before build — what happens when an approver does nothing for the agreed number of days.",
      "No prior implementation exists in the studio's repos for this one, so estimate it as a build rather than an extraction.",
    ],
    fromClient: [
      "The approval matrix: request type, approver roles in order, thresholds.",
      "Escalation rules and timeouts, per request type.",
      "Who may read an approval trail after the fact.",
      "Three real past cases, including one that went wrong, to test the chain against.",
    ],
    steps: [
      {
        do: "Write the approval matrix as a table with the client and get it signed off before building.",
        where: "client",
        detail: "Ambiguity agreed here becomes a deadlock in production, with a person waiting at the end of it.",
      },
      {
        do: "Define chains as Firestore documents — steps, roles, thresholds, timeouts — so a policy change is configuration rather than a deploy.",
        where: "repo",
      },
      {
        do: "Build the state machine over those documents, validating every transition against the chain instead of assigning status directly.",
        where: "repo",
      },
      {
        do: "Build the append-only audit trail: who, what, when, and the chain version in force at the time.",
        where: "repo",
        detail: "Store the chain version on the request. A chain edited later must never rewrite the history of a decision already made.",
      },
      {
        do: "Build escalation as a scheduled job that notifies or moves the request on timeout, from day one.",
        where: "repo",
      },
      {
        do: "Write rules so an approver can act only on steps assigned to their role, and test the denials in the emulator.",
        where: "repo",
      },
      {
        do: "Replay the three real past cases through the built chain and compare the outcome with what actually happened.",
        where: "local",
      },
      {
        do: "Give requesters a view showing whose desk their request is on and how long it has been there.",
        where: "repo",
      },
    ],
    verify: [
      "Replaying the three real cases produces the same approvers in the same order as reality, or each difference is explained and accepted.",
      "A request left untouched past its timeout escalates on its own, observed on a deliberately shortened timer.",
      "A signed-in approver cannot approve a step assigned to another role — the write is denied by rules, not hidden by the UI.",
      "Editing a chain leaves the trail of an already-decided request untouched.",
    ],
    traps: [
      "Do not fork the admin shell per client. Chains as data are what let one shell serve every client; a fork means that idea has been abandoned.",
      "Approvals with no timeout stall silently and people go back to email. Escalation is day one, not phase two.",
      "Chains encoded in code make every policy change a deployment. Keep them as documents.",
      "An audit trail that can be edited is not an audit trail. Create-only rules: no update, no delete.",
      "Do not model an idealised process. Model what happens today, including the step everyone skips.",
    ],
    handover: [
      "Their approval chains, editable as configuration.",
      "A queue per approver showing what is waiting and for how long.",
      "Escalation running unattended.",
      "An audit trail they can read and cannot edit.",
    ],
  },

  "reporting": {
    summary:
      "Pre-aggregated numbers on the shared admin shell — the five things they check on a Monday, with one comparison period and a scheduled export — extracted from FreshKart admin/reports.",
    prerequisites: [
      "The shared admin shell already in place.",
      "Five numbers agreed in writing. Ask what they check on a Monday morning and build exactly those.",
      "The source collections already exist and are being written correctly. A report over incomplete data is a lie with a chart on it.",
    ],
    fromClient: [
      "The five numbers they review weekly, in their words, each with a definition.",
      "The comparison they care about: week on week, month on month, or against a target.",
      "Who receives the scheduled export, and in what format.",
      "Their financial year boundary, if any number is annual.",
    ],
    steps: [
      {
        do: "Ask what they look at on a Monday morning, write down five numbers with their definitions, and stop at five.",
        where: "client",
      },
      {
        do: "Write each definition as one sentence a bookkeeper would accept: what counts, what is excluded, and on what date it lands.",
        where: "repo",
      },
      {
        do: "Build a scheduled aggregation job writing daily rollup documents. Never compute these on page load.",
        where: "repo",
        detail: "Take the shape from FreshKart src/app/admin/reports and src/lib/reports.ts rather than writing it again.",
      },
      {
        do: "Build the dashboard on the shared admin shell, reading rollups only, with a date range and one comparison period.",
        where: "repo",
      },
      {
        do: "Make an empty source collection render as empty and say so.",
        where: "repo",
        detail: "Never print a reassuring zero for data that does not exist. An empty collection is not a completed month.",
      },
      {
        do: "Keep proposals, forecasts and anything unsigned visually separate from actuals, and never sum them into a total.",
        where: "repo",
      },
      {
        do: "Build the scheduled export in the format they asked for, delivered to the people they named.",
        where: "repo",
      },
      {
        do: "Reconcile all five numbers against how the client calculates them today, by hand, for one closed period.",
        where: "client",
      },
    ],
    verify: [
      "All five numbers reconcile against the client's own manual figures for one closed month, to the rupee or with each difference explained.",
      "A date range with no data reads as no data for this period, not as zero.",
      "The scheduled export arrives to the named recipients on time, carrying the same numbers as the dashboard.",
      "Changing the comparison period changes both figures on screen, not only the label.",
    ],
    traps: [
      "Do not fork the admin shell per client. Reporting shares it with CRM, HRMS and approvals.",
      "An empty collection rendering as a green zero is how a dashboard starts lying to its owner. Say the collection is empty.",
      "Aggregating on page load looks fine on demo data and times out on a real year. Pre-aggregate.",
      "Never sum a projection into an actual, and never give a forecast the same visual weight as a fact.",
      "Build the five they named. A sixth number added to be helpful is the one that gets questioned and takes the other five down with it.",
    ],
    handover: [
      "Five numbers, each with a written definition.",
      "A date range and one comparison period.",
      "A scheduled export to the people who need it.",
      "A reconciliation record showing the numbers matched their manual figures for one closed month.",
    ],
  },
};

export default RUNBOOKS;
