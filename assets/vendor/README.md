# Vendored runtime code

## `anime.esm.min.js`

[anime.js](https://github.com/juliangarnier/anime) v4.5.0, MIT, pinned to
upstream `2c9cf8e`. Zero dependencies of its own.

**Vendored, not loaded from a CDN.** Same reasoning CLAUDE.md section 3 gives
for pulling Firebase from Google's own servers: a page that cannot render until
a third party responds is a page that breaks when they have a bad day. Here it
is one `<script type="module">` away from the origin already serving the HTML.

**This is the first runtime dependency this repo has ever had**, and section 11
says not to add one without saying why and getting a yes. The yes was explicit:
smoother motion on the home screen. It costs ~40 KB gzipped, it is loaded only
by `/home-v2`, and it is deferred — the page renders, and is readable, before
it arrives. Nothing else imports it.

To update: copy `dist/bundles/anime.esm.min.js` from a fresh clone and record
the new commit here.
