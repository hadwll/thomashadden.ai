Ticket / Design Spec — Background and Ambient Glow System Only
Project

Thomas Hadden public site

Objective

Replace the current flat background treatment with a layered premium visual atmosphere that moves the implemented site closer to the supplied mockups.

This work is limited to background and ambient lighting treatment only.

The purpose of this ticket is to improve:

page atmosphere
depth
environmental glow
subtle technical richness
section-level/background-level illumination

This ticket must not redesign cards or alter component box styling.

1. Scope
In scope

This ticket may:

add or refine full-page atmospheric background layers
add theme-aware background gradients
add global ambient glow layers
add faint technical texture overlays
add localized bloom behind major cards or sections
add subtle shell-level perimeter atmosphere
tune background-layer blur, opacity, spread, placement, and responsiveness
implement separate dark and light theme background variants
reduce or simplify these effects for mobile where appropriate
Out of scope

This ticket must not:

change card border radius
change card padding
change card shadows
change card borders
change component spacing
change layout
change section structure
change container sizing
change typography
change icon sizing
change button styling
change nav spacing or structure
restyle card internals
restyle section internals
add component-level hover redesign unrelated to background atmosphere
Critical scope guard

Phrases such as “card-adjacent bloom” or “section-level highlight treatment” refer only to environmental/background illumination placed behind surfaces.

They do not permit changing the visual design of the card or section component itself.

Bloom added in this ticket must behave as:

background support
ambient light
behind-surface atmosphere

It must not behave as:

a replacement for card shadow styling
a new card border treatment
a card redesign
a component spacing adjustment
a change to the card box model

The ownership boundary must remain clean:

this ticket improves the page environment around components
a different ticket can later own card surface styling, border glow styling, or shadow refinement
2. Current Gap to Close
Dark mode

The current dark implementation reads as:

mostly flat deep navy
clean but visually plain
little atmospheric depth
little or no surrounding bloom
no premium luminous field behind content
little or no technical background richness

Compared to the mockup, the missing feeling is:

illuminated environment
blue depth
subtle energy around major regions
layered richness behind the UI
Light mode

The current light implementation reads as:

mostly flat pale surface
clean but plain
not luminous enough
no subtle technical background presence
no soft blue-white environmental glow

Compared to the mockup, the missing feeling is:

soft radiance
airiness with technical polish
faint cool illumination behind major content
Mobile

The current mobile implementation is structurally solid but still too flat.

Compared to the mockup language, mobile needs:

a reduced but still present atmospheric background
background support behind the main content region
subtle integration between top area, content area, and bottom nav zone
3. Goal State

The page should no longer feel like content placed on a flat fill.

It should feel like content sits within a softly illuminated technical environment.

The result should feel:

premium
restrained
modern
engineered
atmospheric
polished

It should not feel:

neon
cyberpunk
game-like
overly decorative
visually noisy
4. Recommended Hybrid Background System

Implement the effect as three coordinated layers:

Layer A — Atmospheric base field

A full-page background field that gives the site depth before any content is considered.

This layer should use:

deep gradient base in dark mode
pale luminous gradient base in light mode
several large blurred radial glow fields

Purpose:

remove the flat background feeling
create global atmosphere
support the rest of the visual stack
Layer B — Technical texture overlay

A very subtle pattern layer above the base field and behind content.

This layer should use:

faint circuit-like traces
sparse technical linework
subtle node/connector motifs
low opacity
theme-specific variants if needed

Purpose:

add technical richness
support the industrial AI theme
make the background feel designed, not merely colored
Layer C — Local ambient bloom behind major regions

A set of localized environmental glow treatments placed behind important cards/sections.

This layer should use:

soft bloom behind major section zones
corner or edge-adjacent background light pools
stronger support behind hero and major CTA zones
weaker support behind secondary regions

Purpose:

help major surfaces feel embedded in the page
create premium depth and emphasis
echo the soft blue halo language visible in the mockups

Again: this layer is behind the surfaces only. It must not restyle the card or section component itself.

5. Page Background Specification
5.1 Dark theme base

The dark theme must not be a flat navy or pure black field.

Use:

a deep navy-to-near-black gradient base
subtle tonal variation across the page
large diffuse blue glows placed asymmetrically

The dark page should feel like:

midnight navy
slightly misted with cool light
subtly energized
expensive and controlled

Avoid:

pure black as the dominant visible color
bright cyan everywhere
purple-heavy tones
hard-edged spotlight shapes
5.2 Suggested dark glow placement

Use a few large blurred radial glow sources in positions such as:

upper left behind brand/header zone
upper right behind primary CTA zone
central glow behind hero/main content region
lower-middle or lower-right supporting content sections
very subtle footer-adjacent haze

These must be soft, large, and asymmetrical.

5.3 Light theme base

The light theme must not be a flat light grey or plain white app shell.

Use:

a very pale blue-white gradient base
soft luminous cool fields
low-contrast radial glows
subtle tonal drift across the page

The light page should feel like:

airy
luminous
cool
technical
premium

Avoid:

washed-out flat grey
stark white emptiness
saturated cyan bloom
glossy over-bright effects
5.4 Suggested light glow placement

Mirror the dark theme composition, but with lower intensity:

top-left/top-right soft atmospheric support
center support behind main content
lower content-band haze very subtly
minimal footer support
6. Technical Texture Overlay Specification
Purpose

The texture layer should create subtle technical richness similar to the mockups.

It should imply:

engineered systems
digital infrastructure
technical intelligence

It should remain subordinate to content at all times.

Texture style

Preferred motifs:

faint circuit traces
thin lines
sparse nodes
short connector runs
abstract technical geometry

Avoid:

dense motherboard art
obvious wallpaper tiling
high-contrast network diagrams
decorative illustration dominating the page
Implementation preference

Preferred order:

low-opacity SVG overlay
multiple sparse SVG fragments placed by region
CSS-only fallback if needed
Opacity requirement

The texture must be subtle enough that:

it is not the first thing the eye notices
text contrast remains clean
the site still reads as premium and restrained

Dark mode can carry slightly more texture than light mode.
Light mode texture should be especially faint.

7. Local Ambient Bloom Behind Major Regions
Purpose

The mockups feel premium because key content regions are supported by soft environmental illumination.

This ticket should recreate that support behind major regions.

Allowed treatment

This ticket may add bloom behind:

hero/main content area
intro content block area
featured work region
about region
research region
AI-readiness/CTA region
footer zone very subtly if beneficial

This bloom must be:

behind the surface
broad and feathered
low-opacity
restrained
theme-aware
Not allowed

This ticket must not:

put the bloom on the card surface itself in a way that changes the card styling
replace component shadows
alter border shape
adjust padding to “make room” for glow
change section spacing to fit the effect
create new visible border treatments on the card itself
Directionality

Where useful, bloom may gather:

near lower edges
near curved corner regions
around the general perimeter behind large surfaces

But this should remain environmental, not component restyling.

8. Outer Shell / Page Perimeter Atmosphere

The page shell itself can receive a very subtle atmospheric lift to better match the mockup.

Allowed treatment:

faint perimeter illumination
soft blue pooling near large curved corners in dark mode
softer cool-white/ice-blue perimeter support in light mode
very restrained halo around the outer shell

Not allowed:

changing shell radius
changing shell border thickness
changing layout spacing to emphasize the perimeter
turning the shell into a bright neon frame

The shell should feel softly energized, not outlined.

9. Intensity Hierarchy

Glow and atmospheric support must follow hierarchy.

Strongest support

Use the strongest background emphasis behind:

hero/main focal area
primary CTA/readiness area
Medium support

Use medium emphasis behind:

featured work region
about region
research region
Lightest support

Use the weakest emphasis behind:

footer
minor secondary regions
small utility areas

Do not distribute the same glow strength everywhere.

The page must preserve hierarchy and calm.

10. Mobile Rules

Mobile should preserve the same visual language with reduced complexity.

Mobile implementation guidance
keep the same atmospheric base idea
reduce the number of visible glow fields
simplify texture placement
use only one or two meaningful local bloom anchors
ensure background effects do not compete with readability or bottom navigation
Mobile must not
add clutter
add excessive hotspots
feel busy or overdesigned
rely on strong glow intensity to compensate for small space
11. Performance Guidance

Use a lightweight layered system.

Preferred implementation approach:

CSS gradients for base field
a small number of large blur layers
low-opacity SVG texture overlay
reusable utilities or theme tokens for bloom placement/intensity

Avoid:

large numbers of small blurred elements
expensive continuous animation
heavy canvas/WebGL work for this ticket
full-screen motion effects

This ticket is about visual depth, not animation spectacle.

12. Acceptance Criteria

This ticket is complete only if all of the following are true.

Background atmosphere
the page no longer reads as a flat dark fill in dark mode
the page no longer reads as a flat pale fill in light mode
there is visible but restrained atmospheric depth in both themes
Technical richness
a faint technical texture layer is present
the texture is subtle and does not compete with content
the texture supports the industrial/AI visual language
Local background support
major content regions feel supported by environmental bloom behind them
the strongest background emphasis is reserved for the most important regions
secondary regions receive weaker support
Scope discipline
no card border radius has changed
no card padding has changed
no card shadow styling has changed
no card border styling has changed
no component spacing has changed
no layout or sizing has changed
no component redesign has been introduced under the guise of background work
Overall feel
the result is closer to the mockups in atmosphere
the result feels premium and restrained
the result does not feel neon, noisy, or game-like
13. Definition of Done

The work is done when:

the background alone clearly carries more atmosphere, depth, and premium polish
major sections feel more embedded in the page environment
both themes feel intentionally lit rather than flat
mobile preserves the same visual language at reduced intensity
the implementation stays strictly within background/environment ownership
no component box styling has been changed
14. Explicit Agent Instruction

Do not use this ticket to redesign cards.

If bloom is needed near a card or section, place it in the background layer behind that surface using environmental treatment only.

Do not change:

radius
padding
borders
shadows
spacing
component layout

If a stronger card-surface glow, border effect, or surface treatment appears necessary, stop and flag it as follow-on work for a separate ticket rather than implementing it here.