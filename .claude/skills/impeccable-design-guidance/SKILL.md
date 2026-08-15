---
name: impeccable-design-guidance
description: Improve AI-generated frontend design through structured design context, visual critique, accessibility and responsive checks, and targeted refinement commands. Use when creating, reviewing, redesigning, or polishing websites and app interfaces with Claude Code, Codex, Cursor, or another AI coding assistant.
---

# Impeccable Design Guidance

Use this skill to make AI-generated interfaces feel intentional, distinctive, usable, and production-ready rather than template-like.

## Core workflow

Follow this sequence when designing or improving an interface:

1. **Understand the product.** Identify the audience, user goal, surface type, brand personality, content hierarchy, technical constraints, and primary conversion or task outcome.
2. **Define design context.** Record the product lane, visual direction, typography, color roles, spacing rhythm, component rules, voice, anti-references, and examples of what the design must avoid. Store durable decisions in `PRODUCT.md` and `DESIGN.md` when working in a project repository.
3. **Shape before coding.** Plan the information architecture, interaction model, page hierarchy, responsive behavior, states, and content before implementing visual details.
4. **Build with a coherent system.** Use a small, intentional set of type sizes, spacing values, radii, colors, shadows, and component variants. Prefer semantic tokens over one-off styling.
5. **Review visually in the browser.** Inspect the result at mobile, tablet, and desktop widths. Compare hierarchy, density, alignment, interaction clarity, contrast, and visual rhythm against the intended design context.
6. **Refine in focused passes.** Apply the smallest relevant refinement pass—layout, typesetting, color, motion, copy, accessibility, responsive behavior, performance, or edge-case hardening—then recheck the whole page.
7. **Ship only after quality checks.** Confirm keyboard access, focus visibility, readable contrast, responsive layouts, loading and error states, text overflow, reduced-motion behavior, and consistent interaction feedback.

## Command vocabulary

When an AI coding tool supports slash commands, use the following command pattern:

```text
/impeccable <command> <target>
```

Use these commands according to the task:

| Command | Use it for |
|---|---|
| `init` | Establish product and design context for a project. |
| `craft` | Plan and build a complete surface with visual iteration. |
| `shape` | Define UX, hierarchy, and interaction structure before coding. |
| `document` | Derive a design system document from an existing interface. |
| `extract` | Identify reusable components and design tokens. |
| `critique` | Review hierarchy, clarity, usability, and emotional resonance. |
| `audit` | Check accessibility, responsiveness, performance, and technical quality. |
| `polish` | Perform a final design-system and shipping-readiness pass. |
| `layout` | Correct spacing, alignment, hierarchy, and visual rhythm. |
| `typeset` | Improve font choices, scale, line length, hierarchy, and readability. |
| `colorize` | Introduce or rebalance purposeful color roles. |
| `clarify` | Improve unclear interface copy and labels. |
| `animate` | Add purposeful motion with restrained timing and reduced-motion support. |
| `adapt` | Improve behavior across device sizes and input modes. |
| `harden` | Handle errors, loading, empty, overflow, internationalization, and edge states. |
| `optimize` | Improve frontend performance without damaging the experience. |
| `bolder` | Increase visual distinction when the design is too generic or quiet. |
| `quieter` | Reduce visual noise when the design is too loud. |
| `distill` | Remove unnecessary decoration and complexity. |
| `onboard` | Improve first-run, empty-state, and activation flows. |
| `delight` | Add small, appropriate moments of personality or feedback. |
| `overdrive` | Add technically ambitious visual effects only when they serve the product. |
| `live` | Iterate through visual variants directly in the browser. |

If the environment does not support slash commands, translate the same vocabulary into explicit instructions and execute the appropriate design pass manually.

## Rules to prevent generic AI design

Avoid defaulting to the same patterns across every project. Do not use Inter, Arial, or system fonts automatically; choose typography that fits the product. Do not rely on purple-to-blue gradients, gray text on saturated backgrounds, pure black and gray without a reason, excessive rounded cards, nested cards, decorative icon tiles above every heading, or arbitrary animations. Use visual variety only when it supports hierarchy and brand identity.

Prefer one strong visual idea over many competing effects. Establish a clear focal point above the fold, make primary actions unmistakable, and give supporting content an intentional order. Use cards only when grouping or interaction requires them. Use borders, shadows, and radii as a coordinated system rather than independently on every element.

## Review checklist

Before considering a surface complete, verify the following:

- The page communicates its purpose and primary action immediately.
- Typography has a deliberate family, scale, weight, line-height, and measure.
- Color has semantic roles and sufficient contrast in every state.
- Layout has a consistent spacing rhythm and does not feel over-cardified.
- Components share tokens and predictable interaction patterns.
- Mobile layouts are designed rather than merely compressed.
- Hover, focus, active, disabled, loading, empty, error, and success states exist where relevant.
- Keyboard navigation, focus visibility, labels, landmarks, and reduced motion are handled.
- Long text, localization, narrow screens, zoom, and dynamic content do not break the layout.
- Images, icons, and animation reinforce meaning instead of adding noise.
- A final browser review has been completed at representative viewport sizes.

## Recommended usage with Claude Code

For a new project, install the upstream Impeccable package when network access and project policy permit:

```shell
npx impeccable install
```

Then initialize the project context and work in focused passes:

```text
/impeccable init
/impeccable shape the landing page
/impeccable craft the homepage
/impeccable critique the homepage
/impeccable audit the homepage
/impeccable polish the homepage
```

Treat the upstream repository as the implementation reference and this skill as the operating guidance. Do not claim that the skill itself installs or runs the upstream package unless the package has actually been added to the project.

## Where this applies in this repo

The Agency OS console (`agency-os/client/src`) is the surface this is for:
admin workspace, client portal, onboarding, project detail. Durable decisions
belong in `PRODUCT.md` and `DESIGN.md` at the repo root, not in this file.

Two findings from that codebase, kept here because they are the kind of thing
this skill exists to catch:

- A control that does nothing when pressed is worse than no control. Four
  `MoreHorizontal` buttons, a bell and an avatar chip shipped inert.
- A label that is not associated with its input is not a label. `Field` now
  threads a `useId()` through to the control it names.

## References

- Upstream repository: https://github.com/pbakaus/impeccable
- Official documentation: https://impeccable.style/
- Sound design for the campaign films: `voiceover-skill-mastery/references/SOUND.md`.
  The Reels sound-effects workflow that shipped inside this skill has moved
  there, next to the pipeline that actually places the cues.
