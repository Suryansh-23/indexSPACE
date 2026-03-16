---
title: "Implementing Theming"
sidebar_position: 2
description: "Step-by-step guide to custom theming with all 30 token descriptions and preset comparison."
---

# Implementing Theming

#### Theme System

**Types**


| Type | Description |
| --- | --- |
| `FSTheme` | Full 30-token theme interface (9 core required, 21 optional derived tokens) |
| `ResolvedFSTheme` | `Required` — all 30 tokens guaranteed present |
| `FSThemeInput` | Flexible input: preset name string, full theme object, or partial with `preset` base |
| `ThemePresetId` | `'fs-dark' \| 'fs-light' \| 'native-dark' \| 'native-light'` |
| `ChartColors` | Concrete hex values for SVG rendering (grid, axis, tooltip, consensus, preview, payout, positions, fanBands) |
| `FanBandColors` | Five opacity-variant colors for fan chart bands (mean, band25, band50, band75, band95) |


**Preset Constants**


| Constant | Description |
| --- | --- |
| `FS_DARK` | FunctionSpace branded dark theme. Blue primary, dark purple background. |
| `FS_LIGHT` | FunctionSpace branded light theme. Blue primary, light gray background. |
| `NATIVE_DARK` | De-branded dark theme. System fonts, compact radius, fast transitions. |
| `NATIVE_LIGHT` | De-branded light theme. System fonts, compact radius. |
| `THEME_PRESETS` | Metadata array for theme-selector UIs: `{ id, label, group }[]` |


**Functions**


| Function | Description |
| --- | --- |
| `resolveChartColors(theme, presetOverrides?, customOverrides?)` | Produces a `ChartColors` object from a resolved theme with optional overrides. |
| `getPresetChartColors(presetId)` | Returns preset-specific chart color overrides. |






Custom Theming Specification

How to provide a fully custom theme to the FunctionSpace Trading SDK, with a detailed reference for every token and its visual impact.

---

### Overview

The SDK uses a **30-token semantic theme system**. You only need to provide **9 core tokens** — the remaining 21 are automatically derived. Every color in the SDK is driven by these tokens; there are zero hardcoded colors in components.

There are two rendering pipelines to understand:

1. **CSS Custom Properties** (`--fs-*`) — Used by all HTML/DOM elements (panels, buttons, inputs, tables). The Provider injects these as inline styles on a wrapper ``.
2. **Chart Colors** (`ctx.chartColors`) — Used by Recharts SVG elements (area fills, line strokes, axis text). SVG attributes cannot consume CSS variables, so chart colors are resolved to concrete hex/rgba values and passed through React context.

When you supply a custom theme, both pipelines resolve automatically from your tokens.

---

### Quick Start

```tsx
<FunctionSpaceProvider
  config={config}
  theme={{
    // Core 9 — the only required tokens
    primary:       '#6366f1',  // Indigo brand
    accent:        '#f59e0b',  // Amber highlight
    positive:      '#22c55e',  // Green for gains
    negative:      '#ef4444',  // Red for losses
    background:    '#0a0a0f',  // Page / outer background
    surface:       '#18181b',  // Card / panel background
    text:          '#fafafa',  // Primary text
    textSecondary: '#a1a1aa',  // Secondary / helper text
    border:        '#27272a',  // Borders and dividers
  }}
>
  {/* All widgets automatically inherit this theme */}
</FunctionSpaceProvider>
```

That's it — 9 values and the entire SDK is branded. Everything below is optional.

---

### Approach Options

#### Option 1: Preset Only

Use a built-in preset as-is.

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark" />
```

Presets: `"fs-dark"` | `"fs-light"` | `"native-dark"` | `"native-light"`

#### Option 2: Preset + Overrides

Start from a preset and override specific tokens.

```tsx
<FunctionSpaceProvider config={config} theme={{
  preset: 'fs-dark',
  primary: '#8b5cf6',    // Override just the brand color
  background: '#0f0b1a', // Override just the background
}} />
```

Any tokens you don't override keep the preset's value. This is the lowest-effort approach for brand alignment.

#### Option 3: Fully Custom (Core 9)

Provide all 9 required tokens. The 21 optional tokens are derived automatically.

```tsx
<FunctionSpaceProvider config={config} theme={{
  primary: '#6366f1',
  accent: '#f59e0b',
  positive: '#22c55e',
  negative: '#ef4444',
  background: '#0a0a0f',
  surface: '#18181b',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  border: '#27272a',
}} />
```

#### Option 4: Fully Custom (All 30)

Override every token for complete control.

```tsx
<FunctionSpaceProvider config={config} theme={{
  // Core 9
  primary: '#6366f1',
  accent: '#f59e0b',
  positive: '#22c55e',
  negative: '#ef4444',
  background: '#0a0a0f',
  surface: '#18181b',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  border: '#27272a',

  // Tier 1 — Surface variants
  bgSecondary: '#050508',
  surfaceHover: '#27272a',
  borderSubtle: '#3f3f46',
  textMuted: '#71717a',

  // Tier 2 — Component-specific
  navFrom: '#18181b',
  navTo: '#0a0a0f',
  overlay: 'rgba(0,0,0,0.25)',
  inputBg: '#27272a',
  codeBg: '#0f0f14',
  chartBg: '#050508',
  accentGlow: 'rgba(99,102,241,0.25)',
  badgeBg: 'rgba(139,92,246,0.2)',
  badgeBorder: 'rgba(139,92,246,0.3)',
  badgeText: '#c4b5fd',
  logoFilter: 'none',

  // Tier 3 — Shape & personality
  fontFamily: "'Inter', sans-serif",
  radiusSm: '0.25rem',
  radiusMd: '0.5rem',
  radiusLg: '0.75rem',
  borderWidth: '1px',
  transitionSpeed: '200ms',
}} />
```

---

### Token Reference — Core 9 (Required)

These are the minimum tokens needed for a custom theme. Every component in the SDK references these directly or via derived tokens.

#### `primary`

**CSS variable:** `--fs-primary`

The brand / action color. The most impactful single token in the theme.

| What it impacts                | How                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Submit / action buttons        | Background fill on "Submit Trade", "Log In", "Create Account"                   |
| Selected states                | Active tab backgrounds, selected bucket borders, toggle switch fill             |
| Focus rings                    | Input focus borders, slider handle focus glow                                   |
| Slider tracks & handles        | Active track fill and handle color on all sliders                               |
| Tab indicators                 | Active chart tab and position tab highlighting                                  |
| Row selection accent           | Left border on selected position table rows                                     |
| Header gradients               | Derived `--fs-header-gradient` (15% mix) used in panel header backgrounds       |
| Glow effects                   | Derived `--fs-primary-glow` (20% mix) used for focus rings and hover highlights |
| **Chart: consensus curve**     | `chartColors.consensus` — the main probability density area fill and stroke     |
| **Chart: fan bands**           | `chartColors.fanBands.mean` and all band opacity variants (25/50/75/95%)        |
| **Chart: position colors\[0]** | First position overlay curve color                                              |

**Usage frequency:** 34 direct references in component CSS, plus 3 derived variables referenced 20+ more times. This is by far the highest-impact token.

**Guidance:** Choose your brand's primary action color. Blue, purple, and teal work well for financial UIs. Avoid colors that clash with `positive` (green) or `negative` (red) as these appear in the same context.

---

#### `accent`

**CSS variable:** `--fs-accent`

Secondary highlight color for interactive elements and preview states.

| What it impacts               | How                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| **Chart: trade preview line** | `chartColors.previewLine` — the dashed overlay that appears when a user adjusts trade parameters |
| Shape selector highlights     | Active shape button borders, hover states, and glow effects in ShapeCutter                       |
| Control point dots            | Draggable (unlocked) control point fill in CustomShapeEditor                                     |
| Bucket selector highlights    | Selected bucket button borders and background tints in BucketRangeSelector                       |
| Custom range inputs           | Focused input border and background tint in BucketRangeSelector custom range mode                |
| Stats row accents             | Gradient accent wash in trade summary and stats header rows                                      |
| Lock toggle indicators        | Active lock button background in CustomShapeEditor                                               |

**Guidance:** Should be visually distinct from `primary`. Common pattern: blue primary + amber/yellow accent (provides clear "this is my view" vs "this is the market" distinction on charts). In native themes, this is set to white/black for a subdued look.

---

#### `positive`

**CSS variable:** `--fs-positive`

The "good outcome" color. Used everywhere money is gained or a status is favorable.

| What it impacts                | How                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Profit/loss positive values    | Green text on profitable P/L numbers in PositionTable                              |
| Payout display                 | "Potential Payout" value text in all trade panels                                  |
| Active market status           | "Active" badge text in MarketStats                                                 |
| Wallet balance                 | Wallet value text in AuthWidget                                                    |
| Buy trade rows                 | Background tint on buy-side rows in TimeSales                                      |
| Yes button                     | Default background tint for "Yes" in BinaryPanel (overridable via `yesColor` prop) |
| **Chart: payout curve**        | `chartColors.payout` — payout overlay color in consensus chart tooltip             |
| **Chart: position colors\[0]** | First position overlay color (shared with primary in default resolution)           |

**Guidance:** Almost always green. `#10b981` (emerald) or `#22c55e` (green) are safe choices. Must have sufficient contrast against both `surface` and `background`.

---

#### `negative`

**CSS variable:** `--fs-negative`

The "bad outcome" color. Used for losses, errors, and destructive actions.

| What it impacts                | How                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Profit/loss negative values    | Red text on losing P/L numbers in PositionTable                                  |
| Error messages                 | Error text in all widgets (API failures, validation errors)                      |
| Sell button                    | Background on the "Sell" action button in PositionTable                          |
| Resolved market status         | "Resolved" badge in MarketStats                                                  |
| Sell trade rows                | Background tint on sell-side rows in TimeSales                                   |
| No button                      | Default background tint for "No" in BinaryPanel (overridable via `noColor` prop) |
| Max loss display               | "Max Loss" value text in trade summary cards                                     |
| Auth errors                    | Error message styling in AuthWidget login/signup forms                           |
| **Chart: position colors\[1]** | Second position overlay color                                                    |

**Guidance:** Almost always red. `#f43f5e` (rose) or `#ef4444` (red) are standard. Should be clearly distinguishable from `positive` at a glance.

---

#### `background`

**CSS variable:** `--fs-background`

The outermost / page-level background color.

| What it impacts             | How                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel body backgrounds      | Gradient destination in `linear-gradient(bgSecondary, background)` used by TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector, CustomShapeEditor, AuthWidget |
| Section dividers            | Background for full-width section separators                                                                                                                        |
| Fallback for derived tokens | If not overridden: `bgSecondary`, `navFrom`, `navTo`, `inputBg`, `codeBg`, `chartBg` all default to this value                                                      |

**Guidance:** For dark themes: very dark gray or near-black (`#0a0a0f`, `#1a1a2e`). For light themes: off-white (`#f9f9f9`, `#ffffff`). Should provide strong contrast with `text`.

---

#### `surface`

**CSS variable:** `--fs-surface`

Elevated element backgrounds — cards, panels, dropdowns, tooltips.

| What it impacts               | How                                                |
| ----------------------------- | -------------------------------------------------- |
| Active tab fills              | Background of selected chart view tabs             |
| Stat bar cards                | Background of stat item containers in MarketStats  |
| Auth form panel               | Background of login/signup form area               |
| Table header                  | Position table header row background               |
| **Chart: tooltip background** | `chartColors.tooltipBg` — hover tooltip panel fill |

**Guidance:** Should be slightly lighter than `background` in dark themes (or slightly darker in light themes) to create visual elevation. The difference should be subtle — these aren't accent colors.

---

#### `text`

**CSS variable:** `--fs-text`

Primary text color for headings, body content, and important values.

| What it impacts         | How                                                                        |
| ----------------------- | -------------------------------------------------------------------------- |
| All headings            | Chart titles, panel titles, "Your Positions" header, "Time & Sales" header |
| Body text               | Table cell values, prediction values, amount displays                      |
| Input text              | Typed text in all inputs (amount, threshold, username, password)           |
| Button text             | Label text on active/primary buttons                                       |
| Stat values             | Bold metric values in MarketStats (volume, liquidity, etc.)                |
| Active tab text         | Text color of selected chart view tab                                      |
| **Chart: tooltip text** | `chartColors.tooltipText` — text inside hover tooltips                     |

**Guidance:** Near-white for dark themes (`#f3f4f6`, `#fafafa`). Near-black for light themes (`#202124`, `#18181b`). Must have high contrast against both `background` and `surface`.

---

#### `textSecondary`

**CSS variable:** `--fs-text-secondary`

Secondary text for labels, descriptions, and de-emphasized content.

| What it impacts       | How                                                                |
| --------------------- | ------------------------------------------------------------------ |
| Subtitles             | Chart subtitles, panel descriptions                                |
| Input labels          | "My Prediction", "Confidence", "Amount" labels above sliders       |
| Stat labels           | "Total Volume", "Liquidity" etc. uppercase labels in MarketStats   |
| Placeholder text      | Input placeholder styling                                          |
| Inactive tab text     | Non-selected chart view tab text                                   |
| Table column headers  | Header text in PositionTable and TimeSales                         |
| Slider value displays | Current value readouts below sliders                               |
| **Chart: crosshair**  | `chartColors.crosshair` — vertical/horizontal cursor line on hover |

**Guidance:** Medium gray. Should be legible but clearly subordinate to `text`. For dark themes: `#9ca3af`, `#a1a1aa`. For light themes: `#4b5563`, `#5f6368`.

---

#### `border`

**CSS variable:** `--fs-border`

Primary border and divider color.

| What it impacts           | How                                                                       |
| ------------------------- | ------------------------------------------------------------------------- |
| All panel borders         | Every component's outer border: charts, trade panels, tables, stats, auth |
| Input borders             | Default border on text inputs, number inputs, select elements             |
| Table row dividers        | Horizontal lines between table rows                                       |
| Tab container borders     | Border around the tab pill container                                      |
| Card dividers             | Section dividers within panels                                            |
| Slider rail               | Default unfilled portion of slider tracks                                 |
| **Chart: tooltip border** | `chartColors.tooltipBorder` — border on hover tooltip panel               |

**Usage frequency:** 50 references in component CSS — the most-used token in the stylesheet. Every visible container edge uses this.

**Guidance:** Should be subtle but visible. For dark themes: `#1f2937`, `#27272a`. For light themes: `#e5e7eb`, `#e0e0e0`.

---

### Token Reference — Tier 1 (Optional, Derived from Core 9)

These tokens provide finer control over surface variants. If omitted, they are automatically derived from the Core 9 as shown.

#### `bgSecondary`

**Default:** `background`

Secondary background for gradient destinations and alternate sections.

| What it impacts       | How                                                                         |
| --------------------- | --------------------------------------------------------------------------- |
| Panel gradient starts | All major widget backgrounds use `linear-gradient(bgSecondary, background)` |
| Section backgrounds   | Alternate-row backgrounds in some contexts                                  |
| Info panel fills      | Background of trade summary cards and control sections                      |

**Guidance:** Set slightly darker than `background` for a subtle depth gradient. In `fs-dark`, this is `#050816` vs background `#201e26`. Set equal to `background` to disable gradients.

---

#### `surfaceHover`

**Default:** `surface`

Background color for hovered elevated elements.

| What it impacts | How                                   |
| --------------- | ------------------------------------- |
| Table row hover | Background on PositionTable row hover |

**Guidance:** Slightly lighter than `surface`. Provides visual feedback on interactive rows.

---

#### `borderSubtle`

**Default:** `border`

A softer border for internal dividers within components (not outer boundaries).

| What it impacts       | How                                                     |
| --------------------- | ------------------------------------------------------- |
| Table row borders     | Bottom divider between rows in PositionTable            |
| **Chart: grid lines** | `chartColors.grid` — CartesianGrid stroke in all charts |

**Guidance:** Lighter than `border`. Used where you want structure without visual weight.

---

#### `textMuted`

**Default:** `textSecondary`

The most de-emphasized text tier — for non-essential metadata and disabled states.

| What it impacts        | How                                                          |
| ---------------------- | ------------------------------------------------------------ |
| Timestamp formatting   | De-emphasized time values                                    |
| Footer text            | Count labels in TimeSales footer                             |
| **Chart: axis labels** | `chartColors.axisText` — X and Y axis tick values and labels |

**Guidance:** Lighter than `textSecondary`. Should still be legible but clearly tertiary.

---

### Token Reference — Tier 2 (Optional, Component-Specific)

These tokens are consumed by specific components. All have sensible defaults.

#### `inputBg`

**Default:** `background`

Background fill for text inputs, number inputs, and inline edit fields.

| What it impacts        | How                                                       |
| ---------------------- | --------------------------------------------------------- |
| All text/number inputs | Amount inputs, threshold inputs, username/password fields |
| Tab containers         | Background of the tab pill container in chart headers     |
| Selected bucket tint   | Mixed into selected bucket button backgrounds             |

**Guidance:** Should be slightly different from `surface` so inputs are visually distinct from their parent panels. In dark themes, typically a dark gray (`#1f2937`).

---

#### `chartBg`

**Default:** `background`

Background specifically for chart containers.

| What it impacts      | How                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Chart container fill | The `.fs-chart-container` background (ConsensusChart, MarketCharts, TimelineChart, DistributionChart) |

**Guidance:** Can match `background` or be slightly darker/lighter to give charts their own visual plane. In `fs-dark`, this is `#050816` (very dark navy) for maximum chart contrast.

---

#### `overlay`

**Default:** `rgba(0,0,0,0.2)`

Semi-transparent overlay for modal-like backdrops and loading states.

| What it impacts    | How                                                                    |
| ------------------ | ---------------------------------------------------------------------- |
| Submitting overlay | Semi-transparent cover shown over trade panels during trade submission |
| Loading overlays   | Background of full-panel loading indicators                            |

**Guidance:** Always semi-transparent. Darker for dark themes (`rgba(0,0,0,0.2-0.3)`), lighter for light themes (`rgba(0,0,0,0.04-0.05)`).

---

#### `navFrom` / `navTo`

**Default:** both `background`

Gradient endpoints for navigation bar backgrounds.

| What it impacts                      | How                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| _Currently unused in SDK components_ | Reserved for future navigation components. Consumed by host applications that use the theme outside the SDK widget tree. |

**Guidance:** Can be left at defaults. Set explicitly if you have a nav bar consuming the theme outside SDK widgets.

---

#### `accentGlow`

**Default:** `rgba(59,130,246,0.25)`

A semi-transparent glow color for focus and hover highlights.

| What it impacts             | How                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Used in host applications_ | Available as a CSS variable but not directly referenced in current SDK component CSS. Intended for focus rings and glow effects in custom integrations. |

**Guidance:** Should be a transparent version of `primary`. Derive as `rgba(<primary-rgb>, 0.25)`.

---

#### `badgeBg` / `badgeBorder` / `badgeText`

**Defaults:** `rgba(128,128,128,0.15)` / `rgba(128,128,128,0.25)` / `textSecondary`

Badge styling tokens for count indicators and status pills.

| What it impacts              | How                                                                         |
| ---------------------------- | --------------------------------------------------------------------------- |
| _Available but lightly used_ | Position count badge in PositionTable header. Future badge/pill components. |

**Guidance:** Keep subtle. Badges should not compete with primary/accent for attention.

---

#### `codeBg`

**Default:** `background`

Background for code blocks or monospace content areas.

| What it impacts | How                                                                                     |
| --------------- | --------------------------------------------------------------------------------------- |
| _Reserved_      | Not directly used by current SDK components. Available for host app code display areas. |

---

#### `logoFilter`

**Default:** `'none'`

CSS filter applied to logo images.

| What it impacts | How                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| _Reserved_      | Not used by SDK components. Available for host applications embedding logo images that need brightness/invert adjustments per theme. |

**Guidance:** Use `'invert(1)'` if your logo is dark-on-transparent and the theme is dark, or `'none'` if the logo is already appropriate.

---

### Token Reference — Tier 3 (Shape & Personality)

These tokens control the overall feel — rounded vs sharp, fast vs relaxed, branded font vs system font.

#### `fontFamily`

**Default:** `'inherit'`

The font stack applied to all SDK components.

| What it impacts    | How                                                                    |
| ------------------ | ---------------------------------------------------------------------- |
| All text rendering | Every component's root class sets `font-family: var(--fs-font-family)` |

**Guidance:** `'inherit'` defers to the host page's font. Set explicitly to override: `"'Inter', sans-serif"` for a modern look, or use the system stack for native feel: `"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"`.

---

#### `radiusSm` / `radiusMd` / `radiusLg`

**Defaults:** `'0.375rem'` / `'0.75rem'` / `'1rem'`

Border radius at three scales.

| Token      | What it impacts                                                        |
| ---------- | ---------------------------------------------------------------------- |
| `radiusSm` | Tabs, small buttons, input fields, slider handles, toggle switches     |
| `radiusMd` | Tab containers, badge pills, bucket grid buttons                       |
| `radiusLg` | All outer panel containers (charts, trade panels, tables, auth widget) |

**Guidance:**

* **Rounded look** (FunctionSpace brand): `0.375rem` / `0.75rem` / `1rem`
* **Sharp look** (native/minimal): `0.25rem` / `0.375rem` / `0.5rem`
* **Pill look**: `0.5rem` / `1rem` / `1.5rem`
* **No rounding**: `0` / `0` / `0`

---

#### `borderWidth`

**Default:** `'1px'`

Width of all component borders.

| What it impacts   | How                                                                       |
| ----------------- | ------------------------------------------------------------------------- |
| All panel borders | Every `border: var(--fs-border-width) solid var(--fs-border)` declaration |
| Input borders     | All text/number input borders                                             |
| Table dividers    | Row separator lines                                                       |

**Guidance:** `'1px'` for a clean, minimal feel. `'2px'` for a bolder, more defined look (used by `fs-dark` and `fs-light` presets). `'0'` to remove all borders (not recommended — can cause layout shifts).

---

#### `transitionSpeed`

**Default:** `'200ms'`

Duration of all CSS transitions (hover, focus, active state changes).

| What it impacts         | How                                              |
| ----------------------- | ------------------------------------------------ |
| Tab transitions         | Color and background changes on tab hover/select |
| Button transitions      | Hover/active state changes on all buttons        |
| Input focus transitions | Border color changes on input focus              |

**Guidance:** `'150ms'` for snappy (native presets). `'200ms'` for balanced. `'300ms'` for smooth/relaxed (FunctionSpace presets). `'0ms'` to disable transitions entirely.

---

### Chart Color Overrides

Chart colors are **automatically derived** from your theme tokens. For most custom themes, the defaults are correct. But if you need to override specific chart colors, you can reach into the resolved chart colors.

#### Default Chart Color Derivation

| Chart Color          | Derived From          | What It Renders                                                 |
| -------------------- | --------------------- | --------------------------------------------------------------- |
| `consensus`          | `primary`             | Consensus probability density area fill and stroke              |
| `previewLine`        | `accent`              | Dashed trade preview overlay                                    |
| `payout`             | `positive`            | Payout curve in tooltip data                                    |
| `grid`               | `borderSubtle`        | CartesianGrid lines                                             |
| `axisText`           | `textMuted`           | X and Y axis tick labels                                        |
| `tooltipBg`          | `surface`             | Tooltip background                                              |
| `tooltipBorder`      | `border`              | Tooltip border                                                  |
| `tooltipText`        | `text`                | Tooltip text                                                    |
| `crosshair`          | `textSecondary`       | Hover cursor line                                               |
| `fanBands.mean`      | `primary`             | Fan chart mean line                                             |
| `fanBands.band25–95` | Blue opacity variants | Fan chart confidence bands                                      |
| `positions[0]`       | `positive`            | First position overlay                                          |
| `positions[1]`       | `negative`            | Second position overlay                                         |
| `positions[2–6]`     | Fixed palette         | Additional position overlays (purple, orange, teal, pink, cyan) |

#### When to Override

Most custom themes don't need chart color overrides. The derivation from semantic tokens produces correct results. Override when:

* Your `primary` color doesn't work well as a large area fill (e.g., very bright yellow)
* You want the consensus curve to be a different color than your brand primary
* You want the fan chart bands to use a different color family than the consensus

#### How to Override (Future API)

Chart color overrides are currently available through preset definitions. Custom per-consumer chart color overrides are on the roadmap. For now, if you need to override chart colors, the recommended approach is to create a custom preset constant.

---

### Derived CSS Variables

Three additional CSS variables are **computed at runtime** from your theme tokens using `color-mix()`. You cannot set these directly — they are derived automatically inside component root classes.

| Variable               | Derived From                      | Used For                                   |
| ---------------------- | --------------------------------- | ------------------------------------------ |
| `--fs-primary-glow`    | `primary` at 20% opacity          | Focus rings, hover glow effects            |
| `--fs-primary-light`   | `primary` at 80% mixed with white | Light variant of primary for text emphasis |
| `--fs-header-gradient` | `primary` at 15% opacity          | Subtle gradient wash in panel headers      |

---

### Resolution Logic

Understanding how the theme resolves helps when debugging unexpected colors.

```
Input                          Resolution Path
─────────────────────────────  ─────────────────────────────────
"fs-dark"                   →  Return FS_DARK preset (all 30 tokens)
"native-light"              →  Return NATIVE_LIGHT preset (all 30 tokens)
{ preset: 'fs-dark',        →  Start from FS_DARK, override primary,
  primary: '#8b5cf6' }         then applyDefaults() (no-op since base has all 30)
{ primary: '#6366f1', ... } →  Take 9 core tokens, applyDefaults() fills
  (no preset)                   remaining 21 from the core 9
undefined / not provided    →  Return FS_DARK
```

The `applyDefaults()` function derives each Tier 1/2/3 token from a specific core token:

```
bgSecondary     ← background
surfaceHover    ← surface
borderSubtle    ← border
textMuted       ← textSecondary
navFrom         ← background
navTo           ← background
overlay         ← rgba(0,0,0,0.2)       (constant)
inputBg         ← background
codeBg          ← background
chartBg         ← background
accentGlow      ← rgba(59,130,246,0.25)  (constant)
badgeBg         ← rgba(128,128,128,0.15) (constant)
badgeBorder     ← rgba(128,128,128,0.25) (constant)
badgeText       ← textSecondary
logoFilter      ← 'none'                 (constant)
fontFamily      ← 'inherit'              (constant)
radiusSm        ← '0.375rem'             (constant)
radiusMd        ← '0.75rem'              (constant)
radiusLg        ← '1rem'                 (constant)
borderWidth     ← '1px'                  (constant)
transitionSpeed ← '200ms'                (constant)
```

**Key implication:** If you only set the Core 9, `bgSecondary`, `inputBg`, `codeBg`, and `chartBg` will all equal `background`. This is fine for most themes, but you may want to set `chartBg` and `inputBg` explicitly if your design calls for distinct surface depths.

---

### Complete Example: Finance Platform Dark Theme

```tsx
<FunctionSpaceProvider
  config={config}
  theme={{
    // Core 9
    primary:       '#6366f1',    // Indigo — brand action color
    accent:        '#f59e0b',    // Amber — preview and interactive highlights
    positive:      '#22c55e',    // Green — profits, active states, buys
    negative:      '#ef4444',    // Red — losses, errors, sells
    background:    '#09090b',    // Near-black — page background
    surface:       '#18181b',    // Dark gray — cards, panels, tooltips
    text:          '#fafafa',    // Near-white — headings, values, body text
    textSecondary: '#a1a1aa',    // Medium gray — labels, descriptions, axis ticks
    border:        '#27272a',    // Subtle gray — all borders and dividers

    // Tier 1 — Surface depth
    bgSecondary:  '#030305',     // Darker than background — gradient start for panels
    surfaceHover: '#27272a',     // Lighter than surface — table row hover
    borderSubtle: '#3f3f46',     // Softer than border — internal dividers, chart grid
    textMuted:    '#71717a',     // Lighter than textSecondary — axis labels, timestamps

    // Tier 2 — Component-specific
    inputBg:  '#1c1c20',         // Distinct from surface — form inputs stand out
    chartBg:  '#030305',         // Match bgSecondary — charts get maximum contrast
    overlay:  'rgba(0,0,0,0.3)', // Submission overlay dimmer

    // Tier 3 — Personality
    fontFamily:      "'Inter', system-ui, sans-serif",
    radiusSm:        '0.25rem',  // Slightly sharp
    radiusMd:        '0.5rem',
    radiusLg:        '0.75rem',
    borderWidth:     '1px',      // Clean single-pixel borders
    transitionSpeed: '150ms',    // Snappy interactions
  }}
>
```

### Complete Example: Light Editorial Theme

```tsx
<FunctionSpaceProvider
  config={config}
  theme={{
    primary:       '#2563eb',    // Blue — reliable, trustworthy
    accent:        '#d97706',    // Dark amber — warm contrast
    positive:      '#16a34a',    // Deep green
    negative:      '#dc2626',    // Deep red
    background:    '#f8fafc',    // Cool off-white
    surface:       '#ffffff',    // Pure white cards
    text:          '#0f172a',    // Near-black text
    textSecondary: '#475569',    // Slate gray
    border:        '#e2e8f0',    // Light gray

    bgSecondary:   '#f1f5f9',
    inputBg:       '#f1f5f9',
    chartBg:       '#ffffff',    // White chart background
    surfaceHover:  '#f8fafc',
    borderSubtle:  '#cbd5e1',

    fontFamily:    "'Georgia', serif",  // Editorial feel
    radiusLg:      '0.5rem',
    borderWidth:   '1px',
    transitionSpeed: '200ms',
  }}
>
```

---

### Preset Comparison

For reference, here's how the four built-in presets differ in personality:

| Aspect           | fs-dark                 | fs-light       | native-dark               | native-light           |
| ---------------- | ----------------------- | -------------- | ------------------------- | ---------------------- |
| Font             | inherit                 | inherit        | System stack              | System stack           |
| Border radius    | Large (0.375/0.75/1rem) | Large          | Small (0.25/0.375/0.5rem) | Small                  |
| Border width     | 2px                     | 2px            | 1px                       | 1px                    |
| Transition speed | 300ms (smooth)          | 300ms          | 150ms (snappy)            | 150ms                  |
| Accent color     | Amber `#F59E0B`         | Amber          | White `#ffffff`           | Black `#000000`        |
| Fan chart bands  | Blue                    | Blue           | Gray                      | Gray                   |
| Consensus chart  | Brand blue              | Brand blue     | Neutral gray              | Neutral gray           |
| Overall feel     | Branded, polished       | Branded, clean | Minimal, system-native    | Minimal, system-native |

The "native" presets are designed to disappear into a host application. The "fs" presets are designed to feel like a FunctionSpace product.
