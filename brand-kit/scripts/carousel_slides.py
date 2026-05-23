# Slide content for the 16 carousel posts.
# Each entry maps post-NN -> list of slide dicts (slide 1 = cover, already
# rendered; slides 2..N-1 = body; slide N = CTA).
#
# Each slide dict has:
#   eyebrow:  short uppercase mono label (max 30 chars, e.g. "02 / KOKAPET")
#   title:    big serif statement (1 or 2 lines, max ~28 chars per line)
#   body:     2-4 lines of editorial prose (max ~40 chars per line)
#   tag:      optional mono tag below body (e.g. "ENTRY PRICE ZONE")

SLIDES = {
    # ------------------------------------------------------------------
    # post-02 — What 1Cr buys you in Kokapet vs Tellapur (8 slides)
    # Zones: Kokapet, Tellapur, Gachibowli, Narsingi, Tukkuguda,
    #        Adibatla, Bachupally, Kompally (visual concept lists 6 zones
    #        for slides 2-7; we cover 6 zones across slides 2-7 and close
    #        on slide 8 CTA).
    # ------------------------------------------------------------------
    "post-02": [
        {  # slide 2
            "eyebrow": "02 / KOKAPET",
            "title": "Two cities,\none pin code.",
            "body": "1Cr is now an entry ticket here.\nA smaller 2BHK in a launch tower.\nThe balcony view may not survive.",
            "tag": "ENTRY PRICE ZONE",
        },
        {  # slide 3
            "eyebrow": "03 / TELLAPUR",
            "title": "Square footage\nstill answers.",
            "body": "Same budget, more room to breathe.\nSometimes a corner unit.\nThe road that gets there next.",
            "tag": "SPACE-FOR-MONEY ZONE",
        },
        {  # slide 4
            "eyebrow": "04 / GACHIBOWLI",
            "title": "The legacy\nspine.",
            "body": "Resale dominates the budget.\nNew launches sit in the premium band.\nYou are paying for proximity, not novelty.",
            "tag": "ESTABLISHED CORE",
        },
        {  # slide 5
            "eyebrow": "05 / NARSINGI",
            "title": "The quiet\nwestern fringe.",
            "body": "End-user buyers, larger formats.\nA short drive from the Financial District.\nPositioning is still being written.",
            "tag": "EMERGING PREMIUM",
        },
        {  # slide 6
            "eyebrow": "06 / TUKKUGUDA",
            "title": "Airport-side\npatience.",
            "body": "End-user dominant, mass to mid bands.\nSlow absorption, real demand.\nA bet on the corridor, not the address.",
            "tag": "AIRPORT CORRIDOR",
        },
        {  # slide 7
            "eyebrow": "07 / ADIBATLA",
            "title": "Defence work,\nresidential follow.",
            "body": "Aerospace and defence anchor the demand.\nBuyers ask us for current ranges.\nThe spec arrives before the marketing.",
            "tag": "ANCHORED MICRO-MARKET",
        },
        {  # slide 8 (CTA)
            "eyebrow": "08 / SAVE",
            "title": "Save this.\nPin a zone.\nVisit two.",
            "body": "Tag a friend who is just looking around.\nFollow @brandmint.studios.\nWe publish Tue and Thu.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-03 — Most builder Instagrams look like brochures (7 slides)
    # Visual concept: 5 fixes on slides 2-6, closing slide 7.
    # ------------------------------------------------------------------
    "post-03": [
        {  # slide 2
            "eyebrow": "02 / 07",
            "title": "Pick a position,\nnot a tone.",
            "body": "A tone is how you sound.\nA position is what you believe.\nStart with belief. Voice follows.",
            "tag": "FIX 01 · POSITION",
        },
        {  # slide 3
            "eyebrow": "03 / 07",
            "title": "Stop dumping\nthe flyer.",
            "body": "Renders, prices, site-visit-now.\nThese are posters, not posts.\nReplace one in three with an idea.",
            "tag": "FIX 02 · FORMAT",
        },
        {  # slide 4
            "eyebrow": "04 / 07",
            "title": "Carry the belief\nacross formats.",
            "body": "Reel, carousel, hoarding, brochure.\nSame point of view in each.\nA brand is repetition with intent.",
            "tag": "FIX 03 · CONSISTENCY",
        },
        {  # slide 5
            "eyebrow": "05 / 07",
            "title": "Hide the logo.\nStill yours?",
            "body": "If a stranger can name you without it,\nyou have a brand.\nIf not, you have a feed.",
            "tag": "FIX 04 · RECOGNITION",
        },
        {  # slide 6
            "eyebrow": "06 / 07",
            "title": "Break the\n18-week silence.",
            "body": "Cadence is a signal of seriousness.\nFewer posts, on a clock,\nbeat an event-led grid every time.",
            "tag": "FIX 05 · CADENCE",
        },
        {  # slide 7 (CTA)
            "eyebrow": "07 / 07",
            "title": "Position,\nthen post.",
            "body": "Save this if you run a builder grid.\nDM “audit” for the long version.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-06 — Five micro-markets quietly absorbing 2026 demand (6 slides)
    # Visual concept: 5 zones on slides 2-6, but format says final slide
    # is a six-zone overview. We treat slide 6 as the CTA + overview.
    # ------------------------------------------------------------------
    "post-06": [
        {  # slide 2
            "eyebrow": "02 / TUKKUGUDA",
            "title": "Airport-side,\nend-user led.",
            "body": "Who buys: families near the corridor.\nWhy now: jobs and a road, not a story.\nRisk: timing the absorption curve.",
            "tag": "AIRPORT CORRIDOR",
        },
        {  # slide 3
            "eyebrow": "03 / ADIBATLA",
            "title": "Defence work,\nslow and real.",
            "body": "Who buys: anchor-employer households.\nWhy now: spec arrives before pitch.\nRisk: paying retail on early launches.",
            "tag": "DEFENCE ADJACENCY",
        },
        {  # slide 4
            "eyebrow": "04 / BACHUPALLY",
            "title": "ORR-north,\nfamily mass.",
            "body": "Who buys: end-users at scale.\nWhy now: schools, ORR, employer ring.\nRisk: too many similar projects.",
            "tag": "ORR NORTH",
        },
        {  # slide 5
            "eyebrow": "05 / SHADNAGAR",
            "title": "Highway story,\nSEZ asterisk.",
            "body": "Who buys: speculators, early end-users.\nWhy now: Bengaluru highway pull.\nRisk: SEZ news drives the chart.",
            "tag": "BENGALURU HIGHWAY",
        },
        {  # slide 6 (CTA + overview)
            "eyebrow": "06 / PATANCHERU",
            "title": "Industry,\nre-read.",
            "body": "An old belt being read as residential.\nSave this. Send to the friend asking\n“where should I look next?”",
            "tag": "FOLLOW @BRANDMINT.STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-08 — Lodha doesn't sell flats, it sells a worldview (8 slides)
    # Visual concept: 6 moves on slides 2-7, closing slide 8.
    # ------------------------------------------------------------------
    "post-08": [
        {  # slide 2
            "eyebrow": "02 / 08",
            "title": "Sell a worldview,\nnot a unit.",
            "body": "At the top of the funnel,\nno one is buying.\nThey are forming an opinion of you.",
            "tag": "MOVE 01 · WORLDVIEW",
        },
        {  # slide 3
            "eyebrow": "03 / 08",
            "title": "Photograph it\nlike a monument.",
            "body": "Treat the tower as architecture, not stock.\nFrames before features.\nThe image is the argument.",
            "tag": "MOVE 02 · IMAGERY",
        },
        {  # slide 4
            "eyebrow": "04 / 08",
            "title": "Write it like\nstatecraft.",
            "body": "Founder copy that names a future.\nLess press release, more position.\nReaders share what they can quote.",
            "tag": "MOVE 03 · LANGUAGE",
        },
        {  # slide 5
            "eyebrow": "05 / 08",
            "title": "Hide the\nfloor plan.",
            "body": "Brochure work belongs in the brochure.\nThe feed exists to be remembered.\nSave floor plans for the visit.",
            "tag": "MOVE 04 · RESTRAINT",
        },
        {  # slide 6
            "eyebrow": "06 / 08",
            "title": "Stay on a\nslow clock.",
            "body": "Skip the festival graphics.\nPick the right milestones.\nFewer posts, more weight.",
            "tag": "MOVE 05 · CADENCE",
        },
        {  # slide 7
            "eyebrow": "07 / 08",
            "title": "Discipline\nbefore budget.",
            "body": "At 2,000 per sqft or 20,000 per sqft,\nthe rules are the same.\nYou do not need their budget.",
            "tag": "MOVE 06 · DISCIPLINE",
        },
        {  # slide 8 (CTA)
            "eyebrow": "08 / 08",
            "title": "Don’t copy Lodha.\nCopy the discipline.",
            "body": "Save this. Send to your marketing head.\nFollow @brandmint.studios.\nBrand teardowns every other Monday.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-09 — The 2025 Hyderabad launch tracker (Q1) (7 slides)
    # Slides 2-4: charts. Slides 5-7: three patterns. Slide 7 = CTA.
    # ------------------------------------------------------------------
    "post-09": [
        {  # slide 2
            "eyebrow": "02 / METHOD",
            "title": "Launches,\nnot relaunches.",
            "body": "Public listings and RERA filings,\ncross-checked against builder grids.\nNo relaunches dressed as launches.",
            "tag": "Q1 GROUND RULES",
        },
        {  # slide 3
            "eyebrow": "03 / GEOGRAPHY",
            "title": "Where the\nquarter went.",
            "body": "Launches read as a portfolio,\nnot a single deal.\nLocality density tells the story.",
            "tag": "ZONE DISTRIBUTION",
        },
        {  # slide 4
            "eyebrow": "04 / SEGMENT",
            "title": "Mass to ultra,\nplotted.",
            "body": "Each launch tagged: mass, mid,\npremium, ultra.\nThe middle is doing the work.",
            "tag": "SEGMENT BANDS",
        },
        {  # slide 5
            "eyebrow": "05 / PATTERN 01",
            "title": "Kokapet defends\nthe floor.",
            "body": "Inventory is still being added\neven as absorption slows.\nThe price floor is being held.",
            "tag": "READ · PRICE DISCIPLINE",
        },
        {  # slide 6
            "eyebrow": "06 / PATTERN 02",
            "title": "Tellapur quietly\ndid the volume.",
            "body": "Highest count of mid-segment launches.\nNo single project led the chart.\nBig in aggregate, not headline.",
            "tag": "READ · SILENT WINNER",
        },
        {  # slide 7 (CTA)
            "eyebrow": "07 / PATTERN 03",
            "title": "The lobby is\nthe new clubhouse.",
            "body": "Premium is moving from amenities\nto design language.\nComment “tracker” for the underlying list.",
            "tag": "FOLLOW @BRANDMINT.STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-11 — Why every Empires frame has a letterbox bar (6 slides)
    # Visual concept: slide 2 = frame stripped to components.
    # Slides 3-5 = typography, colour, numerals. Slide 6 = closer.
    # ------------------------------------------------------------------
    "post-11": [
        {  # slide 2
            "eyebrow": "02 / SYSTEM",
            "title": "The bars are\na contract.",
            "body": "Letterboxing tells your eye:\nthis is a film, not a flyer.\nThe ratio is the first piece of copy.",
            "tag": "ASPECT · 2.39:1",
        },
        {  # slide 3
            "eyebrow": "03 / TYPOGRAPHY",
            "title": "Serif for\nthe headline.",
            "body": "Paper-cream display, print-magazine cuts.\nMono for the index marks.\nTwo families, one voice.",
            "tag": "TYPE STACK",
        },
        {  # slide 4
            "eyebrow": "04 / COLOUR",
            "title": "Warm-black,\nmint as accent.",
            "body": "Ground colour holds the frame.\nMint is reserved for one decision.\nNot every frame earns it.",
            "tag": "PALETTE RULES",
        },
        {  # slide 5
            "eyebrow": "05 / NUMERALS",
            "title": "Numerals from\nthe index page.",
            "body": "Borrowed from print magazines.\nOversize, set tight, in mint.\nA quiet wayfinding system.",
            "tag": "INDEX MARKS",
        },
        {  # slide 6 (CTA)
            "eyebrow": "06 / SERIES",
            "title": "Same rules.\nFour episodes.",
            "body": "EP01 to EP04 read as one series.\nSave. Send to your marketing team.\nDM “system” for the long breakdown.",
            "tag": "FOLLOW @BRANDMINT.STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-14 — Five things every builder homepage gets wrong (9 slides)
    # Slides 2-6: five mistakes. Slide 7: synthesis. Slide 8: quote.
    # Slide 9: CTA outro.
    # ------------------------------------------------------------------
    "post-14": [
        {  # slide 2
            "eyebrow": "02 / 09",
            "title": "The fold sells\nfeatures.",
            "body": "First screen, every time:\namenities, awards, RERA.\nIt should sell a position instead.",
            "tag": "MISTAKE 01 · THE FOLD",
        },
        {  # slide 3
            "eyebrow": "03 / 09",
            "title": "The About page\nis a photo.",
            "body": "Founder portrait, one paragraph,\nthree decades summarised.\nIt should be a worldview.",
            "tag": "MISTAKE 02 · ABOUT",
        },
        {  # slide 4
            "eyebrow": "04 / 09",
            "title": "Project pages\nlist things.",
            "body": "Amenities in a bulleted column.\nNo narrative, no point of view.\nNarrate the building instead.",
            "tag": "MISTAKE 03 · PROJECT",
        },
        {  # slide 5
            "eyebrow": "05 / 09",
            "title": "One CTA:\nthe phone number.",
            "body": "Buyers arrive at three intent levels.\nRead more. Save the brochure.\nBook a visit. Offer all three.",
            "tag": "MISTAKE 04 · CTA",
        },
        {  # slide 6
            "eyebrow": "06 / 09",
            "title": "Eight seconds\non 4G.",
            "body": "The site is too heavy for the network\nthe buyer is actually on.\nSpeed is brand. Buyers do not wait.",
            "tag": "MISTAKE 05 · SPEED",
        },
        {  # slide 7
            "eyebrow": "07 / 09",
            "title": "Five fixes,\none page.",
            "body": "Position the fold. Rewrite About.\nNarrate the project. Stack the CTAs.\nMake the page lighter.",
            "tag": "SYNTHESIS",
        },
        {  # slide 8
            "eyebrow": "08 / 09",
            "title": "Stop selling\nfeatures.",
            "body": "Sell a position.\nThe page is not a brochure.\nIt is the brand standing still.",
            "tag": "EDITORIAL VERDICT",
        },
        {  # slide 9 (CTA)
            "eyebrow": "09 / 09",
            "title": "Save.\nDM: audit.",
            "body": "We look at homepages with an editor’s eye.\nFollow @brandmint.studios.\nBrand positioning every Wed and Sun.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-15 — Financial District is full. What now? (8 slides)
    # Slides 2-4: three consequences. Slides 5-6: receiving zones.
    # Slide 7: synthesis. Slide 8: closer + CTA.
    # ------------------------------------------------------------------
    "post-15": [
        {  # slide 2
            "eyebrow": "02 / CONSEQUENCE 01",
            "title": "Premium moves\nwest.",
            "body": "Narsingi and Kokapet’s western fringe\nare absorbing the next wave.\nLaunches will follow the signal.",
            "tag": "DEMAND FLOW",
        },
        {  # slide 3
            "eyebrow": "03 / CONSEQUENCE 02",
            "title": "The district\nsplits in two.",
            "body": "A view-plus-brand band holds firm.\nA just-an-address band negotiates.\nOne district, two pricing stories.",
            "tag": "TWO-TIER SPLIT",
        },
        {  # slide 4
            "eyebrow": "04 / CONSEQUENCE 03",
            "title": "Offices leak\noutward.",
            "body": "Gachibowli, Manikonda,\nthe Tellapur road, all pick up.\nResidential should track the leak.",
            "tag": "OFFICE-LED ABSORPTION",
        },
        {  # slide 5
            "eyebrow": "05 / NARSINGI",
            "title": "The new\npremium fringe.",
            "body": "Larger formats, end-user dominant,\na short drive from the spine.\nPositioning is still being written.",
            "tag": "RECEIVING ZONE",
        },
        {  # slide 6
            "eyebrow": "06 / TELLAPUR ROAD",
            "title": "Where the office\nleak lands.",
            "body": "Mid-segment launches, real volume.\nA road that quietly priced itself in.\nWatch the absorption, not the noise.",
            "tag": "RECEIVING ZONE",
        },
        {  # slide 7
            "eyebrow": "07 / SYNTHESIS",
            "title": "One district,\ntwo pricing tiers.",
            "body": "View-plus-brand sits at the top.\nAddress-only negotiates underneath.\nThe split was already there.",
            "tag": "READ THE SPLIT",
        },
        {  # slide 8 (CTA)
            "eyebrow": "08 / CLOSING",
            "title": "The district stays.\nThe story moves.",
            "body": "Save for your next investor talk.\nThis is a vocabulary post, not advice.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-17 — Reading a Hyderabad skyline like a builder would (7 slides)
    # Slides 2-6: five layers (early-2000s, late-2000s, 2014-18, 2019-22,
    # 2023-25). Layer 06 (2026) folds into the closer on slide 7.
    # ------------------------------------------------------------------
    "post-17": [
        {  # slide 2
            "eyebrow": "02 / LAYER 01",
            "title": "Early-2000s\nmid-rises.",
            "body": "Cement-grey, simple massing.\nBuilt for a city\nthat had not been priced in yet.",
            "tag": "FOUNDATION LAYER",
        },
        {  # slide 3
            "eyebrow": "03 / LAYER 02",
            "title": "Late-2000s\ntower experiments.",
            "body": "Glass cladding, ornamental crowns.\nThe first attempt at premium.\nMore ambition than discipline.",
            "tag": "FIRST EXPERIMENT",
        },
        {  # slide 4
            "eyebrow": "04 / LAYER 03",
            "title": "2014–2018\nvertical wave.",
            "body": "Brand-name builders, IT absorption.\nFaçades that tried to brand themselves.\nThe city learned to look up.",
            "tag": "BRANDED ERA",
        },
        {  # slide 5
            "eyebrow": "05 / LAYER 04",
            "title": "2019–2022\nultra-premium push.",
            "body": "Designer collaborations.\nResidential as architectural statement.\nMarketing learned to sound like art.",
            "tag": "STATEMENT ERA",
        },
        {  # slide 6
            "eyebrow": "06 / LAYER 05",
            "title": "2023–2025\nthe reset.",
            "body": "Quieter design language.\nFewer marketing fireworks.\nMore discipline at the same price.",
            "tag": "CORRECTION ERA",
        },
        {  # slide 7 (CTA)
            "eyebrow": "07 / LAYER 06",
            "title": "Read the layers.\nThen read the launch.",
            "body": "The 2026 layer is still arriving.\nSave. Comment with the next skyline\nyou want us to read.",
            "tag": "FOLLOW @BRANDMINT.STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-19 — ORR vs RRR (6 slides)
    # Slides 2-5: ORR retrospective, RRR forward read, retail trap,
    # institutional edge. Slide 6: closer + CTA.
    # ------------------------------------------------------------------
    "post-19": [
        {  # slide 2
            "eyebrow": "02 / ORR",
            "title": "The last decade\nran on asphalt.",
            "body": "Tellapur, Tukkuguda, Adibatla.\nVillages became micro-markets.\nAll of them owe a stretch of road.",
            "tag": "ORR · RETROSPECTIVE",
        },
        {  # slide 3
            "eyebrow": "03 / RRR",
            "title": "The next ring,\none further out.",
            "body": "Same script. Faster timeline.\nLess visible from inside the city.\nThe absorption story is harder to read.",
            "tag": "RRR · FORWARD READ",
        },
        {  # slide 4
            "eyebrow": "04 / RETAIL TRAP",
            "title": "Buying a road\non paper.",
            "body": "Retail buyers arrive too early.\nThey pay for a map, not a market.\nThe timing is the whole game.",
            "tag": "TIMING · TRAP",
        },
        {  # slide 5
            "eyebrow": "05 / INSTITUTIONAL EDGE",
            "title": "Land minus three.\nSteel minus one.",
            "body": "Institutional buyers stack the cycle.\nLand early, structures late.\nDiscipline is the alpha.",
            "tag": "TIMING · EDGE",
        },
        {  # slide 6 (CTA)
            "eyebrow": "06 / CLOSING",
            "title": "ORR built the city.\nRRR builds the next.",
            "body": "Save. Send to the friend asking\nabout long-term plots.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-22 — What "luxury" actually means in builder marketing (8 slides)
    # Slides 2-5: four signals. Slide 6: checklist. Slide 7: quote.
    # Slide 8: CTA outro.
    # ------------------------------------------------------------------
    "post-22": [
        {  # slide 2
            "eyebrow": "02 / SIGNAL 01",
            "title": "Restraint.",
            "body": "The brand does not oversell.\nFewer adjectives, not more.\nThe brochure trusts the reader.",
            "tag": "LUXURY SIGNAL · 01",
        },
        {  # slide 3
            "eyebrow": "03 / SIGNAL 02",
            "title": "Specificity.",
            "body": "Materials are named.\nThe architect is credited.\nReferences are precise, not vague.",
            "tag": "LUXURY SIGNAL · 02",
        },
        {  # slide 4
            "eyebrow": "04 / SIGNAL 03",
            "title": "Patience.",
            "body": "Not every milestone is a post.\nThe brand picks the right ones.\nSilence is part of the system.",
            "tag": "LUXURY SIGNAL · 03",
        },
        {  # slide 5
            "eyebrow": "05 / SIGNAL 04",
            "title": "Coherence.",
            "body": "Instagram, hoarding, brochure, visit.\nAll feel like the same builder.\nThe seams do not show.",
            "tag": "LUXURY SIGNAL · 04",
        },
        {  # slide 6
            "eyebrow": "06 / CHECKLIST",
            "title": "Three or more\nmissing?",
            "body": "Restraint. Specificity. Patience.\nCoherence. Count what is present.\nThe project may be expensive, not luxury.",
            "tag": "THE FOUR-SIGNAL TEST",
        },
        {  # slide 7
            "eyebrow": "07 / QUOTE",
            "title": "Restraint is the\nmost expensive thing.",
            "body": "Not the material.\nNot the architect.\nThe willingness to leave space.",
            "tag": "EDITORIAL VERDICT",
        },
        {  # slide 8 (CTA)
            "eyebrow": "08 / CLOSING",
            "title": "Save for your\nnext brand review.",
            "body": "DM “luxury” for the long read.\nFollow @brandmint.studios.\nBrand teardowns weekly.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-23 — Per-sqft heatmap, 12 zones (7 slides)
    # Slides 2-6 group zones by band. Slide 7: closer + CTA.
    # No invented per-sqft figures.
    # ------------------------------------------------------------------
    "post-23": [
        {  # slide 2
            "eyebrow": "02 / METHOD",
            "title": "Four bands,\ntwelve zones.",
            "body": "Mass. Mid. Premium. Ultra.\nA vocabulary tool, not a quote.\nMicro-pockets vary inside every zone.",
            "tag": "HOW TO READ THE GRID",
        },
        {  # slide 3
            "eyebrow": "03 / ULTRA",
            "title": "Where price\nleaves the axis.",
            "body": "Jubilee Hills. Banjara Hills.\nLegacy addresses, low velocity.\nThe band is set by who lives there.",
            "tag": "BAND · ULTRA",
        },
        {  # slide 4
            "eyebrow": "04 / PREMIUM",
            "title": "The marketing\nclaim layer.",
            "body": "Kokapet. Financial District. Gachibowli.\nWhere most claims to luxury sit.\nReal premium needs more than price.",
            "tag": "BAND · PREMIUM",
        },
        {  # slide 5
            "eyebrow": "05 / MID",
            "title": "Where the volume\nactually lives.",
            "body": "Narsingi. Tellapur. Manikonda. Madhapur.\nThe wide middle of the market.\nMost launches happen here.",
            "tag": "BAND · MID",
        },
        {  # slide 6
            "eyebrow": "06 / MASS",
            "title": "The entry\nper-sqft band.",
            "body": "Bachupally. Kompally. Hi-Tech edges.\nThe family buyer’s working range.\nThe city’s real demand floor.",
            "tag": "BAND · MASS",
        },
        {  # slide 7 (CTA)
            "eyebrow": "07 / CAVEAT",
            "title": "A vocabulary tool.\nNot a transaction.",
            "body": "Bands are public-knowledge ranges.\nSave. Send to your broker.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-24 — Sustainability in Hyderabad is mostly marketing (6 slides)
    # Slides 2-5: four verification axes (site, materials, water, power).
    # Slide 6: maintenance design + checklist closer + CTA.
    # ------------------------------------------------------------------
    "post-24": [
        {  # slide 2
            "eyebrow": "02 / AXIS 01",
            "title": "Site planning,\nbefore the render.",
            "body": "Does the project preserve existing trees,\nor did the renders show a forest\nthat the bulldozers already removed?",
            "tag": "VERIFY · SITE",
        },
        {  # slide 3
            "eyebrow": "03 / AXIS 02",
            "title": "Materials,\nnot adjectives.",
            "body": "Is concrete being supplemented,\nor simply used at scale?\nNamed materials beat green keywords.",
            "tag": "VERIFY · MATERIALS",
        },
        {  # slide 4
            "eyebrow": "04 / AXIS 03",
            "title": "Water sized to\nactual use.",
            "body": "Rainwater harvesting and STP capacity.\nSized to occupancy, not brochure.\nA tank is not a strategy.",
            "tag": "VERIFY · WATER",
        },
        {  # slide 5
            "eyebrow": "05 / AXIS 04",
            "title": "Solar as a\nreal percentage.",
            "body": "Solar load as a share\nof common-area consumption.\nNumbers, not panels on a clubhouse.",
            "tag": "VERIFY · POWER",
        },
        {  # slide 6 (CTA)
            "eyebrow": "06 / AXIS 05",
            "title": "If it needs perfect\noperation, it isn’t.",
            "body": "Sustainability lives in maintenance.\nSave this checklist. Carry it on site.\nFollow @brandmint.studios.",
            "tag": "VERIFY · MAINTENANCE",
        },
    ],

    # ------------------------------------------------------------------
    # post-26 — Modcon Builders, in their own frame (8 slides)
    # Slides 2-7: editorial stills from the EP04 frame.
    # Slide 8: outro + CTA.
    # ------------------------------------------------------------------
    "post-26": [
        {  # slide 2
            "eyebrow": "02 / RECORD",
            "title": "Hyderabad first.\nUAE second.",
            "body": "Headquartered in Hyderabad,\nwith a second base in the UAE.\nTwo geographies, one studio voice.",
            "tag": "PUBLIC RECORD",
        },
        {  # slide 3
            "eyebrow": "03 / FOUNDERS",
            "title": "Chandu Reddy.\nManikanta Sridhar Malladi.",
            "body": "Two founders, quietly running\na project list most buyers\nwill not see on a hoarding.",
            "tag": "LEADERSHIP",
        },
        {  # slide 4
            "eyebrow": "04 / AGARTHA",
            "title": "Agartha,\nthe cover frame.",
            "body": "The project we used\nas the EP04 cover.\nPublicly their most visible build.",
            "tag": "FLAGSHIP",
        },
        {  # slide 5
            "eyebrow": "05 / RECOGNITION",
            "title": "Outlook Business\nSpotlight, 2024.",
            "body": "Entity Award by Business Mint.\nA quiet signal in a loud category.\nRecognition without a press tour.",
            "tag": "RECOGNITION",
        },
        {  # slide 6
            "eyebrow": "06 / PALETTE",
            "title": "Dusty rose,\nwarm sand.",
            "body": "Their palette signals positioning\nbefore the copy lands.\nColour as the first sentence.",
            "tag": "BRAND PALETTE",
        },
        {  # slide 7
            "eyebrow": "07 / RESTRAINT",
            "title": "Not over-\ncommunicating.",
            "body": "Two geographies. Few campaigns.\nThe brand says less on purpose.\nUncommon is worth archiving.",
            "tag": "EDITORIAL READ",
        },
        {  # slide 8 (CTA)
            "eyebrow": "08 / CLOSING",
            "title": "Watch EP04.\nPinned.",
            "body": "Comment “Modcon” for the long notes.\nThis is a portrait, not an endorsement.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-27 — The 2026 Hyderabad index: 8 metrics (6 slides)
    # Slides 2-5 take two metrics each (8 metrics across 4 slides).
    # Slide 6: closer + CTA.
    # ------------------------------------------------------------------
    "post-27": [
        {  # slide 2
            "eyebrow": "02 / METRICS 1–2",
            "title": "Activity,\nat a glance.",
            "body": "01. Active project count, citywide.\n02. Net new launches, this quarter.\nVolume is the first signal.",
            "tag": "TILE · ACTIVITY",
        },
        {  # slide 3
            "eyebrow": "03 / METRICS 3–4",
            "title": "Price\nand patience.",
            "body": "03. Per-sqft bands, mass to ultra.\n04. Inventory months vs trailing 4Q.\nHow the market is breathing.",
            "tag": "TILE · PRICE",
        },
        {  # slide 4
            "eyebrow": "04 / METRICS 5–6",
            "title": "Volume here.\nValue there.",
            "body": "05. Top three absorption zones.\n06. Top three price-defending zones.\nDifferent winners on different axes.",
            "tag": "TILE · ABSORPTION",
        },
        {  # slide 5
            "eyebrow": "05 / METRICS 7–8",
            "title": "Office signal.\nOne tick of policy.",
            "body": "07. Office demand anchoring residential.\n08. One road, one rail, one policy move.\nWhat changes the next quarter.",
            "tag": "TILE · SIGNAL",
        },
        {  # slide 6 (CTA)
            "eyebrow": "06 / CLOSING",
            "title": "Numbers in Q3.",
            "body": "Eight metrics, refreshed quarterly.\nComment “index” for the Q3 ship.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],

    # ------------------------------------------------------------------
    # post-28 — A builder's content calendar, redesigned (7 slides)
    # Slides 2-5: four lanes (Why, What, Where, Who).
    # Slide 6: assembled month. Slide 7: closer + CTA.
    # ------------------------------------------------------------------
    "post-28": [
        {  # slide 2
            "eyebrow": "02 / LANE 01",
            "title": "The Why.",
            "body": "One post a month\non what the builder believes\nabout the city.",
            "tag": "MONTHLY · BELIEF",
        },
        {  # slide 3
            "eyebrow": "03 / LANE 02",
            "title": "The What.",
            "body": "One post a week\non a specific project,\ntold as a portrait, not a pitch.",
            "tag": "WEEKLY · PROJECT",
        },
        {  # slide 4
            "eyebrow": "04 / LANE 03",
            "title": "The Where.",
            "body": "One post a fortnight\non the locality:\nhistory, current read, future.",
            "tag": "FORTNIGHTLY · LOCALITY",
        },
        {  # slide 5
            "eyebrow": "05 / LANE 04",
            "title": "The Who.",
            "body": "One post a month on the team.\nThe architect, the on-site engineer.\nAnyone but the founder.",
            "tag": "MONTHLY · PEOPLE",
        },
        {  # slide 6
            "eyebrow": "06 / ASSEMBLY",
            "title": "Four lanes,\none month.",
            "body": "Why on week one.\nWhere on week two.\nWho on week three. What, every week.",
            "tag": "SAMPLE CALENDAR",
        },
        {  # slide 7 (CTA)
            "eyebrow": "07 / CLOSING",
            "title": "Stop posting\nfestival graphics.",
            "body": "Start posting positions.\nDM “calendar” for yours redesigned.\nFollow @brandmint.studios.",
            "tag": "BRAND · MINT · STUDIOS",
        },
    ],
}
