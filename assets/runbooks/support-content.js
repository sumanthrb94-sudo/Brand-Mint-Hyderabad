// Delivery runbooks — Support, and Content & media.
//
// One entry per service id in assets/bm-catalog.js. These describe how the
// work is actually done: what must be true first, what the client has to
// grant, the steps in order, what proves it worked, what goes wrong, and what
// the client is left holding.
//
// Rules that bind every entry in this file:
//   - No client ever sends a password, API key, token or secret. Access is
//     delegated by adding hello@brandmintstudios.in as a user on an account
//     the client already owns.
//   - A service with monthlyDays says, in plain words, what the monthly fee
//     buys. A vague retainer is an unpriced one.
//   - An AI feature ships with an eval suite or it does not ship.
//   - Video scope is a count. Never a duration, never "social media".

export const RUNBOOKS = {
  "chat-support": {
    summary:
      "Ship a chat widget that writes into a Firestore conversation collection, an admin inbox that reads it live, and office-hours rules — then keep answering it for one day a month.",
    prerequisites: [
      "The site is deployed and serverless functions are available — chat-support needs a server side.",
      "A named person has agreed to answer chat, and the hours are written down before the widget goes live.",
      "The client's top questions and the answers they want given exist in writing. That same list becomes the test set.",
      "An escalation path exists for anything the answerer cannot resolve.",
    ],
    fromClient: [
      "Who answers chat, and during which hours, in writing.",
      "If they want a hosted provider such as Crisp, ask them to add hello@brandmintstudios.in as a user on their own account. Never a login, never a key.",
      "Their top questions, with the exact answer they want a customer to receive.",
      "What must always reach a human immediately, and how that person is reached out of hours.",
    ],
    steps: [
      {
        do: "Agree the office-hours table and the exact out-of-hours message, and put both in the project brief",
        where: "client",
        detail:
          "Hours are a product decision, not a config value. Settle them before any code exists to argue with.",
      },
      {
        do: "Model conversations/{conversationId} with a messages subcollection, and write rules so a visitor can read and append only to their own conversation",
        where: "repo",
        detail:
          "The rules are the boundary. Anything the widget enforces is a convenience.",
      },
      {
        do: "Build the widget: it creates the conversation, appends messages, and renders the out-of-hours notice from one availability config",
        where: "repo",
      },
      {
        do: "Build the admin inbox with a live onSnapshot listener over open conversations, sorted oldest-unanswered first",
        where: "repo",
        detail:
          "Oldest-unanswered first is the whole point of the sort. Newest-first hides the customer who has been waiting.",
      },
      {
        do: "Write the test set: at least ten real questions with the expected answer or the expected escalation, checked into the repo as a plain text file beside the widget",
        where: "repo",
        detail:
          "This is the baseline the auto-replies service is later evaluated against. Without it, automation has nothing to be measured on.",
      },
      {
        do: "Run the rules against the Firebase emulator and assert that reading another visitor's conversation is denied",
        where: "local",
      },
      {
        do: "Publish the rules and confirm the deployed version matches the file in the repo",
        where: "Firebase Console",
      },
      {
        do: "Deploy to a preview, walk the whole test set through the live widget, then promote by hand",
        where: "Vercel",
      },
    ],
    verify: [
      "Open the widget in a private window, send a message, and watch it appear in the admin inbox without a refresh.",
      "Narrow the office hours temporarily so 'now' is outside them, reload, and see the out-of-hours notice and the stated reply time.",
      "In the emulator, a read of another visitor's conversation is denied.",
      "Every row of the test set gets its expected answer or its expected escalation; record pass or fail per row, with the date.",
    ],
    traps: [
      "No office hours in the product means you have silently promised 24/7. Set them, show them in the widget, and state the expected reply time.",
      "An inbox nobody watches is worse than no chat at all. If nobody will commit to the hours, ship a contact form and say why.",
      "A hosted provider is fine when the client asks for one, but the account must be theirs with hello@brandmintstudios.in added as a user — otherwise ending the retainer takes their conversation history with it.",
      "n8n and Dify are fair-code: fine for routing your own alerts, not resellable as part of what the client is buying. The client's chat path must be code you can hand over.",
    ],
    handover: [
      "A chat widget on the site showing the agreed hours, and an admin inbox listing conversations oldest-unanswered first.",
      "The written office-hours and escalation policy, and the test set of questions with expected answers, both in the repo.",
      "The monthly fee buys one day a month: watching the inbox against the agreed hours, adding a canned answer for every new recurring question, and a one-page monthly count of conversations, first-response times and escalations.",
    ],
  },

  "auto-replies": {
    summary:
      "Match the client's top questions against their own approved answers first, fall through to an LLM only when nothing matches, escalate anything sensitive, and log every reply that goes out.",
    prerequisites: [
      "chat-support is live — auto-replies depends on it and has no inbox of its own.",
      "An eval file of questions and expected outcomes exists before the first line of matching code.",
      "The never-automate list is written down and signed off by the client.",
      "The reply-audit collection exists before automation is switched on, not after.",
    ],
    fromClient: [
      "Their top questions and the exact wording of the answer they want sent.",
      "What must always reach a human — anything about price, refunds, delivery promises or complaints, unless they say otherwise in writing.",
      "Confirmation they accept that an automated reply goes out in their name.",
      "If the LLM account is theirs, ask them to add hello@brandmintstudios.in as a user on it. Never ask for the key itself.",
    ],
    steps: [
      {
        do: "Write the eval file first: twenty to thirty real questions, each with its expected outcome — this exact answer, or escalate to a human",
        where: "repo",
        detail:
          "If the client will not sit down and write expected answers, that is the signal to sell intent matching only and no LLM.",
      },
      {
        do: "Build the intent-match layer over the client's approved templates, with a confidence threshold and an explicit no-match result",
        where: "repo",
        detail:
          "Matching first is cheaper, faster and predictable. The LLM is the exception path, not the product.",
      },
      {
        do: "Build escalation: anything on the never-automate list, anything below threshold, and any second unresolved turn goes to the human queue and marks the conversation",
        where: "repo",
      },
      {
        do: "Add the reply-audit write — an append-only document per automated reply holding the question, matched intent, reply text, model and version if an LLM answered, timestamp and conversation id",
        where: "repo",
        detail:
          "Without this you cannot answer 'what did it tell my customer', which is the only question that matters when it goes wrong.",
      },
      {
        do: "Only now add the LLM fallback, called from a serverless function with the API key in a Vercel environment variable",
        where: "Vercel",
        detail:
          "The key never reaches the browser. Cap retries so an error loop cannot bill overnight.",
      },
      {
        do: "Add a kill switch — one config flag that routes everything to a human — and test that it takes effect on one reload",
        where: "repo",
      },
      {
        do: "Run the full eval suite against the deployed preview and record the pass rate with the date",
        where: "Vercel",
      },
      {
        do: "Promote by hand, then re-run the eval suite against production before telling the client it is live",
        where: "Vercel",
      },
    ],
    verify: [
      "Every eval row has a recorded pass or fail, and the file records who ran it and when.",
      "Ask a never-automate question in the live widget: no automated reply is sent, and the conversation lands in the human queue.",
      "Every reply that went out appears in the audit collection with its matched intent and the text sent.",
      "Flipping the kill switch stops automated replies within one page reload.",
    ],
    traps: [
      "An AI feature with no eval suite is a liability you have agreed to maintain forever. No evals, no LLM fallback — ship intent matching over approved templates instead.",
      "Never let the model answer prices, delivery dates or refund decisions. Those are the wrong answers that cost money; route them to a human.",
      "LLM usage is metered, so a retry loop is a spend loop. Cap retries and set a spend alert on the provider account.",
      "A client must never be asked to hand over an API key. If the LLM account is theirs, they add hello@brandmintstudios.in as a user, and the key is created inside their own dashboard and goes straight into a Vercel environment variable.",
      "Dify is tempting for the prompt and flow layer, but its licence does not permit reselling it as the service. Same for n8n. Keep both for internal ops; the client's reply layer is your code.",
    ],
    handover: [
      "The approved reply templates and the never-automate list, in the client's own words, in the repo.",
      "The eval file with expected answers, plus the most recent pass or fail run.",
      "A log of every automated reply the customer received, readable without a developer.",
      "The monthly fee buys half a day a month: re-running the eval suite, reading the escalations for questions the matcher missed, and adding a template for each of them.",
    ],
  },

  notifications: {
    summary:
      "Templates in code, a dispatch queue in Firestore, and a serverless worker that sends over Resend for email and MSG91 for Indian SMS and records what actually got delivered.",
    prerequisites: [
      "Serverless functions are available — this needs a server side.",
      "The events that trigger a message are agreed and finite. Three states worth telling a customer about, not eleven.",
      "If SMS is in scope, DLT registration has been started in week one. It is paperwork, not a code task, and it gates the launch.",
      "A sending domain exists and the client can add DNS records to it.",
    ],
    fromClient: [
      "The exact wording they approve for every message. For SMS it must match the DLT-registered template character for character.",
      "Sending domain access — ask them to add hello@brandmintstudios.in as a user on their DNS provider or email platform, so the SPF, DKIM and return-path records can be added directly. A registrar login is never requested and never accepted.",
      "Their DLT Entity ID and approved Template IDs, which they obtain themselves on the operator portal as the principal entity. These are identifiers, not credentials.",
      "The reply-to address, and the name of the person who reads it.",
    ],
    steps: [
      {
        do: "List the events that send a message and get the client to strike out the ones they would not want as a customer",
        where: "client",
        detail:
          "Email is roughly ₹0.10 a message and SMS roughly ₹0.20; a message per state change multiplies quietly.",
      },
      {
        do: "Add the SPF, DKIM and DMARC records for the sending domain and wait for the provider to report the domain verified",
        where: "client",
      },
      {
        do: "Have the client register as principal entity on the DLT portal, register the sender header, and submit each SMS template; record the returned Entity ID and Template IDs in config",
        where: "client",
        detail:
          "Approval takes days and rejections are routine. Submit before the code needs them.",
      },
      {
        do: "Write the templates in code, one module, with named parameters — no message text assembled at the call site",
        where: "repo",
      },
      {
        do: "Build the dispatch queue collection with to, channel, templateId, params, status of queued, sent or failed, attempts, provider message id and error",
        where: "repo",
      },
      {
        do: "Build the serverless worker: claim a queued document inside a transaction, send, write back the provider message id and status, retry with backoff to a fixed cap, then mark failed",
        where: "Vercel",
        detail:
          "Claiming in a transaction is what stops a re-run sending everything twice.",
      },
      {
        do: "Put the provider keys in Vercel environment variables only — never in the repo, never in the browser bundle, never logged",
        where: "Vercel",
      },
      {
        do: "Build the delivery log view so the client can see what was sent, to whom, and whether it arrived",
        where: "repo",
      },
      {
        do: "Fire a test order on the preview to your own address and phone before anything is promoted",
        where: "local",
      },
    ],
    verify: [
      "A test order on the preview produces exactly one queued document, one sent document, and one email in the inbox — with SPF and DKIM shown as pass in the message's original headers.",
      "The test SMS arrives with the registered header and matches the approved DLT template word for word.",
      "Stopping the worker mid-run and re-running it sends no duplicate.",
      "The delivery log shows a provider message id and a final status for every attempt, including failures.",
    ],
    traps: [
      "Indian SMS needs DLT registration and pre-approved templates. Any variable text outside the approved template gets the message dropped by the operator, usually with no useful error.",
      "Sending from a brand-new domain without SPF, DKIM and DMARC lands in spam, and the client concludes the feature is broken rather than the domain is cold.",
      "A client must never be asked to hand over an API key by message. Create it yourself inside their account once they have added hello@brandmintstudios.in as a user, and put it into a Vercel environment variable and nowhere else.",
      "Never log the raw request or response body of a send. It contains the customer's phone number and the provider's key in the headers.",
      "n8n makes this look like a twenty-minute job, and it is — for your own ops. It is fair-code and cannot be resold as the client's notification service. The client's dispatcher must be code you own.",
    ],
    handover: [
      "Order, shipping and payment messages going out on the agreed events, in wording the client approved.",
      "A delivery log they can read themselves, showing what was sent and whether it arrived.",
      "The DLT Entity ID and Template IDs recorded in the project, so the next template is an addition rather than an investigation.",
      "No monthly fee attaches to this build. If they want new templates and wording changes on demand, that is a retainer and is priced separately.",
    ],
  },

  "whatsapp-notifications": {
    summary:
      "Register message templates with Meta, send them through one BSP, take delivery receipts back on a webhook, and honour opt-outs before anything queues.",
    prerequisites: [
      "This is marked 'next' in the registry — nothing is built yet, so quote the three build days as new work rather than assembly.",
      "One BSP chosen. Not two.",
      "A serverless endpoint exists that can receive and verify Meta's webhook callbacks.",
      "The client's business can be verified by Meta, and someone on their side will do the document upload.",
    ],
    fromClient: [
      "Ask them to add hello@brandmintstudios.in as a user in their own Meta Business Suite, under Business settings, People. Never a Facebook password, never a two-factor code, never a token pasted into a message.",
      "A phone number that is not currently active on the consumer WhatsApp app, and their agreement to verify it as the sender.",
      "Business verification documents, uploaded by them inside Meta Business Suite. We never handle their documents.",
      "The opt-in wording and the exact point in their flow where the customer gives it.",
      "The approved wording for each notification.",
    ],
    steps: [
      {
        do: "Ask the client to add hello@brandmintstudios.in as a user in Meta Business Suite under Business settings, People, with access to the WhatsApp Account asset",
        where: "Meta Business",
        detail:
          "Delegation is the only route in. If anyone offers a login instead, refuse it in writing and re-send this instruction.",
      },
      {
        do: "Have the client complete Meta business verification on their own Business Portfolio",
        where: "Meta Business",
        detail:
          "Unverified accounts are held at a low messaging limit, which looks like a bug in the code the first time a busy day hits it.",
      },
      {
        do: "Register the sender number in WhatsApp Manager and confirm it is not in use on the consumer WhatsApp app",
        where: "Meta Business",
      },
      {
        do: "Draft and submit each message template in the Utility category with numbered placeholders, in week one",
        where: "Meta Business",
        detail:
          "Marketing-category templates cost more and demand opt-in. Order and shipping updates belong in Utility.",
      },
      {
        do: "Capture opt-in where the phone number is collected, storing the consent timestamp and its source on the customer record",
        where: "repo",
      },
      {
        do: "Send through the chosen BSP from a serverless function, keyed on the order id so a retry cannot double-send",
        where: "repo",
      },
      {
        do: "Add the status webhook for sent, delivered, read and failed, verify its signature, and store each status on the message document",
        where: "Vercel",
        detail: "Verify the signature and never log the raw body.",
      },
      {
        do: "Mark a customer opted out when they reply with the opt-out keyword, and make the dispatcher skip them before anything is queued",
        where: "repo",
      },
      {
        do: "Put the BSP token in a Vercel environment variable and run a full test to your own number from the preview",
        where: "Vercel",
      },
    ],
    verify: [
      "Every template shows Approved in WhatsApp Manager before sending is enabled anywhere.",
      "A test order delivers a WhatsApp message to your own number, and the message document reaches delivered on the webhook.",
      "Replying with the opt-out keyword marks the customer opted out, and the next order for that number queues nothing — visible in the log.",
      "Searching the send path finds no free-text message body; every send references a template id.",
    ],
    traps: [
      "Free-form messages are only permitted inside the 24-hour customer service window after the customer's own last message. Outside it only an approved template will send, and code that assumes otherwise fails at 3am.",
      "Template approval takes days and rejections are common. Submit in week one, and if the build is waiting on approval, raise it on the portal as a blocker owned by the client so the delay is dated and visible.",
      "Never accept a Meta login, an app secret or a system-user token from the client. Adding hello@brandmintstudios.in as a user in their Business Suite is the only acceptable route.",
      "Pick one BSP. A second doubles the integration surface and halves the reliability.",
      "Meta's billing for this has changed shape more than once. Quote it as a metered pass-through cost and check Meta's current pricing page at quote time — never put a fixed rupee figure per message in a proposal.",
    ],
    handover: [
      "Order and shipping updates arriving on WhatsApp from a verified sender, only ever as approved templates.",
      "Delivery receipts visible per message, so 'did they get it' is answerable without asking the customer.",
      "Opt-out working and respected, with the consent timestamp and source stored against each customer.",
      "The approved template list and their ids recorded in the project, so the next notification is a submission rather than a rediscovery.",
      "No monthly fee attaches to this build. Meta's template policies keep moving, so a new or re-submitted template later is chargeable work rather than a favour — say so at handover, not when the first one is rejected.",
    ],
  },

  "image-system": {
    summary:
      "One pipeline: originals in at their highest available resolution, responsive AVIF and WebP sizes out, one crop ratio, a blur placeholder, and no page hand-writing an image tag.",
    prerequisites: [
      "Originals have been collected at the highest resolution the client actually has, before the work is quoted.",
      "The crop ratio and background treatment are decided, not left to per-image judgement.",
      "A build step exists that can run sharp, or the framework's image component is available.",
    ],
    fromClient: [
      "Source images at their highest available resolution, from the camera or the designer — via a Drive or Dropbox link, not WhatsApp.",
      "Crop ratio and background preference, decided once for the whole catalogue.",
      "Who supplies future images, in what format, and where they will put them.",
      "Confirmation they hold the rights to every image supplied.",
    ],
    steps: [
      {
        do: "Collect every original into one source folder and record the smallest pixel width in the set",
        where: "client",
        detail:
          "If they can only send by WhatsApp, ask for a shared-drive link instead. WhatsApp recompresses and downsizes on the way through.",
      },
      {
        do: "Fix the crop ratio and background with the client by showing three real products cropped both ways",
        where: "client",
      },
      {
        do: "Build the pipeline — a sharp script or the framework image loader — generating a fixed ladder of widths in AVIF and WebP with a raster fallback",
        where: "repo",
      },
      {
        do: "Emit srcset and sizes from one shared component so no page writes its own image markup",
        where: "repo",
      },
      {
        do: "Generate a tiny blurred placeholder per image and store its data URI beside the image record",
        where: "repo",
      },
      {
        do: "Set explicit width and height, or an aspect-ratio, on that component so nothing reflows as images land",
        where: "repo",
      },
      {
        do: "Add a build-time check that fails if a source image is below the agreed minimum width",
        where: "repo",
        detail:
          "This is what stops a low-resolution image arriving quietly six months later.",
      },
      {
        do: "Run Lighthouse on the heaviest page before and after, and keep both reports",
        where: "local",
      },
    ],
    verify: [
      "DevTools Network on a product page shows AVIF or WebP being served, and total image bytes are under the agreed budget.",
      "Lighthouse cumulative layout shift on the heaviest page is under 0.1.",
      "Resizing the browser from phone width to desktop fetches a different srcset entry, visible in the Network panel.",
      "Dropping in a deliberately small test image fails the build.",
    ],
    traps: [
      "You cannot un-compress what came over WhatsApp. Get the originals at full resolution before quoting, or the re-shoot is your delay and their cost.",
      "Do not upscale to satisfy the minimum-width check. It looks worse and hides the real problem, which is that the source is missing.",
      "Transparent PNG logos converted through this pipeline pick up halos on coloured backgrounds. Keep logos as SVG and out of the raster pipeline.",
      "This carries no monthly days — it is a build, not a retainer. If the client expects every future photo processed forever, that is a content retainer and must be priced as one before it starts happening for free.",
    ],
    handover: [
      "Every image on the site served in a modern format at the right size for the device, with no visible reflow as pages load.",
      "One documented place to add a new image, and the format and minimum resolution required.",
      "The before and after Lighthouse reports, so the work is provable rather than merely claimed.",
    ],
  },

  "video-system": {
    summary:
      "Compose video programmatically, render it on a queue rather than inside a request, host and embed it — plus one day a month keeping renders current and the provider account alive.",
    prerequisites: [
      "The render path is decided — Remotion or ffmpeg — and its licence position checked before any code is written.",
      "Serverless render capacity exists; a render will never fit inside an HTTP request timeout.",
      "Written confirmation that the client holds rights to every piece of source material.",
      "The count of videos and where each one appears is agreed in writing.",
    ],
    fromClient: [
      "Higgsfield or equivalent account — ask them to add hello@brandmintstudios.in as a user on their own account. Never a login.",
      "Brand assets as vectors, and fonts with a licence that covers use in video.",
      "Script or shot direction, or a brief for us to write it.",
      "Written confirmation they hold the rights to all source material, including music and anyone appearing on camera.",
    ],
    steps: [
      {
        do: "Agree the count and the placements in writing before opening an editor — three product videos on the product page, one hero loop, that shape",
        where: "client",
      },
      {
        do: "Check the Remotion licence position against actual headcount before committing to it",
        where: "local",
        detail:
          "Free for an individual or a company of up to three people; above that it needs a paid company licence. If the client's own team will run renders, it is their headcount that decides.",
      },
      {
        do: "Build the composition props-driven, so a second product is data rather than a fresh edit",
        where: "repo",
      },
      {
        do: "Render on a queue from a serverless function — one job document per video with a status, never inline in a request",
        where: "Vercel",
      },
      {
        do: "Store outputs in the asset store with a poster frame and a duration, versioned so v2 never overwrites v1",
        where: "repo",
      },
      {
        do: "Embed with a lazy, muted, poster-first player that does not autoplay with sound",
        where: "repo",
      },
      {
        do: "Record each render's third-party cost against its job so per-render spend is visible in one place",
        where: "repo",
      },
      {
        do: "Deploy to a preview and watch every video on a phone over mobile data before promoting",
        where: "Vercel",
      },
    ],
    verify: [
      "A queued render job moves through queued, rendering and done, ending with a playable output URL.",
      "The video plays on a phone over mobile data, poster visible before load, with no sound until the viewer asks for it.",
      "The v1 URL still resolves after v2 has been rendered.",
      "The month's per-render spend is visible in one place and reconciles with the provider's invoice.",
    ],
    traps: [
      "Remotion is free at solo scale but needs a paid company licence above three people. Plan for it before it arrives as a surprise invoice — and count the heads of whoever will actually be running the renders.",
      "Scope in a count of finished videos, never a duration and never 'brand video content'. Two revision rounds are included, as with everything else; a third is a chargeable extra review round.",
      "Never render inside an HTTP request. It will time out and the timeout will look like a code bug.",
      "Generated video still needs a rights answer for its inputs. Get the written confirmation before the first render, not before delivery.",
      "Rendering is metered per render, so an exploratory loop is a spend loop. Cap the number of exploratory renders per revision round and say what that cap is.",
    ],
    handover: [
      "Videos hosted and embedded on the site, each with a poster frame and a version that does not disappear when the next one is made.",
      "The composition source in the repo, so a price or product change is a props edit rather than a re-shoot.",
      "The monthly fee buys one day a month: re-rendering when products, prices or offers change, keeping the render queue and provider account working, and a monthly note of render spend.",
    ],
  },

  "brand-system": {
    summary:
      "Three directions, narrowed to one, built out into mark, type and colour as exported design tokens, with the brand book shipped as a working site rather than a PDF.",
    prerequisites: [
      "One named person signs off the direction, agreed before anything is presented.",
      "A competitor and reference set exists, with reasons attached.",
      "Contrast will be computed, not eyeballed — the tooling to do that is ready before colours are chosen.",
      "Twenty build days is the largest item in the catalogue; it is staged, with direction sign-off as the milestone that de-risks the rest.",
    ],
    fromClient: [
      "The competitor or reference set they admire, and what specifically they admire about it.",
      "Who signs off the direction, by name. One person.",
      "Where the brand will actually appear — site, packaging, signage, video — because that decides what has to be built.",
      "Any existing assets and, critically, which font licences they already hold.",
    ],
    steps: [
      {
        do: "Get the sign-off name in writing before the first presentation is scheduled",
        where: "client",
        detail:
          "Design by committee doubles every round. Two review rounds are included; a third is a chargeable extra review round.",
      },
      {
        do: "Run the reference audit against the competitor set and write one page on where the category is crowded",
        where: "local",
      },
      {
        do: "Present three directions in one sitting, not three sittings",
        where: "client",
      },
      {
        do: "Narrow to one and build the mark, wordmark, monogram and favicon, testing the mark at 16 pixels and in a single colour",
        where: "local",
      },
      {
        do: "Export the type and colour system as design tokens in one file — CSS custom properties or JSON — consumed directly by the site",
        where: "repo",
      },
      {
        do: "Compute the contrast ratio for every foreground and background pair the tokens permit, and record each number",
        where: "local",
        detail:
          "Anything interactive must clear 4.5:1. Eyeballing has already shipped invisible buttons on this studio's own site.",
      },
      {
        do: "Write the voice and tone guide with real before-and-after examples from their own copy, not adjectives",
        where: "repo",
      },
      {
        do: "Ship the brand book as a working site with live tokens, copyable values and downloadable assets, deployed on its own URL",
        where: "Vercel",
      },
      {
        do: "Hand over source files with a written note on every font licence and what it does and does not cover",
        where: "client",
      },
    ],
    verify: [
      "Every token pair used on an interactive element has a recorded, computed contrast ratio and all of them are 4.5:1 or better.",
      "The favicon is legible at 16 pixels in a real browser tab, checked in both light and dark UI.",
      "The brand book site loads on its own URL and its hex values copy to the clipboard correctly.",
      "Every font in the handover has a named licence covering the media it is used in.",
    ],
    traps: [
      "Agree who signs off before you present. A second opinion arriving after the third round is how twenty days becomes thirty.",
      "Never eyeball contrast. Compute it. A colour system that fails 4.5:1 fails on every site built from it afterwards.",
      "A desktop font licence does not cover a webfont, an app or a video. Check the licence before the type system is chosen, not after the client has fallen for it.",
      "A PDF brand book is out of date the day the site changes. The registry deliverable is a working site — ship that.",
      "Do not design colours only in light mode. If the site has a dark scheme, the token pairs flip meaning and a button that passed can become invisible.",
    ],
    handover: [
      "Mark, wordmark, monogram and favicon in vector, plus the exported sizes each platform actually needs.",
      "One token file for type and colour, consumed directly by the site rather than transcribed into it.",
      "A voice and tone guide with worked examples, and the brand book live on its own URL.",
      "No monthly fee attaches to this. Ongoing asset production is a short-form video pack or a content retainer, priced separately.",
    ],
  },

  "reel-pack": {
    summary:
      "Four finished short-form videos per month — edited, captioned, sound-designed and exported vertical — where the count is the contract and the pipeline is built once.",
    prerequisites: [
      "The scope is written as a count and a month before anything is filmed or edited.",
      "A source of footage exists: their material, a booked shoot, or product access.",
      "A music licence route is decided, with receipts kept.",
      "This is marked 'next' in the registry — the edit pipeline is a build on the first month, not an assembly.",
    ],
    fromClient: [
      "Source footage, or product access and a booked slot if we are filming.",
      "Written confirmation they hold rights to all material, including music and anyone appearing on camera.",
      "The month's four topics, or a standing brief that lets you pick them.",
      "Who approves, and the date by which approval has to land for the month to be delivered.",
    ],
    steps: [
      {
        do: "Write the scope as a count and a period: four finished videos per calendar month, two revision rounds each, unused videos do not roll over",
        where: "client",
        detail:
          "This is the sentence that decides whether the retainer is profitable. Get it into the agreement, not into a chat message.",
      },
      {
        do: "Agree the month's four topics in one message at the start of the month",
        where: "client",
      },
      {
        do: "Build the edit pipeline once — an ffmpeg or Remotion composition with a caption layer — so video two is not a fresh edit",
        where: "repo",
      },
      {
        do: "Cut captions from a transcript and proofread them by eye",
        where: "local",
        detail:
          "Auto-captions reliably mangle product names and Indian place names, which is exactly the text that matters.",
      },
      {
        do: "Export vertical at 1080 by 1920 and check the caption sits clear of each platform's on-screen interface",
        where: "local",
      },
      {
        do: "Use music from a library whose licence covers commercial use, and file the licence receipt with the project",
        where: "local",
        detail:
          "In-app audio libraries are licensed for organic posting inside that app, not for downloaded files or paid ads.",
      },
      {
        do: "Deliver the finished files and a one-line caption each into the shared folder by the agreed date",
        where: "client",
      },
      {
        do: "Log the month's four against the project so the count is a fact both sides can see",
        where: "repo",
      },
    ],
    verify: [
      "Exactly four finished files exist for the month, each 1080 by 1920, and the delivery log records four.",
      "Captions are readable on a phone held at arm's length, with no line clipped by the platform's interface.",
      "Every music track used has a named licence and a receipt in the project folder.",
      "Audio is present and levelled — play one video with a phone at half volume and it is audible without distortion.",
    ],
    traps: [
      "Sell a count. Four reels is scope; 'social media' is an unbounded commitment you cannot deliver or invoice against. This is the easiest service to over-deliver and the hardest to bound.",
      "'Post them for us as well' is a different service. Publishing and scheduling is the Instagram integration line item, not this one.",
      "Remotion is free at solo scale but requires a paid company licence above three people. If the client's own team will run the pipeline, count their heads, not yours.",
      "Platform audio libraries do not licence a downloaded file or an ad. Use a library you can produce a receipt for.",
      "Two revision rounds per video, as with every other service. A third is a chargeable extra review round — say so at the start of the month, not at the end.",
    ],
    handover: [
      "Four finished vertical videos a month with captions, in a shared folder, by a date they can hold you to.",
      "The monthly fee buys two and a half days a month: topics agreed at the start, four videos delivered, two revision rounds each, and a delivery log showing the count against the agreement.",
      "The edit pipeline lives in the repo, so month two is production rather than a rebuild.",
    ],
  },

  "motion-graphics": {
    summary:
      "Define motion tokens once — duration, easing, distance, stagger — then apply them across an animated logo sting and the site's scroll and hover behaviour, on an MIT library, honouring reduced motion.",
    prerequisites: [
      "Brand assets exist as real vectors, not PNGs traced back into vectors.",
      "The site exists to attach the motion to.",
      "Reduced-motion support is treated as a requirement of the deliverable, not a later fix.",
      "The animation library is MIT — Motion, formerly framer-motion — so it is safe inside a client deliverable.",
    ],
    fromClient: [
      "Logo and key assets as SVG or AI, with layers intact.",
      "Two or three references of motion they like, with what they like about each.",
      "Where the sting will be used — site header, video top and tail, social — because that decides the export formats.",
      "Who signs off the motion direction.",
    ],
    steps: [
      {
        do: "Collect the vector assets and confirm the logo can actually animate",
        where: "client",
        detail:
          "A flattened SVG with every shape merged into one path has nothing to move independently and has to be rebuilt first.",
      },
      {
        do: "Define motion tokens in one file — durations, easing curves, travel distance, stagger — and let nothing set those values anywhere else",
        where: "repo",
      },
      {
        do: "Build the logo sting against those tokens and export it both as a video file and, where it runs on the site, as a lightweight web animation",
        where: "repo",
      },
      {
        do: "Apply scroll and hover motion through one shared component driven by an intersection observer",
        where: "repo",
      },
      {
        do: "Wrap every animation in a prefers-reduced-motion check that degrades to opacity-only or to nothing",
        where: "repo",
      },
      {
        do: "Confirm the licence of every animation dependency before it ships",
        where: "repo",
        detail:
          "Motion is MIT, which is why it is safe here. Do not substitute a fair-code or source-available library into a client deliverable without saying so out loud.",
      },
      {
        do: "Profile the animated pages and confirm only transform and opacity are being animated",
        where: "local",
      },
      {
        do: "Test on a mid-range Android handset, not only on a desktop browser",
        where: "local",
      },
    ],
    verify: [
      "Switching on Reduce Motion in the operating system's accessibility settings flattens or removes every animation on the live preview.",
      "A DevTools performance recording during scroll shows no layout thrash — nothing animates width, height, top or left.",
      "Searching the codebase for hard-coded durations or easing values outside the token file returns nothing.",
      "The sting reads in about a second on a phone screen, and still reads with the sound off.",
    ],
    traps: [
      "Honour prefers-reduced-motion or the site is unusable for some visitors and fails accessibility outright.",
      "Do not hand-tune each animation. The tokens are the deliverable; without them every new page reopens the same negotiation.",
      "Motion is MIT and safe to hand over. Fair-code tools such as n8n and Dify are fine for your own ops but cannot be resold as part of what the client is buying — check the licence of anything you add here.",
      "Scroll animation that hides content until it enters the viewport breaks for anyone arriving on a hash link or printing the page. Make the end state the default and the motion the enhancement.",
      "A logo sting with sound needs a music licence exactly like any other video.",
    ],
    handover: [
      "One motion token file the site reads directly, so future pages inherit the motion rather than reinventing it.",
      "The logo sting in both a video file and a web-ready form, with the sizes each placement needs.",
      "Scroll and hover motion live on the site, with the reduced-motion behaviour documented in a sentence they can read.",
      "No monthly fee attaches. Applying existing tokens to a new page is a small change; a new composition is new work.",
    ],
  },
};

export default RUNBOOKS;
