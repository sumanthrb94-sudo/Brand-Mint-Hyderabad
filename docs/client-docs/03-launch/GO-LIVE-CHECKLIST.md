# Go-Live Checklist

Internal. Nothing on this list is optional.

## Before you ask for final payment
☐ All UAT defects fixed and re-tested
☐ Playwright suite green
☐ Client sign-off received in writing
☐ Any change requests approved and invoiced

## Payment gate
☐ Final invoice sent
☐ **Payment cleared** — check the bank, not the screenshot

> Nothing below this line happens before the money is in.

## Accounts — all in the client's name
☐ Domain
☐ Hosting
☐ Razorpay, activated and live keys in place
☐ SMS/OTP provider, credits loaded
☐ Email service, sending domain verified
☐ Google Analytics

## Technical
☐ Live environment variables set, no test keys anywhere

> **Live keys go into the client's own hosting environment and nowhere else.**
> Not into a repo, not into a chat, not into the Brand Mint portal, not into a
> note. Prefer having the client paste them into their own dashboard while you
> watch. If you do handle one, it exists in exactly one place when you are
> finished — and if it ever went through a chat or a file, treat it as spent
> and have it rotated before launch.
☐ Razorpay switched from test to live mode
☐ Test transaction on live, then refunded
☐ SSL active
☐ Canonical URL points to the live domain, not staging or a preview URL
☐ Staging blocked from search engines, live site not
☐ sitemap.xml and robots.txt
☐ 404 page
☐ Analytics firing
☐ Backups running and a restore tested once
☐ Error monitoring on
☐ Uptime monitoring on

## Content
☐ Privacy Policy, Terms, Refund Policy, Shipping Policy all published
☐ Contact details and business address correct
☐ The **client's** GST number displayed where required (theirs, on their store — not ours)
☐ No placeholder text or dummy images anywhere
☐ Every product has an image and a price

## DNS switch
☐ Note the current DNS settings before changing anything
☐ Point domain, wait for propagation
☐ Test the full purchase journey on the live domain
☐ Test on a phone, on mobile data, not office wifi

## After launch
☐ Handover pack sent
☐ Walkthrough video recorded and sent
☐ Admin training call done
☐ Warranty start and end dates confirmed in writing — 30 days, or **60 on Commerce**
☐ Care Plan offered
☐ Testimonial requested — ask now, while they're happy
☐ Watch the site for 48 hours
