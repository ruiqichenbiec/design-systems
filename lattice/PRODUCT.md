# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

three.js and WebGL2; deliverables stay as close to a single offline HTML file as practical. Plain ES modules, no framework. three.js is a pinned dependency bundled into the build (no CDN at runtime). Components should look spectacular **and** stay deeply interactive.

## Users

- **Primary: visitors of a personal site** — researchers, engineers, academics and game developers who judge depth, originality and craft within a few minutes.
- **Secondary: the public** — WebGL animations built from this system's components (videos, clips, standalone pages).
- **Tertiary: the site owner**, reusing the components for future sites, demos and showcase videos.

## Product Purpose

A reusable design system for a personal website and WebGL showcase pieces. Success: a visitor leaves remembering one live interaction and the idea "this is built from first principles"; new pages and publishable animations come from the same parts without redesign.

## Positioning

The content it is made for is a dependency graph: axioms → definitions → theorems, specs → plans → agents, data → factors → strategies, rules → systems → games. The system's interactions dramatize *derivation* — things assembling from primitives under visible rules — which a generic dev-portfolio kit cannot truthfully copy.

## Operating Context

- Bilingual (中文 first, English for professional audiences).
- Viewed on a 14" laptop (primary) and phones, on mid-range GPUs.
- Showcase pieces can be recorded to video with deterministic frame rendering — components support a seeded, time-driven mode.

## Capabilities and Constraints

- Genuinely 3D where 3D is claimed: real geometry, camera movement, physics. No flat imitations.
- Performance is a feature: target 60 fps on a laptop iGPU / mid GPU; degrade gracefully (DPR caps, particle budgets, reduced motion).
- Sound feedback is opt-in and synthesized (no audio assets).
- Offline-first; no network dependency at runtime except optional web fonts with local fallbacks.
- Demo content in the showcase is synthetic and labeled.

## Brand Commitments

- **Direction: 粒子点阵 / particle field.** Thousands of points in 3D space gather into text, models and diagrams, scatter and recombine.
- **Signature pages:** (1) a topic/theorem dependency graph flowing down the background like a waterfall; (2) a dependency tree growing in frame.
- A distinct world from the sibling system **透镜 Lens** (optics: refraction, glow, liquid).
- Bilingual product names.

## Product Principles

1. **Derive, don't decorate** — every effect shows something being built from parts under a rule.
2. **Interaction is the proof** — each showcase moment responds to the visitor, not just plays.
3. **Real or nothing** — real 3D, real physics, real performance; no cheap imitation.
4. **One grammar, many recombinations** — components share primitives so new pages and videos come from recombination.
5. **Rigor is legible** — numbering, dependencies and states are visible, like a well-typeset proof.

## Accessibility & Inclusion

`prefers-reduced-motion` must yield a fully usable static rendition; all interactions keyboard-reachable; text never rendered only inside WebGL.
