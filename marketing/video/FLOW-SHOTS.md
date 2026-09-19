# The three remaining shots — paste-ready for Flow

The 30s reel that ships today (`out/brandmint-reel-30s-subs.mp4`) is complete
and uses real product footage for beat 3. This pack is only for the OPTIONAL
all-Veo six-shot version that `cut-30.sh` builds.

WHY THIS IS A MANUAL PACK AND NOT A SCRIPT RUN. Three generation routes exist
and all three are shut:
  * Gemini / Veo API — needs GEMINI_API_KEY, which lives nowhere on this box.
  * ElevenLabs connector — 402 paid_plan_required, "video generation is not
    allowed for free accounts". Nothing was charged.
  * Glif connector — 0 credits, no plan.
Flow is the fourth route and the one that is already paid for: Google AI Pro
(the Jio plan) includes it, and it draws on a DIFFERENT credit pool from the
API's daily Veo quota. So these three shots are not blocked — they are just
not automatable from here.

HOW TO USE. For each block below: paste the whole prompt into Flow, generate
at 9:16, 4 seconds, download, and save to the exact filename given. Then:

    ./marketing/video/cut-30.sh          # six shots + end card = 30.00s
    node marketing/video/subtitles.mjs --script brand \
      --audio out/vo-alnilam-tight.wav --font fonts/brandmint-display.ttf \
      --words 3 --chars 22 --until 24 --out out/brand.ass

CHECK EVERY CLIP BEFORE YOU TRUST IT. look.mp4 came back from Veo reporting
720x1280 with 98px of black baked in top and bottom, and nothing noticed until
it was already in a cut:

    ffmpeg -ss 2 -t 0.5 -i out/<clip>.mp4 -vf cropdetect=limit=24:round=2 -f null -

A clean 4s vertical clip reports crop=720:1280:0:0. Anything else is
letterboxed and needs the crop treatment cut-reel.sh applies to look.

THE TWO FAILURES THESE PROMPTS ARE WRITTEN AGAINST. "tape" previously produced
a parcel that morphed through four different shapes mid-handover; "lift"
returned a food-delivery rider in a cold warehouse. The rigid-box language and
the wardrobe exclusions are load-bearing — do not trim them for brevity.


──────── wait · Someone is waiting · 4s · 9:16 · save as out/wait.mp4 ────────

Inside a bright modern clothing boutique, a customer stands at a rail of clothes with her back half to camera, holding one garment on its hanger out in front of her and looking at it, then glancing off toward the counter. She holds the same single hanger throughout and picks up nothing else. Nobody else is in frame. Warm daylight, pale wood, one emerald cushion on a bench.

Premium commercial brand film, 9:16 vertical, shot on a 50mm at T2.0, 24fps, clean and bright with a soft filmic grade — a D2C brand campaign, not documentary reportage and not a stock library. MODERN INDIAN BUSINESS, NOT A STREET STALL: contemporary Indian retail and studios — a designer boutique, a jewellery showroom, a specialty cafe, a clean packing room, a bright modern high street. Hyderabad and Indian in people, dress and styling, but well-designed and well-lit throughout. Never a crowded bazaar, never a cluttered kirana shop, nothing that reads as run-down. Generous soft daylight through large windows, pale wood, off-white walls, a little greenery, one small emerald-green accent somewhere in frame. Real Indian people with real skin texture, never CGI or plastic. ONE SINGLE CONTINUOUS SHOT, no cuts, no split screen, no seam or band across the frame, no second image composited in. Absolutely no text, letters, numbers, words, signage, icons, notifications, user interface, logos, watermarks or printing anywhere in frame, and no legible phone or laptop screens.


──────── tape · Packed · 4s · 9:16 · save as out/tape.mp4 ────────

Close on a pale wood bench in a bright packing room: a woman's hands fold the flaps of ONE rigid brown corrugated cardboard box closed and press a strip of tape along the seam. Hands and forearms only, no face. The box is firm and cubic with square corners and keeps its exact shape, size and colour for every frame — it never becomes soft, flat, thin or a bag. Two identical closed boxes sit beside it, unmoving. A small emerald vase at the edge of frame. Warm daylight.

Premium commercial brand film, 9:16 vertical, shot on a 50mm at T2.0, 24fps, clean and bright with a soft filmic grade — a D2C brand campaign, not documentary reportage and not a stock library. MODERN INDIAN BUSINESS, NOT A STREET STALL: contemporary Indian retail and studios — a designer boutique, a jewellery showroom, a specialty cafe, a clean packing room, a bright modern high street. Hyderabad and Indian in people, dress and styling, but well-designed and well-lit throughout. Never a crowded bazaar, never a cluttered kirana shop, nothing that reads as run-down. Generous soft daylight through large windows, pale wood, off-white walls, a little greenery, one small emerald-green accent somewhere in frame. Real Indian people with real skin texture, never CGI or plastic. ONE SINGLE CONTINUOUS SHOT, no cuts, no split screen, no seam or band across the frame, no second image composited in. Absolutely no text, letters, numbers, words, signage, icons, notifications, user interface, logos, watermarks or printing anywhere in frame, and no legible phone or laptop screens.


──────── lift · And gone · 4s · 9:16 · save as out/lift.mp4 ────────

In a bright packing room a young Indian man in a plain dark polo shirt lifts ONE rigid brown corrugated cardboard box off a pale wood bench with both hands and turns away from camera carrying it. He is the only person in frame and nobody hands him anything — the box is on the bench, then in his hands. It is firm and cubic and keeps its exact shape and size throughout. NO helmet, no insulated food-delivery backpack, no branded or bright blue uniform. Warm golden daylight, pale wood, a small emerald vase on the bench.

Premium commercial brand film, 9:16 vertical, shot on a 50mm at T2.0, 24fps, clean and bright with a soft filmic grade — a D2C brand campaign, not documentary reportage and not a stock library. MODERN INDIAN BUSINESS, NOT A STREET STALL: contemporary Indian retail and studios — a designer boutique, a jewellery showroom, a specialty cafe, a clean packing room, a bright modern high street. Hyderabad and Indian in people, dress and styling, but well-designed and well-lit throughout. Never a crowded bazaar, never a cluttered kirana shop, nothing that reads as run-down. Generous soft daylight through large windows, pale wood, off-white walls, a little greenery, one small emerald-green accent somewhere in frame. Real Indian people with real skin texture, never CGI or plastic. ONE SINGLE CONTINUOUS SHOT, no cuts, no split screen, no seam or band across the frame, no second image composited in. Absolutely no text, letters, numbers, words, signage, icons, notifications, user interface, logos, watermarks or printing anywhere in frame, and no legible phone or laptop screens.

