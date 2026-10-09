---
name: Empresa de Servicios Generales
description: Sitio editorial y visual para explorar instalaciones y mantenimiento.
colors:
  primary: "#236955"
  primary-deep: "#184b3d"
  accent-lime: "#d4f542"
  neutral-bg: "#edf0e9"
  neutral-bright: "#f7f8f4"
  ink: "#16231e"
  muted: "#56645d"
  dark-bg: "#111914"
  dark-surface: "#1b2520"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(3.1rem, 7.4vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.14em"
    lineHeight: 1.4
rounded:
  square: "0px"
  pill: "999px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "13px 20px"
    height: "55px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-bright}"
    rounded: "{rounded.pill}"
    padding: "13px 20px"
    height: "55px"
  service-image:
    rounded: "{rounded.square}"
---

# Design System: Empresa de Servicios Generales

## Overview

**Creative North Star: "Un edificio en movimiento"**

The homepage reads like a guided walk through a working space. A full-bleed construction photograph introduces the work; on desktop, trade photographs stay anchored while each chapter's copy moves past them. The scroll reveals the materials and work that keep homes and business spaces useful. The interface is an editorial service story, not an ecommerce dashboard.

The experience balances confident condensed headlines with calm body copy, broad photographic scenes and measured technical labels. Stock photos are explicitly identified as illustrative and are not presented as company projects. The catalog, client account, cart, API, authentication and existing contact destinations remain application features, not proof of service capability.

**Key Characteristics:**
- Vertical, image-led service narrative.
- Evergreen and mineral surfaces with one citron accent.
- Barlow Condensed display typography and DM Sans body text, served locally.
- Pinned photo chapters on desktop, with a natural-flow mobile fallback.
- Viewport reveals and a restrained process-step stagger.
- Desktop-only hero drift and pointer-only image feedback.
- Reduced-motion and Save-Data paths that remove nonessential movement.
- Existing account and commerce behavior remains wired to its original DOM hooks.

## Colors

The palette pairs an earthy green work surface with mineral neutrals and a high-visibility lime accent.

### Primary
- **Workshop Green**: Main headings' emphasis, navigation states and section labels.
- **Deep Green**: Dark service chapters, footer and the client-access section.
- **Signal Lime**: Primary actions, hero emphasis and compact state markers.

### Neutral
- **Mineral Paper**: Main light-mode ground.
- **Clean Chalk**: Raised light surfaces and text on dark fields.
- **Work Ink**: Primary text on light surfaces and dark action buttons.
- **Field Note**: Supporting copy and descriptions.
- **Night Ground**: Dark-mode page background.
- **Night Surface**: Dark-mode alternate section surface.

### Named Rules
**The One Signal Rule.** Lime is reserved for a decisive action, title emphasis or a small wayfinding cue; it does not flood every section.

**The Honest Work Rule.** Stock photography is captioned as illustrative. Never imply it depicts company work or customers.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, sans-serif fallback)
**Body Font:** DM Sans (with Segoe UI, sans-serif fallback)
**Label Font:** DM Sans

**Character:** Compressed uppercase headlines carry the scale and energy of physical trade signage. DM Sans keeps instructions and longer descriptions open and readable.

### Hierarchy
- **Display** (800, fluid up to 13.5rem, 0.74 line-height): The two-line service identity in the opening scene.
- **Headline** (700, fluid 3.1rem–7rem, 0.9 line-height): Section and service-scene titles.
- **Title** (700, 2rem, 1 line-height): Process steps and compact labels.
- **Body** (400, 1rem, 1.7 line-height): Service explanations and supporting copy; keep paragraphs near 65ch.
- **Label** (700, 0.72rem, tracked uppercase): Navigation context, captions, scene numbers and eyebrow labels.

### Named Rules
**The Two-Voice Rule.** Use the condensed face for large editorial titles only; use DM Sans for paragraphs, navigation, controls and labels.

## Layout

The homepage is one continuous vertical scroll-world. On desktop, each 145svh service chapter anchors its image near the top while the copy travels alongside it; the next chapter takes over as the visitor continues down. Tablet and mobile use normal document flow with image-first chapters, preserving reading order and avoiding overlays. Full-width scenes, an editorial intro, client section, process and contact close create pacing. The main reading width is capped around 1440–1500px, while hero and color fields span the viewport.

The desktop service scenes alternate image position. At tablet and mobile widths they become a single column with the image first. The main CSS breakpoints are 1100px, 800px and 480px. Controls remain visible and touch-sized; the document must not scroll horizontally at common viewport widths.

## Elevation & Depth

Depth comes from image cropping, dark photographic overlays, tonal section changes and solid accent fields. Cards are not the page structure. Keep service photography unframed and square-edged; use borders only as dividers. Avoid glow shadows and decorative glass effects.

## Shapes

Service photography and chapter surfaces use square corners. Primary actions are pill-shaped. Small chapter stamps are circular and used only as navigation cues. Keep this distinction consistent.

## Components

### Buttons
- **Shape:** Pill silhouette.
- **Primary:** Lime ground with dark text for the main action.
- **Secondary:** Chalk ground over photography; dark ink on lime fields.
- **Hover / Focus:** Directional arrow shift on hover; a visible high-contrast focus ring for keyboard users.
- **Active:** Small press response; no elastic or bouncing motion.

### Chips
- **Style:** Compact rounded controls with a transparent unselected state.
- **State:** Selected filters use the lime ground and dark text in both themes.

### Cards / Containers
- **Corner Style:** Service imagery remains square; avoid generic feature-card grids.
- **Background:** Sections use mineral paper, chalk or deep green fields.
- **Border:** Fine dividers organize lists and contact links.
- **Internal Padding:** Generous outer space; list rows use compact, consistent vertical rhythm.

### Navigation
- Sticky mineral header with dark labels, restrained borders and a compact brand mark.
- Mobile navigation opens as a full-width inset list; keep the brand and all utility actions inside the viewport.

### Service Scene
A large trade photograph and a clear text column form one chapter. Desktop pins the photograph as copy moves through a long scroll track; CSS view timelines add restrained image depth where supported. Section copy reveals through the existing IntersectionObserver with a small process-list stagger. Images get a restrained tonal response only on hover-capable pointers. At narrower widths the image returns to normal flow. Reduced-motion and Save-Data preferences disable pinning and nonessential movement; content stays visible if JavaScript is unavailable.

## Do's and Don'ts

### Do:
- **Do** use the lime accent for primary calls to action and small wayfinding details.
- **Do** serve Barlow Condensed and DM Sans from `frontend/assets/fonts/`.
- **Do** preserve the existing account, cart, filter, API and theme hooks when changing page structure.
- **Do** keep the dark theme readable with the same accent and reversed mineral surfaces.
- **Do** verify service names with the company before publishing them as confirmed offerings.

### Don't:
- **Don't** present stock images as company jobs; image captions must say they are illustrative.
- **Don't** invent credentials, certifications, customer quotes, response times, prices or warranties.
- **Don't** build the service story out of uniform cards or dashboard panels.
- **Don't** use gradients in text, persistent auto-scrolling copy or motion without a reduced-motion path.
