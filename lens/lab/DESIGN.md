# Lens

Soft, concentric rounded geometry, system typography, restrained chrome, directional specular light and transparent lenses.

The surface is an interactive material workbench. A light neutral shell frames a large, colorful optical stage and a compact material inspector. The work leads the first viewport. Pastel cyan, cobalt and peach belong to the sampled scene, not application status. Controls are semantic HTML over a WebGL canvas.

System sans with Chinese system fallbacks; body 16px, controls 14px, secondary metadata 12px. Main ink #202229, quiet ink #696d76, application background #f7f8fa. Chrome has 12–16px radii; material geometry deliberately uses 24–40px and capsules to reproduce the pinned reference.

Only scene motion is continuous. Controls settle with a damped spring. Reduced motion disables background autoplay and damps gesture feedback. User-requested lower transparency provides solid readable surfaces.

## Gesture and optical refinement

User requested jelly-like dragging, more components, dimensional background ribbons and quieter, more realistic light. A held card follows the pointer with damped translation, directional stretch and opposite-edge lag, then returns to its anchor. Slider and segmented-control values remain semantic and keyboard accessible. Free lenses retain their dropped position. Manual gesture motion is quieter under reduced-motion preferences; adjusting elasticity explicitly enables the requested gesture strength. No idle jiggle loop.

The renderer samples transformed local geometry, including parent transforms. Silhouette, normals, refraction and reflection all share the deforming field. Center transmission has less white tint; edge light is narrow and directional, supported by broad faint surface reflections. Background color sheets have grazing face highlights and soft contact shadows, with geometry generated only when the scene or resolution changes.

Verification covers spring settling/interruption, geometry bounds, pointer and keyboard gestures, desktop/mobile composition, and light/dark/grid materials in two bounded browser inspection passes.

## Bilingual states and feedback

Thick is the initial and reset material. Chinese and English share identical behavior and stable choice IDs. Explicit checkmarks support choice and preset selection alongside restrained tint, weight and outlines. On phones, choices use a full-width row so selection symbols never disappear.

The focus rail renders before its thumb in the same compositor. A bounded horizontal squash preserves the rail inset, and each glass element declares its own placement transform. Success, favorite, number changes, notifications and reset actions receive distinct short feedback; opacity is shared by the DOM and shader. There is no continuous decorative motion beyond the optional scene.

## Shared design system and sound

The canonical implementation lives in `design-system/`. `tokens.js` is the source for generated CSS and JSON; the public entry exports component factories, behavior binders, material presets, an audio service and lifecycle management. The original lab keeps only its page-specific composition and application state. See `design-system/DESIGN.md` for reusable component rules.

Quiet, original synthesized cues follow semantic commits and gesture boundaries. There is no hover sound or startup sound. Continuous input is rate limited, mute stops active and pending cues, and visual feedback remains authoritative. The live catalog uses the public package rather than a duplicate showcase implementation. Focus, disabled, selected, dark-scene and CSS fallback states belong to the component recipe.

Focus rings follow the last input modality. Keyboard input reveals them; pointer movement, pointer press, touch and trackpad/wheel gestures hide them immediately. Never blur the active control to remove its ring. The shared focus service is scoped to mounted roots and uses one listener set per document.
