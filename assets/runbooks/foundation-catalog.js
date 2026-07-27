// Delivery runbooks — Foundation and Catalog services.
//
// Written against assets/bm-catalog.js. Where a runbook states a fact about
// what a service includes, requires or costs, that fact comes from the
// registry entry of the same id — this file must never contradict it.
//
// House rules these encode (CLAUDE.md sections 3 and 4):
//   - We never ask a client for a password, key or secret. Access is always
//     "add hello@brandmintstudios.in as a user on your own account".
//   - firestore.rules is the only security boundary. UI checks are comfort.
//   - A push to Vercel makes a preview. Production is promoted by hand.
//   - Empty is not the same as done — an empty collection must never render
//     as a finished, on-track state.

export const RUNBOOKS = {
  "static-site": {
    summary:
      "Build a brochure site from a content collection — pages, copy, images, a contact form, no database — and put it live on Vercel.",
    prerequisites: [
      "Scope agreed page by page and written down, because there is no CMS to absorb a change later",
      "A repository for the client site that is separate from Brand-Mint-Hyderabad",
      "Terms confirmed from the registry: 50% to start, 50% at launch, two review rounds included, 30-day warranty",
      "Decided where the contact form posts to, since this tier has no server of its own",
    ],
    fromClient: [
      "Copy for each page, or a brief for us to write it",
      "Logo and brand assets, in the highest resolution they have",
      "Domain registrar access — ask them to add hello@brandmintstudios.in as a user on their own account",
      "The inbox the contact form should reach, and who actually reads it",
    ],
    steps: [
      {
        do: "Scaffold an Astro or Next static-export project in the client's own repository",
        where: "repo",
        detail:
          "Keep it out of Brand-Mint-Hyderabad. That repo is served as static files with no build step and must never gain a package.json.",
      },
      {
        do: "Put every page's text into a content collection, one entry per page, and build one component per section",
        where: "repo",
        detail:
          "Content in data, layout in components. This is what makes a copy change a one-line edit rather than a hunt through markup.",
      },
      {
        do: "Wire the contact form to the destination agreed in prerequisites and send one real test message through it",
        where: "repo",
        detail:
          "This tier has no server. If no form destination has been agreed yet, stop and get that decision rather than guessing one.",
      },
      {
        do: "Resize every image to the width it is actually displayed at, export WebP, and set explicit width and height attributes",
        where: "local",
        detail: "Missing dimensions cause layout shift, which Lighthouse scores and clients notice.",
      },
      {
        do: "Compute the contrast ratio of every button and link against its real background; do not eyeball it",
        where: "local",
        detail: "4.5:1 minimum. Two invisible buttons have shipped on brandmintstudios.in by being judged by eye.",
      },
      {
        do: "Set a unique title, meta description, canonical URL and Open Graph image on every page",
        where: "repo",
      },
      {
        do: "Import the repo in Vercel, add cleanUrls to vercel.json, and push to get a preview",
        where: "Vercel",
      },
      {
        do: "Test the preview URL, then promote it in Vercel under Deployments, then run the deployment runbook for the domain",
        where: "Vercel",
        detail: "A push does not go live on its own. Nothing is live until it is promoted.",
      },
    ],
    verify: [
      "Open every page of the deployed URL in a private window and confirm each loads and every internal link resolves with no .html suffix",
      "Submit the contact form once and confirm the message arrives in the inbox the client named, not just that the form said thank you",
      "Run Lighthouse against the deployed URL, not localhost, and write the four scores into the handover",
      "View source on two pages and confirm the title, description and canonical differ between them",
    ],
    traps: [
      "Do not add a CMS 'just in case'. The moment content needs editing it is the dynamic tier and must be priced as one",
      "cleanUrls means /about.html returns 404. Every internal link must be /about",
      "A Vercel preview URL is not production. Sending the client a preview link and calling it launched is the most common false finish",
      "Lighthouse on localhost is not a real number. Measure the deployed host",
      "Client-supplied logos are often a low-resolution JPEG lifted from Facebook. Ask for the original before design, not during",
    ],
    handover: [
      "The site live on their domain over HTTPS",
      "A plain statement that nothing on this tier is client-editable — edits come to us",
      "Two review rounds included and a 30-day warranty, both from the registry terms",
      "The repository, so the work is theirs and not hostage to us",
    ],
  },

  "dynamic-site": {
    summary:
      "Build a content-managed site the client edits themselves: Firestore collections behind an authenticated admin shell, with public pages rendered server-side.",
    prerequisites: [
      "A written list, field by field, of exactly what the client will be able to edit — agreed before any schema is designed",
      "A Firebase project, with the Firestore region chosen deliberately because it cannot be changed later",
      "Agreement on who administers the site, since every admin is a person who can break the front page",
      "This tier needs a server, so it cannot be delivered as a static export",
    ],
    fromClient: [
      "Content structure: what they want to be able to edit, in their own words",
      "Who administers the site, by name and work email",
      "If the Firebase project is to sit in their own Google account, ask them to add hello@brandmintstudios.in as a user on it — we never take their login",
      "Initial content for each collection, or a decision to launch with the collection genuinely empty",
    ],
    steps: [
      {
        do: "Sit with the client and write the editable-field list before designing anything",
        where: "client",
        detail:
          "Retrofitting one editable field later is a rewrite of the form, the rules and a data migration. This conversation is the cheapest hour of the project.",
      },
      {
        do: "Create the Firebase project and enable Firestore in production mode, choosing the region nearest their users",
        where: "Firebase Console",
        detail: "asia-south1 (Mumbai) for an India audience. The location is permanent — a wrong choice means a re-import.",
      },
      {
        do: "Model one Firestore collection per editable content type, using the field list as the schema",
        where: "repo",
      },
      {
        do: "Write firestore.rules before the UI: public read on published content, writes only for the signed-in admin, and a final catch-all denying everything else",
        where: "repo",
        detail: "The rules are the security boundary. Anything the UI hides is still reachable from a browser console.",
      },
      {
        do: "Deploy the rules with firebase deploy --only firestore:rules and confirm the new timestamp in the console",
        where: "Firebase Console",
      },
      {
        do: "Build the admin shell behind Firebase Auth with shadcn/ui forms, one form per collection",
        where: "repo",
      },
      {
        do: "Create the client's admin user under Authentication, then use the built-in reset flow so they choose their own password — one we never see, never hold and never transmit",
        where: "Firebase Console",
        detail:
          "Never ask a client for a password and never send them one. It is set by them and exists nowhere in our systems.",
      },
      {
        do: "Add every live host to Authentication, Settings, Authorized domains",
        where: "Firebase Console",
        detail: "A missing host fails sign-in with auth/unauthorized-domain, which reads like a code bug for an hour before anyone checks.",
      },
    ],
    verify: [
      "Sign in as the client's own admin account, change one field, then reload the public page in a private window and confirm the change is there",
      "Open the admin URL signed out in a private window and confirm it renders no content at all, not even briefly",
      "From the browser console in a client session, attempt a write the rules should refuse and confirm permission-denied",
      "Check Firestore, Rules in the Firebase Console and confirm the deployed ruleset is the one in the repo, by timestamp",
      "Load a collection that is genuinely empty and confirm the page says it is empty rather than rendering as complete",
    ],
    traps: [
      "Rules edited in the repo but never deployed. The console keeps serving the old ruleset and everything looks fine until it does not",
      "Agreeing the editable fields after the schema exists. Adding one afterwards touches the form, the rules and the existing documents",
      "The Firestore region is permanent. Getting it wrong means creating a new project and importing again",
      "Giving the client an admin account without saying what an admin can delete",
      "An empty collection rendered as a finished page. If the client has not added content yet, say so on the page",
    ],
    handover: [
      "An admin URL and their own account, with a password only they know and that we never asked for",
      "A one-page note listing which fields they can edit and which they cannot",
      "The public site, server-rendered, updating when they publish",
      "A statement that adding a new editable field is a change request, not a setting",
    ],
  },

  deployment: {
    summary:
      "Put a site on the client's own domain with HTTPS, a preview URL per push, and a rollback that is one click — and confirm the auth hosts, which is where this usually breaks.",
    prerequisites: [
      "The exact domain confirmed in writing, including whether the apex or www is the canonical host",
      "Decided whose Vercel account the project lives in — theirs with us added as a member, or ours. This is a decision, not an assumption",
      "Registry third-party costs stated to the client: Vercel free tier is usually sufficient, domain registration around 1,000 rupees a year",
    ],
    fromClient: [
      "Domain registrar access — ask them to add hello@brandmintstudios.in as a user on their own account",
      "Confirmation of the exact domain to use, spelled out",
      "Any existing DNS records that must keep working, especially their email MX records",
    ],
    steps: [
      {
        do: "Write down which host is canonical, apex or www, and get the client to confirm it before touching DNS",
        where: "client",
        detail: "Everything downstream — canonical tags, Open Graph URLs, auth domains — has to point at whichever one serves.",
      },
      {
        do: "In Vercel, Add New, Project, import the repository and set the Root Directory",
        where: "Vercel",
        detail: "For a repo with no build step, leave the framework preset as Other and the build command empty.",
      },
      {
        do: "In Vercel, Settings, Domains, add both the apex and the www host, and set the non-canonical one to Redirect",
        where: "Vercel",
      },
      {
        do: "Add the DNS records Vercel displays at the registrar — an A record for the apex, a CNAME for www — leaving MX records untouched",
        where: "client",
      },
      {
        do: "Wait for Vercel to show Valid Configuration and an issued certificate on both hosts",
        where: "Vercel",
      },
      {
        do: "If the site signs anyone in with Firebase, add the live host under Authentication, Settings, Authorized domains",
        where: "Firebase Console",
        detail: "Skipping this fails sign-in with auth/unauthorized-domain on production only, so it passes every preview test.",
      },
      {
        do: "Push, test the preview URL end to end, then in Vercel, Deployments, use Promote to Production",
        where: "Vercel",
        detail: "A push only creates a preview. Promotion is a deliberate human act and should stay that way.",
      },
      {
        do: "Confirm rollback works by promoting the previous deployment and then promoting the current one back",
        where: "Vercel",
      },
    ],
    verify: [
      "Run curl -sI against the non-canonical host and confirm a 30x with a Location header pointing at the canonical one",
      "Open the canonical https URL in a private window and confirm the padlock and no mixed-content warning in the console",
      "Sign in on the production host and confirm no auth/unauthorized-domain error",
      "Send a test email to an address on the domain and confirm it still arrives — proof the MX records survived",
      "In Vercel, Deployments, confirm the deployment tagged Production is the one you tested",
    ],
    traps: [
      "A push creates a preview, not a release. If nobody promotes it, the client is looking at last week's site",
      "Apex and www disagreeing about which redirects. Pick one, then make canonical tags, Open Graph URLs and auth domains all name the same one",
      "Forgetting Firebase authorized domains. Sign-in fails only on the real domain and looks like a code fault",
      "Editing DNS and deleting the MX records along with the old A record. Their email stops and nobody connects it to the website launch",
      "DNS caches. An old record can serve for hours, so check with dig before assuming a misconfiguration",
      "Never ask a client for their registrar login. Get added as a user on their account so access can be revoked without a password change",
    ],
    handover: [
      "The site live on their domain over HTTPS, with the canonical host stated in writing",
      "A preview URL generated on every push, for reviewing changes before they go live",
      "Rollback in one click from the Vercel Deployments list, demonstrated once",
      "Their registrar and domain remain theirs; our access is a user grant they can remove",
    ],
  },

  migration: {
    summary:
      "Move content, catalogue and customers off an existing platform onto the new one, with a redirect map that preserves search rankings and a parallel run before cutover.",
    prerequisites: [
      "The registry marks this service readiness 'next', not 'ready' — there is no completed reference delivery, so quote and schedule it with that stated",
      "The destination site already built and working with test data",
      "A staging environment where the import can be run and thrown away repeatedly",
      "Agreement that the old platform stays paid-for and alive for at least one billing cycle after cutover",
    ],
    fromClient: [
      "Access to the current platform — ask them to add hello@brandmintstudios.in as a user on their own account",
      "A full export of current data, taken with the old platform's own export tool",
      "Their own list of the top pages and products that must not break, in their words",
      "Access to their Google Search Console property, again as a user grant on their account",
    ],
    steps: [
      {
        do: "Get read access to the old platform by having them add hello@brandmintstudios.in as a user on their own account",
        where: "client",
        detail: "Never take a client's own login for a platform. A user grant is revocable and attributable; their password is neither.",
      },
      {
        do: "Take the full export, then copy it somewhere untouched as the immutable baseline before any transform runs",
        where: "local",
      },
      {
        do: "Crawl the live old site and save the complete list of URLs currently returning 200 — this is the left column of the redirect map",
        where: "local",
        detail: "Do this while the old site is still up. After cutover this list cannot be reconstructed.",
      },
      {
        do: "Write the transform from the export's shape to the new data model, and run it into a staging project first",
        where: "local",
      },
      {
        do: "Import into staging, then reconcile counts — records in the export against documents created — and give every difference a written reason",
        where: "local",
      },
      {
        do: "Build the redirect map so every old 200 URL points at a specific new URL, never at the homepage",
        where: "repo",
        detail: "The redirect map is the deliverable. Lose it and their search rankings go, which is the one damage that cannot be undone.",
      },
      {
        do: "Run both sites in parallel on a staging domain and have the client check their own top pages themselves",
        where: "client",
      },
      {
        do: "Cut over: deploy the redirects and switch DNS in the same session, then promote to production by hand",
        where: "Vercel",
      },
      {
        do: "Submit the new sitemap in their Search Console property and watch coverage for two weeks",
        where: "client",
      },
    ],
    verify: [
      "Replay the saved list of old 200 URLs against the new host and confirm every one returns a 301 to a URL that itself returns 200, with zero unmapped and zero landing on the homepage",
      "Compare record counts — products, customers, posts, orders — export against new database, and confirm they match or that every difference is written down",
      "Have the client open five records they picked themselves and confirm against the old platform, which is still running",
      "Check the new site's own internal links resolve, since a redirect map covers inbound traffic only",
      "Two weeks after cutover, confirm Search Console 404 reports are not climbing",
    ],
    traps: [
      "Redirecting everything to the homepage. Search engines treat that as a soft 404 and the ranking is lost anyway",
      "Cancelling the old platform on cutover day. The moment you need one more export is the moment after you cancelled",
      "Assuming the export is complete. Redirects, reviews, tax settings and email templates often live only in the old admin UI and are not in any export file",
      "Transforming the baseline export in place. Keep one untouched copy so a bad transform is a re-run, not a data loss",
      "Migrating a catalogue without deciding what the historical price on an old order means. Past orders must keep the price they were placed at",
    ],
    handover: [
      "The new site live, with the old one still running until they choose to cancel it",
      "The redirect map as a file, so it can be audited and extended",
      "The untouched original export, handed to them as their own backup",
      "A written count reconciliation: what moved, what did not, and why",
    ],
  },

  "performance-rescue": {
    summary:
      "Measure an existing site, fix images first, then bundles and caching, then measure again the same way — and hand over the before and after numbers as evidence.",
    prerequisites: [
      "The site is already deployed somewhere you can measure repeatedly at a stable URL",
      "Repository access, because this service changes code rather than settings",
      "Agreement on which pages are in scope — a home page fixed alone is not a fast site",
      "Before numbers captured and saved before a single change is made",
    ],
    fromClient: [
      "Repository access — ask them to add hello@brandmintstudios.in as a collaborator on their own repository",
      "The production URL they actually want fast, and the pages that matter most to them",
      "Any third-party scripts they are contractually stuck with, since those cap what is achievable",
    ],
    steps: [
      {
        do: "Have them add hello@brandmintstudios.in as a collaborator under their repository's Settings, Collaborators",
        where: "client",
        detail: "A collaborator grant, never their account login.",
      },
      {
        do: "Before changing anything, run Lighthouse three times against the deployed production URL, take the median, and save the JSON reports",
        where: "local",
        detail: "Without before numbers the work is unprovable, and unprovable work does not get referred on.",
      },
      {
        do: "Check PageSpeed Insights for real-user field data, and record explicitly if the site has too little traffic for any to exist",
        where: "local",
      },
      {
        do: "Fix images first: resize to displayed dimensions, convert with sharp, set explicit width and height, lazy-load everything below the fold",
        where: "repo",
        detail: "Images are almost always the largest single win. Do them before anything clever.",
      },
      {
        do: "Then measure what JavaScript ships, split the largest route-level chunks, and remove dependencies that are not used",
        where: "repo",
      },
      {
        do: "Then set caching headers: long max-age with immutable on fingerprinted assets, short with must-revalidate on HTML",
        where: "repo",
      },
      {
        do: "Re-run Lighthouse identically — same URL, same device setting, median of three — and diff against the saved before run",
        where: "local",
      },
      {
        do: "Write the report: each fix, the number it moved, and what was deliberately not done and why",
        where: "local",
      },
    ],
    verify: [
      "Median-of-three Lighthouse on the deployed URL reaches 90 or above on Performance, Accessibility, Best Practices and SEO, with both report files saved",
      "The Largest Contentful Paint element is named in the report, and it is the element the fixes targeted",
      "Load the site with Chrome DevTools throttled to Slow 4G and confirm the page is readable before scripts finish",
      "Total bytes transferred on a cold first load recorded before and after, both written into the report",
    ],
    traps: [
      "Starting work before capturing the before numbers. There is no way back to them once the code has changed",
      "Measuring localhost, or an unthrottled desktop run, and reporting the score as if it were the client's experience",
      "Treating a single Lighthouse run as evidence. Scores move several points between runs; use the median of three",
      "Reporting the Lighthouse Accessibility score as a WCAG AA pass. It is not one — that is the accessibility audit, and conflating them oversells",
      "A third-party marketing script that the client cannot remove will cap the score. Find that out on day one, not in the final report",
    ],
    handover: [
      "A before and after report with the saved Lighthouse runs attached, not just the headline numbers",
      "The changes in their own repository as reviewable commits, each explained",
      "A short list of what would move it further, and what it would cost in days",
      "A note of what will undo the work — an unoptimised image uploaded later, a new tracking script",
    ],
  },

  "accessibility-audit": {
    summary:
      "Run an automated scan, then do the manual keyboard and screen-reader passes automation cannot do, then compute every interactive contrast ratio and fix what fails.",
    prerequisites: [
      "The exact URLs and interaction states in scope, written down — an open modal is a state and needs listing",
      "Repository access, since this service fixes as well as reports",
      "A screen reader available: NVDA on Windows or VoiceOver on macOS",
      "Both colour schemes identified if the site has a dark mode, because a pair that passes in one can fail in the other",
    ],
    fromClient: [
      "Repository access — ask them to add hello@brandmintstudios.in as a collaborator on their own repository",
      "Confirmation of which pages and flows matter most, so the scope is theirs rather than ours",
      "Any brand colours that are contractually fixed, since those constrain what can be fixed and what must be reported",
    ],
    steps: [
      {
        do: "Have them add hello@brandmintstudios.in as a collaborator on their repository, and agree the audited URL list in writing",
        where: "client",
      },
      {
        do: "Run axe-core across every URL in scope and export the violation list",
        where: "local",
      },
      {
        do: "Run the manual keyboard pass with the mouse untouched: every control reachable by Tab, a visible focus ring, logical order, no keyboard trap, working skip link",
        where: "local",
      },
      {
        do: "Run the screen-reader pass and confirm every image has correct alt text or is marked decorative, every field has a label, and every button announces its purpose",
        where: "local",
      },
      {
        do: "Compute the contrast ratio of every interactive element against its actual background, in every colour scheme, and record each one in a table",
        where: "local",
        detail: "Compute, do not eyeball. Two invisible buttons shipped on brandmintstudios.in by being judged by eye.",
      },
      {
        do: "Fix in the repository, then re-run both the automated scan and the manual passes on the changed pages",
        where: "repo",
      },
      {
        do: "Write the report organised by WCAG success criterion, with severity, what changed, and what was accepted and why",
        where: "local",
      },
    ],
    verify: [
      "axe-core reports zero AA-level violations across every URL in the agreed scope, with the export saved alongside the report",
      "Complete the site's primary task — submit the form, place the enquiry — using only the keyboard, with focus visible at every single step",
      "The contrast table lists every interactive element with a computed ratio, and the lowest is at or above 4.5:1, or 3:1 for large text and non-text UI",
      "Zoom the browser to 200% and confirm nothing is clipped, overlapped or scrolled off in two directions",
    ],
    traps: [
      "Treating an axe pass as the audit. Automation finds roughly a third of real issues; the keyboard and screen-reader passes find the rest",
      "Eyeballing contrast. It has to be calculated, per element, against the background it actually sits on",
      "Colour variables that swap meaning between light and dark schemes. A safe pair in one can be unreadable in the other, so compute both",
      "Removing the focus outline because it looks untidy. That single change makes the site unusable by keyboard",
      "Presenting a WCAG AA pass as permanent. It is a statement about these pages on this date; a new image without alt text breaks it the next week",
    ],
    handover: [
      "A report organised by success criterion, listing what was found, what was fixed and what was accepted",
      "The fixes in their own repository, as reviewable commits",
      "The contrast table, so a future colour change can be checked against it",
      "A short list of what will re-break it — new images, a new brand colour, an embedded third-party widget",
    ],
  },

  "security-audit": {
    summary:
      "Write executable tests against the real Firestore rules in the emulator, prove tenant isolation instead of asserting it, probe the deployed site signed out, and hand over a written report.",
    prerequisites: [
      "Repository access including the rules file, since an audit of a ruleset you cannot read is an opinion",
      "Java installed, because the Firestore emulator is a JVM binary",
      "Test dependencies installed outside the repository if it has no package.json, so no build step is introduced",
      "A written expectation, per collection, of who should read and who should write — that list becomes the test plan",
    ],
    fromClient: [
      "Repository access — ask them to add hello@brandmintstudios.in as a collaborator on their own repository",
      "A description of who their users are and which tenants must never see each other",
      "Nothing else: never accept a client's password, a service-account key or any other credential to 'test properly'. A service-account key bypasses every rule, cannot be scoped and never expires",
    ],
    steps: [
      {
        do: "Have them add hello@brandmintstudios.in as a collaborator on their repository",
        where: "client",
      },
      {
        do: "Read the entire ruleset and write down, collection by collection, who should be able to read and who should be able to write",
        where: "local",
        detail: "That table is the test plan. Anything not on it is untested, and untested means unproven.",
      },
      {
        do: "Install the test dependencies outside the repository, for example cd /tmp && npm i @firebase/rules-unit-testing firebase firebase-tools",
        where: "local",
        detail: "A repo served statically with no build step must not gain a package.json just to be audited.",
      },
      {
        do: "Write rules unit tests against the real rules file in the Firestore emulator, including an anonymous case for every single collection",
        where: "local",
      },
      {
        do: "Test the URL-editing attack explicitly: sign in as tenant A and request a document belonging to tenant B by id, and assert it is denied",
        where: "local",
        detail: "This is the question production cannot answer safely, and the one clients actually care about.",
      },
      {
        do: "Test that a permitted write cannot smuggle in a field it should not touch, using the diff().affectedKeys().hasOnly() pattern",
        where: "local",
      },
      {
        do: "Run the suite with npx firebase emulators:exec --only firestore --project demo-bm \"node --test tests/rules.test.mjs\"",
        where: "local",
      },
      {
        do: "Probe the deployed site signed out for any route that renders data before authentication resolves",
        where: "local",
      },
      {
        do: "Diff the audited rules file against what is actually deployed, then write the report: tested, found, fixed, and left with reasons",
        where: "Firebase Console",
      },
    ],
    verify: [
      "The suite runs green from a clean checkout with one command, and the number of tests is stated in the report",
      "Deliberately loosen one rule to make a private read public, re-run, and confirm a test goes red — a suite that cannot fail proves nothing",
      "The Rules tab in the Firebase Console shows a ruleset identical to the audited file, with a timestamp you can point at",
      "Load every protected route signed out in a private window and confirm no data appears, not even for a frame before redirect",
    ],
    traps: [
      "An audit without executable tests is an opinion. The Brand Mint portal's own 21 rules tests are what make this service demonstrable rather than describable",
      "Auditing a local rules file that is not the deployed one. Diff them first or the whole report is about a ruleset nobody is running",
      "Rules statements combine with OR, so a permissive earlier match wins over a later deny. The catch-all denying everything must be last and must not be relied on to override anything",
      "Missing Java. The emulator fails in a way that reads like a Node problem and costs an hour",
      "Trusting a UI check. If the rules allow it, a client can do it with the browser console open, and every UI guard is decoration",
    ],
    handover: [
      "A written report: what was tested, what was found, what was fixed, what was accepted",
      "The test suite committed in their repository so it runs on every future change",
      "A stated re-test trigger: any change to the rules file, any new collection",
      "Confirmation that we never requested, held or stored a credential of theirs — access was a revocable collaborator grant throughout",
    ],
  },

  "catalog-basic": {
    summary:
      "Add a browsable product catalogue — server-rendered list and detail pages, categories and search — on top of a dynamic site that already has an admin shell.",
    prerequisites: [
      "The dynamic-site service already delivered, since this depends on its auth and admin shell",
      "The SKU count known, because it decides the search approach: a client-side index below roughly 500 SKUs, Typesense above that",
      "A decision on whether a product may belong to more than one category, which changes the query shape",
      "The product model taken from FreshKart src/lib/types.ts rather than invented fresh",
    ],
    fromClient: [
      "The product list with name, category, price and unit for every item",
      "Product photographs, and a decision about what a product with no photograph should show",
      "The category structure they actually use when talking to customers",
      "Who will keep it up to date after launch",
    ],
    steps: [
      {
        do: "Count the SKUs and pick the search approach before writing any of it",
        where: "local",
        detail:
          "Below roughly 500 the index ships to the browser. Above that it needs Typesense, which is a separate service with its own cost and must be quoted, not absorbed.",
      },
      {
        do: "Take the product model from FreshKart src/lib/types.ts and adapt it, rather than designing a new one",
        where: "repo",
      },
      {
        do: "Agree the category structure with the client, including whether a product can sit in more than one category",
        where: "client",
      },
      {
        do: "Create the products collection and write rules: public read on published products, writes admin only, then deploy the rules",
        where: "Firebase Console",
      },
      {
        do: "Build the list and detail pages as server components, each product on its own shareable URL",
        where: "repo",
      },
      {
        do: "Build the search index over name and category at the tier chosen in step one",
        where: "repo",
      },
      {
        do: "Add product photos with explicit dimensions and one agreed aspect ratio, and implement the agreed no-photo placeholder",
        where: "repo",
      },
      {
        do: "Add product create and edit to the admin shell so the client maintains the catalogue without us",
        where: "repo",
      },
      {
        do: "Make an empty category and an empty catalogue say so in words, rather than rendering as a finished page with nothing on it",
        where: "repo",
      },
    ],
    verify: [
      "Open the catalogue in a private window, count the products shown, and confirm the count and the prices match the client's own spreadsheet",
      "Search for a word from the middle of a product name and confirm the product is found",
      "Open a product detail URL directly in a private window and confirm it loads without signing in",
      "As the client, create a product in the admin and confirm it appears publicly within one reload",
      "Open a category with no products and confirm the page states it is empty rather than looking broken or finished",
    ],
    traps: [
      "Not capturing the unit price onto the order line at order time. A later price change must never rewrite what a past order cost",
      "An empty catalogue rendering as a complete page. If nothing has been imported yet, the page has to say the catalogue is empty",
      "Shipping a client-side search index for a catalogue well over 500 SKUs. The page weight becomes the performance problem you get hired to fix later",
      "Photographs supplied at wildly different aspect ratios. Agree one crop before importing, or the grid never looks right",
      "Categories designed from the client's stock system rather than how customers actually ask for things",
    ],
    handover: [
      "A browsable catalogue with categories, working search and a shareable URL per product",
      "The ability to add and edit products themselves in the admin",
      "The SKU count at which search will need re-engineering, stated up front so it is not a surprise",
      "A note that bulk price changes by spreadsheet are the bulk catalog service, not this one",
    ],
  },

  "catalog-bulk": {
    summary:
      "Add spreadsheet import, bulk editing and price history to an existing catalogue, with a mandatory dry-run diff so nothing writes until a human has seen what will change.",
    prerequisites: [
      "The catalog-basic service already delivered, since this operates on its product model",
      "The exact column names agreed, and a stable key column chosen — a SKU code, never the product name",
      "Agreement on who maintains prices and how often they change, which decides whether import or bulk edit is the primary tool",
      "A decision on what an unmatched row means: reported, or created — never silently either",
    ],
    fromClient: [
      "The catalogue as a spreadsheet, one row per SKU, exported from wherever they keep it now",
      "Who maintains prices, and how often they change",
      "A ruling on whether a row missing from an import means the product is discontinued or simply absent from that file",
    ],
    steps: [
      {
        do: "Confirm catalog-basic is live and read its product model before designing the import",
        where: "repo",
      },
      {
        do: "Agree the exact column headers and the stable key column with the client, and write both into the handover document",
        where: "client",
        detail: "Matching on product name breaks the first time someone fixes a typo in a name.",
      },
      {
        do: "Parse the file in the browser with papaparse; nothing is uploaded anywhere",
        where: "repo",
      },
      {
        do: "Build the dry run: rows to create, rows to change with old value beside new, and rows whose key matched nothing — shown before a single write",
        where: "repo",
        detail: "The preview is the feature. Without it one wrong column silently reprices the entire catalogue.",
      },
      {
        do: "Commit with Firestore batched writes, chunked at 500 operations per batch",
        where: "repo",
        detail: "A batch caps at 500 writes. An unchunked 2,000-row import fails partway and leaves the catalogue half-updated.",
      },
      {
        do: "Write a price-history document for every price change: SKU, old price, new price, when, and which admin did it",
        where: "repo",
      },
      {
        do: "Parse strictly — reject a price written as text with a currency symbol or thousands separator rather than coercing it",
        where: "repo",
      },
      {
        do: "Add bulk edit in the admin for the changes too small to justify a spreadsheet round trip",
        where: "repo",
      },
    ],
    verify: [
      "Import a file with one deliberately wrong header, and confirm the dry run reports it and that zero documents were written",
      "Import a real file, note the counts the preview predicted, commit, and confirm the document count moved by exactly that number",
      "Change one price by import and confirm a price-history document exists holding both the old and the new value",
      "Re-import the identical file and confirm the dry run reports zero changes — the import must be idempotent",
      "Import a file with an unknown SKU and confirm it is listed as unmatched rather than quietly created",
    ],
    traps: [
      "Committing without a preview. One misaligned column reprices the whole catalogue and there is no undo",
      "Firestore's 500-operation batch limit. A large import must be chunked or it dies partway through and leaves inconsistent data",
      "Spreadsheets mangling data: leading zeros stripped from SKU codes, prices stored as text with a rupee symbol, dates reformatted. Reject rather than guess",
      "Matching rows on product name. Names get edited and the import then creates duplicates instead of updating",
      "Deleting products absent from the import file. Never delete on import unless the client has explicitly asked for that behaviour in writing",
    ],
    handover: [
      "The ability to update the whole catalogue from a spreadsheet, always seeing a diff first",
      "Price history per SKU, so a disputed price has an answer",
      "The documented column format, including the key column and what an unmatched row does",
      "The safe row count per import, stated as a number",
    ],
  },

  inventory: {
    summary:
      "Track stock per SKU, decrement it inside the same transaction that writes the order, and surface what is running low — without inventing an alerting channel that needs a server.",
    prerequisites: [
      "The catalog-basic service already delivered, since stock hangs off its product model",
      "Opening stock recorded per SKU, or an explicit decision that stock starts unrecorded and says so",
      "A decision on what out of stock does: hide the product, or show it with the buy action disabled. The client makes this call, not us",
      "Agreement on whether the low-stock threshold is one number for everything or set per SKU, before the form is built",
    ],
    fromClient: [
      "Opening stock per SKU",
      "The low-stock threshold they want alerting on",
      "What should happen when something sells out, in their own words",
      "Who checks the low-stock screen, and how often, since nothing here sends a message on its own",
    ],
    steps: [
      {
        do: "Confirm catalog-basic is live, then add a stock field per SKU to its product model",
        where: "repo",
      },
      {
        do: "Get the out-of-stock behaviour decided by the client and write it into the handover before implementing it",
        where: "client",
      },
      {
        do: "Decrement stock inside the same Firestore transaction that writes the order — never read the count and then write it",
        where: "repo",
        detail: "Read-then-write loses the last unit under concurrency: two customers both buy it and stock goes to minus one.",
      },
      {
        do: "Make the transaction refuse when stock would go negative, and surface that to the customer as an out-of-stock message rather than an error page",
        where: "repo",
      },
      {
        do: "Keep every side effect out of the transaction body, because Firestore retries transactions and anything inside can run more than once",
        where: "repo",
      },
      {
        do: "Build the low-stock view in the admin: SKUs at or below threshold, lowest first",
        where: "repo",
      },
      {
        do: "Make the low-stock view distinguish nothing is low from no stock has ever been recorded, and never render the second as a healthy green state",
        where: "repo",
      },
      {
        do: "Add a manual stock adjustment in the admin with a required reason field, for restocks, physical counts and breakages",
        where: "repo",
      },
      {
        do: "State plainly what is not in scope: an alert that leaves the screen needs a server, and that is the notifications service, not this one",
        where: "client",
      },
    ],
    verify: [
      "Fire two orders for the last unit of one SKU at the same moment, from two browser windows or a small script, and confirm exactly one succeeds and stock lands at 0 and never at minus one",
      "Set one SKU below its threshold and confirm it appears at the top of the low-stock view",
      "Take a SKU to zero and confirm the storefront shows the agreed out-of-stock behaviour in a private window",
      "With no SKU below threshold, confirm the view says nothing is low; with no stock recorded at all, confirm it says that instead",
      "Make a manual adjustment and confirm the reason is stored with it",
    ],
    traps: [
      "Reading the stock count and then writing it back. Under concurrency the last unit is sold twice; it has to be one transaction",
      "Side effects inside a transaction body. Firestore retries, so an email or a counter increment inside the transaction can fire more than once",
      "An empty low-stock list rendered as a reassuring green all-clear when the real situation is that opening stock was never entered",
      "Orders cancelled or failed that never return their stock. Decide the release path at build time, not after the first refund",
      "Promising alerts. Nothing here notifies anyone; someone has to open the screen. Say so before launch, not after they miss a stockout",
    ],
    handover: [
      "A stock count per SKU, visible and adjustable in the admin with a reason recorded",
      "A storefront that reflects out of stock in the way the client chose",
      "A low-stock view that tells the truth about an empty list",
      "A written statement that alerts leaving the screen require a server and are a separate piece of work",
    ],
  },
};

export default RUNBOOKS;
