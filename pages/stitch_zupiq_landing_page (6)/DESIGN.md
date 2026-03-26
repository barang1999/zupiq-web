# Design System Specification: Chromatic Intelligence

## 1. Overview & Creative North Star: "The Prismatic Neuralist"
This design system moves beyond the static "dashboard" look of 2020s SaaS and into a high-energy, editorial realm. Our Creative North Star is **The Prismatic Neuralist**. We are building a digital environment that feels like a conscious entity—vibrant, translucent, and perpetually in motion.

To achieve a "signature" look, we reject the rigid, boxed-in layout of standard apps. Instead, we embrace:
*   **Intentional Asymmetry:** Off-setting headlines and using staggered card layouts to break the "template" feel.
*   **Layered Translucency:** Treating the UI as a series of floating, refractive glass planes.
*   **Chromatic Depth:** Using light itself (gradients and blurs) rather than lines to define the space.

---

## 2. Colors: The Spectrum of Thought
This system thrives on the high-contrast relationship between a deep, void-like background (`#060e20`) and hyper-saturated kinetic accents.

### The "No-Line" Rule
**Standard 1px solid borders are strictly prohibited for layout sectioning.** To define a new section, use a background shift. 
*   Place a `surface_container_low` section directly against the `surface` background. 
*   Use the `surface_container_highest` (`#192540`) for interactive elements to create natural prominence without an "outline."

### Surface Hierarchy & Nesting
Treat the UI as physical layers of frosted glass.
*   **Level 0 (Base):** `surface_dim` (#060e20) for the primary application canvas.
*   **Level 1 (Sections):** `surface_container_low` (#091328) for large content areas.
*   **Level 2 (Objects):** `surface_container` (#0f1930) for cards and modular pieces.
*   **Level 3 (Interactive):** `surface_container_highest` (#192540) for active states.

### The "Glass & Gradient" Rule
Floating elements (Modals, Navigation Bars) must utilize a **Glassmorphism** effect:
*   **Fill:** `surface_variant` (#192540) at 60% opacity.
*   **Effect:** `Backdrop-blur: 20px`.
*   **Signature Texture:** Use a 45-degree linear gradient for primary actions, transitioning from `primary` (#a1faff) to `secondary` (#ff51fa) or `tertiary` (#f3ffca). This creates a "glow" that feels powered by the AI itself.

---

## 3. Typography: Editorial Sophistication
We pair the technical precision of **Inter** with the aggressive, futuristic geometry of **Space Grotesk** for high-impact display moments.

*   **Display & Headlines (Space Grotesk):** These are our "Voice." Use `display-lg` (3.5rem) with tight tracking (-0.04em) for hero moments. The stark contrast between `on_surface` text and the vibrant background creates an authoritative, modern feel.
*   **Body & Titles (Inter):** These are our "Logic." Inter provides high legibility for AI-generated insights. Use `body-lg` (1rem) for core educational content to ensure a comfortable reading rhythm.
*   **Labels (Inter):** Use `label-md` (0.75rem) in `on_surface_variant` (#a3aac4) for metadata, ensuring it recedes visually compared to primary content.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too heavy for this aesthetic. We define depth through light and stacking.

*   **The Layering Principle:** Instead of a shadow, place a `surface_container_lowest` (#000000) element inside a `surface_container_high` (#141f38) area to create a "recessed" or "inset" look.
*   **Ambient Shadows:** If a floating element requires a lift (e.g., a hovering card), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. To add "soul," add a second, very faint shadow using the `primary` color at 5% opacity.
*   **The Ghost Border:** If accessibility requires a stroke (e.g., input focus), use the `outline_variant` (#40485d) at 20% opacity. Never use 100% opaque borders.

---

## 5. Components: Prismatic Primitives

### Buttons
*   **Primary:** A vibrant gradient from `primary` to `secondary`. Text is `on_primary` (#006165) for maximum contrast. Radius: `full` (9999px).
*   **Secondary:** A transparent glass pill. `surface_variant` at 40% opacity with a `backdrop-blur`. 
*   **Tertiary:** Text-only using `tertiary` (#f3ffca) with a slight `0.35rem` (1) bottom padding.

### Input Fields
*   **State:** No background fill. Only a `surface_container_high` bottom border (2px). 
*   **Focus:** The border transitions to a `primary` to `secondary` gradient.
*   **Error:** Use `error_dim` (#d7383b) for text and helper icons.

### Neural Cards
*   **Constraint:** Forbid all divider lines.
*   **Structure:** Use vertical white space `spacing.6` (2rem) to separate header and body. 
*   **Visual Interest:** Use a "Glow Corner"—a small, low-opacity radial gradient of `tertiary` in the top-right corner of the card to signify "AI-active" content.

### Floating AI Orb (Signature Component)
*   A 1:1 aspect ratio container with `radius: full`.
*   Background: `primary_container` (#00f4fe).
*   Effect: A persistent pulse animation using `box-shadow` that cycles through `primary`, `secondary`, and `tertiary` colors at low opacity.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use asymmetrical margins. A 24px left margin and 40px right margin can make a list feel more "editorial."
*   **Do** lean into the "Vibe." If a screen feels too dark, add a large, blurred "blob" of `secondary_container` (#a900a9) at 10% opacity in the background.
*   **Do** use the `full` roundedness scale for interactive elements to contrast the sharp edges of the typography.

### Don't
*   **Don't** use pure white (#FFFFFF) for text. Always use `on_surface` (#dee5ff) to keep the "dark mode" eye-strain low.
*   **Don't** use dividers. If two items are too close, increase the spacing to `spacing.8` (2.75rem) or shift the background tone.
*   **Don't** use standard "Material" shadows. If it looks like a standard Android app, you have failed the aesthetic.