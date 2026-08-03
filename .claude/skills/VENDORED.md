# Vendored skills

`ui-ux-pro-max` and `design-system` from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(MIT), pinned to upstream `4d140cf`.

Vendored rather than installed with `npm install -g ui-ux-pro-max-cli` for the
same reason the agent bench is (§9a): in the repo it is committed, diffable and
pinned, instead of living in a global directory that vanishes with the
container.

**Removed on the way in**, because nothing here needs them and both are the
kind of thing that should be a decision rather than a default:

- `design-system/scripts/fetch-background.py` — downloads stock photos from
  pexels.com. Hardcoded URL list, no API key, but it is still an outbound
  fetch this repo does not otherwise make.
- `*/scripts/*/generate.py` (3 files) — read an API key from the environment.
  §4: never collect a credential.

Everything kept is Markdown, CSV and local search scripts. No network calls, no
telemetry, no keys.
