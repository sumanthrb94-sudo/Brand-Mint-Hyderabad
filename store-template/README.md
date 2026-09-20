# WhatsApp Store — the template

The ₹49,999 tier, built once and deployed per client instead of rebuilt.

**The rule: exactly one file changes per client — `store.config.js`.** If a
launch makes you edit a second file, that edit belongs in the config. This is
the whole discipline. A template you edit everywhere is just a starting point,
and a starting point does not get a build from eight days to three.

## What it delivers

The nine items in the WhatsApp Store tier (`shared/tiers.js` in the studio
repo), nothing more. Scope creep here becomes scope creep on every future
store at once.

| Tier promise | Where |
|---|---|
| Homepage and design system | `index.html` + `styles.css`, themed from config |
| Product listing and detail pages | `index.html`, `product.html` |
| Search, category filters and cart | `index.html`, `shared/cart.js` |
| Orders arrive on your phone, on WhatsApp | `shared/wa.js` |
| Razorpay online payments and COD | `cart.html` *(not built yet)* |
| Returns and refunds handled by message | the order ref in `shared/wa.js` |
| Products, stock and order management | `admin.html` *(not built yet)* |
| Database design and setup | `shared/catalogue.js` |
| Deployment, domain connection and SSL | Vercel + the client's domain |

## Launching a store

1. Copy `store-template/` to `../stores/<client>/`.
2. Fill in `store.config.js`. **Never invent a value** — phone number, GSTIN
   and the delivery promise come from the client. A delivery promise we made
   up is one they have to honour.
3. Put products in `data/products.json`. The shop is browsable immediately —
   before their Firebase exists, before they have sent one photograph. That is
   what lets you demo on day two instead of day nine.
4. Photos into `images/`, referenced from each product's `images` array. No
   photo falls back to a typographic card, so a missing image never blocks a
   launch.
5. Deploy to Vercel, point the domain, done.

Leave `catalogueSource: "local"` until the client is trained on the admin.
A JSON file you edit for them is faster than teaching a shop owner a CMS
during the build.

## Why localStorage for the cart

No account, no login. A customer will not sign up to buy two kurtas, and every
step between "I want this" and "message sent" costs orders. The whole pitch of
this tier is that ordering stays as easy as WhatsApp already is — with the
price, size and stock answered before they ask.

## Not built yet

- `product.html` — detail page with variant picker
- `cart.html` — cart, customer details, Razorpay, COD, the WhatsApp handoff
- `admin.html` — products, stock, orders for the shop owner
- `shared/firebase.js` — the `catalogueSource: "firestore"` path

The order composer in `shared/wa.js` is already written and tested, so the
cart page is wiring, not design.
