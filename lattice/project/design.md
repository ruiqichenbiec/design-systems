# Design System: 点阵 Lattice

## Overview

**Creative North Star: "The Living Lattice"**

Every page stands on one lattice of dots. Nothing is decoration: a name is a set of lit lattice sites, a theorem is a cluster of points, a dependency is a stream of points falling from a premise into what it proves, a proof is a tree of points growing from its conclusion up to its axioms. Interaction is always a map from one set to another. Points are released one by one into a divergence-free ABC flow and then pulled into their new set by springs, so every transition pours instead of cutting.

The system was built for a personal site and for publishable WebGL clips. It speaks to professionals (quant, AI and agent engineering, mathematics, games) who judge depth quickly, so the spectacle always carries real content: the Lorenz attractor with its real parameters, a real dependency graph of real analysis, real proof trees. Night is the committed world: points of light on deep ink, with one warm signal and one cool signal.

It rejects the dark dev-portfolio default (a floating blob, a neon accent, a grid of project cards) and the generic "particles morph into random models" demo. Two worlds were explored and set aside: the bronze luopan formation (符阵) and the paper and ultramarine renditions of this lattice.

**Key Characteristics:**
- One GPU point field under the hero; smaller canvases of the same physics inside every control.
- Two signal colours with fixed meanings: orange for what a thing needs (and for action), ice blue for what it enables.
- Dot-matrix lettering (5×7 matrix, Doto) against a hyperlegible reading face.
- Real 3D: perspective camera stations, drag-to-rotate sets, depth-ordered streams.
- Sound is synthesized, quiet and opt-in: clicks, pentatonic plucks, filtered-noise whooshes, a chord when a proof completes.

## Colors

Near-black ink carries points of warm bone light; two signal hues mark direction and never mix roles.

### Primary
- **Signal Orange** (#ff5a1f): the only action colour and the "needs / upstream" colour. Accent buttons, active tab swarms, crystallised progress, hot (fast or melting) points, premises lit on hover, the heat ring. 5.9:1 on Ink Night.

- **Signal Orange Hover** (#ff7440): the accent button's hover state only.

### Secondary
- **Ice Blue** (#7fd8ff): "enables / downstream" only: descendants in the waterfall, sap flowing down a finished proof tree. 11:1 on Ink Night.

### Neutral
- **Ink Night** (#07080b): the page and the field's background.
- **Raised Ink** (#0d0f14): component specimens and the command palette surface.
- **Bone Point** (#ece7da): points at rest, headlines, primary button fill, body text.
- **Dim Point** (#9d988c): secondary text and leads (7:1 on Ink Night).
- **Faint Point** (#6c685f): disabled text and decoration only (3.6:1; never for body copy).
- **Hover White** (#ffffff): the primary button's hover state only (see The Bone-Not-White Rule).
- **Shadow Black** (#000000): only inside the two overlay shadows at 70–90% alpha, and as a mask colour.
- **Hairline** (rgb(236 231 218 / 0.14)) and **Strong Hairline** (/ 0.3): 1px insets on panels, ghost buttons, dotted rules.

### Named Rules
**The Two Directions Rule.** Orange means "needs" (upstream, premise, action); ice blue means "enables" (downstream, consequence). Never swap them and never introduce a third signal hue.

**The Bone-Not-White Rule.** Points and text are warm bone (#ece7da), never #fff; pure white appears only as the primary button's hover.

## Typography

**Matrix Font:** Doto 900 (5×7-style dot-matrix face), and the system's own 5×7 bitmap for text drawn as points
**Body Font:** Atkinson Hyperlegible Next (with Noto Sans SC, system-ui)
**Chinese:** Noto Sans SC 700

**Character:** The dot-matrix voice is the lattice speaking: captions, counters, gesture names, status lines. The reading voice was chosen for legibility at 12 px over moving points (the waterfall and tree labels), not for fashion.

### Hierarchy
- **Hero wordmark** (drawn as a particle set, 5×7 matrix at ×2): the name only. It is not a font and is always backed by an `<h1>` in the DOM.
- **Headline** (600, clamp(28px, 3vw, 40px), 1.1, −0.02em): section titles, with the Chinese title above in Noto Sans SC 700 orange at 0.6em.
- **Title** (600, 21px, 1.3): component and card titles.
- **Body** (400, 17px, 1.6): leads and prose, max 60ch.
- **UI** (500, 15px, 1.2): buttons, tabs, switches, navigation.
- **Note** (400, 14px, 1.45): specimen notes, card statements, hints.
- **Small** (400, 13px, 1.4): legends, footers, secondary metadata.
- **Label** (500, 12px): labels pinned to 3D points.
- **Matrix** (Doto 900, 15–16px, 0.06em): captions, statuses, gesture names.

### Named Rules
**The Matrix Size Rule.** Doto only at 15px and above. Below that, dot-matrix lettering turns to noise; use the body face.

**The Text-in-DOM Rule.** Text never lives only inside WebGL. Particle lettering is aria-hidden and mirrored by real text; 3D labels are DOM elements positioned over their points.

**The No-Stray-Selection Rule.** Dragging on the field never selects text: field sections are `user-select: none` and a drag the field claims cancels selection; panels and readable copy stay selectable.

## Layout

Full-bleed field stations alternate with scrolling content. The hero is one viewport: particle wordmark in the upper third, thesis and gesture legend lower-left, set caption with a matrix index and "Next set" lower-right. While the hero scrolls away, its lattice scrolls 1:1 with the page (the camera follows the section), so the wordmark never slides under the text; only after that do its points rain down into the waterfall. The page then runs: waterfall to explore (300vh, a small transparent note on the left), the tour (16 landmark results, one per two wheel notches, about 200px of scroll), the proof tree (grows when the camera arrives, with a progress bar in its panel), the proof sequence (one tree per ~110vh, a half-turn between trees), the instruments and the close. 3D subjects are shifted right with a camera view offset (0.17–0.2 of the width) so text and subject never overlap. The instruments section is an opaque two-column bench (1200px container, 18px gaps) that hides the field (the GPU pauses whenever no field section is on screen).

Spacing steps are 4, 8, 12, 16, 24, 32, 48, 64 and 96px, with more space above a heading than below. Below 760px: panels stop being sticky and scroll away so the waterfall and tree get the whole screen (the proof-sequence HUD stays sticky on a panel backing and the stand sits lower), the tour card moves below the node, the wordmark breaks onto two lines, the lattice is 46 columns and the field drops to 25,600 points.

## Elevation & Depth

Depth is spatial, not shadowed. It comes from the perspective camera, parallax on the pointer, points lifting off the lattice, and bloom on hot points (UnrealBloom, strength 0.55, threshold 0.62). Panels float on the field with a 1px hairline inset and a 10px backdrop blur. The only shadows are deep ambient ones under overlays (card: `0 18px 40px -20px rgb(0 0 0 / 0.7)`; command palette: `0 30px 80px -30px rgb(0 0 0 / 0.9)`).

### Named Rules
**The Light-Is-Heat Rule.** Glow is earned by energy: a point glows orange because it is fast, melting, lit or on a highlighted path, never as a resting decoration.

## Shapes

Actions are pills (999px). Panels and specimens have gently rounded corners (12px); small targets 6px. Every mark inside the field is a round point; lines exist only as dotted strands of points (dependencies, branches, dotted rules under inputs). Nodes carry their kind in shape: foundations are square blocks of dots, definitions are rings, theorems are filled Fibonacci discs, axiom leaves are five-petal rosettes.

### Named Rules
**The Point Rule.** If it is visible, it is made of points. No gradients, blobs or solid strokes as decoration; a line is a sequence of dots.

## Components

### The Field (signature)
- **What:** 65,536 points (25,600 on phones) simulated on the GPU. Each has a target in the current set; morphs release points in a sweep into an ABC flow, then springs pull them into the new set.
- **Sets:** the resting lattice, lit sites (dot-matrix text as living swarms), and 3D sets (Lorenz attractor, trefoil knot, FCC crystal, Klein bottle); any Float32Array of targets works.
- **Interaction:** the pointer is a field (push, swirl, wake). Holding melts the points around it (the cursor ring heats); letting go after melting maps to the next set. A tap is a shockwave. Dragging turns a 3D set.

### Waterfall (signature)
- A dependency DAG laid out by longest-path depth, premises above consequences, topics as depth lanes. Each edge is a strand of static dots plus falling droplets; background mist keeps falling between streams.
- **Hover:** premises light orange, consequences ice blue, everything else dims; a card shows the statement. **Click:** grow that result's proof tree.

### Waterfall tour (signature)
- The same waterfall, no side panel. Scrolling walks 16 landmark results in dependency order (depth, then left to right), one per two wheel notches (about 200px): each is "hovered" once, its premises light orange and its consequences ice blue, the camera glides to it and a card beside it gives the statement. A matrix counter (01–16) marks the place.

### Proof tree (signature)
- The DAG unfolded into a proof tree from a chosen conclusion (root at the base) up to its axioms (leaves). Shared lemmas appear once; later uses are ↺ references.
- Branch thickness is proportional to √leaves; growth runs by depth with bright tips; each bloom plucks a pentatonic note; when complete, sap runs back down in ice blue and a chord sounds. Drag to turn; click a node to re-root. It grows when the camera arrives (and again after you leave and return), and a progress bar beside it crystallises as the nodes bloom (`tree.progress()`).
- **Proof sequence:** in a scroll-driven section each scroll step shows the next theorem's proof with a rotation transition (`tree.swap(id)`): the stand turns half a revolution, the old tree falls as dust, the new one grows.

### Cursor halo
- A point with a set of 30 points around it. Over anything actionable (and on keyboard focus) the set re-forms along the control's rounded outline, which doubles as the focus indicator; pressing bursts it; holding on the field heats the ring. Fine pointers only; touch gets a plain ring for the heat.

### Buttons
- **Shape:** pills (999px), 44px tall, 0 20px padding, 15px/600 label.
- **Primary:** Bone Point fill, Ink Night text; hover goes to white.
- **Accent:** Signal Orange fill, near-black text. One per view.
- **Ghost:** transparent with a strong hairline inset; hover strengthens the inset.
- **Disabled:** transparent, Faint Point text, plain hairline.
- **Active:** scale(0.96).

### Tabs
- Real `role=tab` buttons with arrow-key support. The indicator is a 14×2 swarm under the selected tab; on change it pours to the new tab with a stagger and a short burst of flow.

### Switch
- `role=switch`. Off: 19 points float as a gas across the whole track, each on its own slow Lissajous path. On: they converge on the right and lock into an orange hexagonal crystal (each flashes as it locks), with an orange inset on the track. Turning off melts the crystal outward. A large variant (`.lx-switch--lg`, 136×54) is for demonstrations; `mountSwitch()` returns `{ set(on, { quiet }), on }`.

### Slider
- A native range input (invisible, on top) drawn as a row of dots: filled dots orange, unfilled dim, a seven-point orbiting thumb that pushes its neighbours aside.

### Progress
- `role=progressbar`, three rows of dots. Unfinished work is a gas floating loosely around the bar (smooth Lissajous drift). Each newly finished part is built from it: its points converge, lock into the lattice with a white flash, and stay fixed in orange. Indeterminate: a band of order sweeps through. Completion plays a chord.

### Matrix text & loader
- Matrix text reflows dot by dot between strings (shared strokes slide, the rest fly off or arrive). The loader is a single Lorenz trajectory drawn as a fading trail.

### Inputs / Fields
- **Style:** no box; a dotted rule (1px dots every 9px) under the text.
- **Focus:** the dots turn orange and flow along the rule.
- **Error:** the dots tighten to a 5px pitch in orange and the message below turns orange and says what is missing.

### Cards / Panels
- **Corner Style:** 12px. **Background:** Ink Night at 78% with a 10px backdrop blur. **Border:** 1px hairline inset. **Padding:** 26px (20px on phones).

### Command palette & toast
- ⌘K / Ctrl+K dialog on Raised Ink; the active row is marked by a small swarm that flows between rows. Toasts carry a dot-matrix tag that reflows into place.

### Navigation
- Fixed header: matrix monogram, section links with a Chinese character each (orange when current), sound and ⌘K ghost pills. It gains an ink gradient once the page scrolls; below 760px only the monogram and tools remain.

## Do's and Don'ts

### Do:
- **Do** make every visible effect out of points, and every transition a map from one set to another (release, flow, spring).
- **Do** keep orange for "needs / action" and ice blue for "enables" (The Two Directions Rule).
- **Do** use real mathematics or real data for every set and graph, labelled with its parameters (σ = 10, ρ = 28, β = 8/3).
- **Do** mirror all particle text in the DOM and keep controls' native roles and keyboard behaviour.
- **Do** keep the GPU idle when no field section is visible, and respect `prefers-reduced-motion` (morphs snap, the pointer field and auto-advance stop).

### Don't:
- **Don't** add decorative glow, gradients or blobs; glow is heat (The Light-Is-Heat Rule).
- **Don't** set Doto below 15px or use it for body copy.
- **Don't** use pure white for points or text.
- **Don't** put the reading text on top of the 3D subject; shift the subject with the camera view offset instead.
- **Don't** reintroduce the bronze formation or paper/ultramarine renditions as the default look; Night is the committed world.
