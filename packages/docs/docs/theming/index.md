---
title: "Theming"
sidebar_position: 1
description: "30-token theme system reference with core tokens, presets, ChartColors, and CSS custom properties."
---

# Theming

The theme system uses a 30-token architecture organized into tiers. You provide as few as 9 required tokens; the remaining 21 are automatically derived.

**`FSTheme`**

The full theme interface. Only the 9 core tokens are required; all others have sensible defaults derived from the core tokens via `applyDefaults`.

**Core 9 (required):**

| Token           | Type     | Purpose                                                   |
| --------------- | -------- | --------------------------------------------------------- |
| `primary`       | `string` | Primary brand color (buttons, links, consensus curve)     |
| `accent`        | `string` | Accent/highlight color (preview lines, secondary actions) |
| `positive`      | `string` | Success/gain color (payout curves, profit indicators)     |
| `negative`      | `string` | Error/loss color (loss indicators, sell actions)          |
| `background`    | `string` | Page background                                           |
| `surface`       | `string` | Card/panel background                                     |
| `text`          | `string` | Primary text color                                        |
| `textSecondary` | `string` | Secondary/dimmed text                                     |
| `border`        | `string` | Default border color                                      |

**Tier 1 (optional, derived from core 9):**

| Token          | Default Source  | Purpose                    |
| -------------- | --------------- | -------------------------- |
| `bgSecondary`  | `background`    | Alternate background areas |
| `surfaceHover` | `surface`       | Surface hover state        |
| `borderSubtle` | `border`        | Subtle/secondary borders   |
| `textMuted`    | `textSecondary` | Most subtle text level     |

**Tier 2 (optional, component-specific):**

| Token         | Default Source             | Purpose                            |
| ------------- | -------------------------- | ---------------------------------- |
| `navFrom`     | `background`               | Navigation gradient start          |
| `navTo`       | `background`               | Navigation gradient end            |
| `overlay`     | `'rgba(0,0,0,0.2)'`        | Modal/overlay backdrop             |
| `inputBg`     | `background`               | Form input background              |
| `codeBg`      | `background`               | Code block background              |
| `chartBg`     | `background`               | Chart background                   |
| `accentGlow`  | `'rgba(59,130,246,0.25)'`  | Glow effect around accent elements |
| `badgeBg`     | `'rgba(128,128,128,0.15)'` | Badge background                   |
| `badgeBorder` | `'rgba(128,128,128,0.25)'` | Badge border                       |
| `badgeText`   | `textSecondary`            | Badge text color                   |
| `logoFilter`  | `'none'`                   | CSS filter applied to logo images  |

**Tier 3 (optional, shape/personality):**

| Token             | Default      | Purpose                 |
| ----------------- | ------------ | ----------------------- |
| `fontFamily`      | `'inherit'`  | Font stack              |
| `radiusSm`        | `'0.375rem'` | Small border radius     |
| `radiusMd`        | `'0.75rem'`  | Medium border radius    |
| `radiusLg`        | `'1rem'`     | Large border radius     |
| `borderWidth`     | `'1px'`      | Default border width    |
| `transitionSpeed` | `'200ms'`    | CSS transition duration |

**`ResolvedFSTheme`**

`Required<FSTheme>` with all 30 tokens guaranteed present. This is what the Provider and all components actually consume.

**`FSThemeInput`**

The flexible input type accepted by the Provider's `theme` prop:

```typescript
type FSThemeInput =
  | ThemePresetId                                    // e.g., "fs-dark"
  | (Partial<FSTheme> & { preset?: ThemePresetId })  // overrides with optional preset base
```

**Usage patterns:**

```tsx
// Use a preset as-is
<FunctionSpaceProvider theme="fs-dark" />

// Start from a preset, override specific tokens
<FunctionSpaceProvider theme={{ preset: 'native-dark', primary: '#ff6600', positive: '#00ff00' }} />

// Fully custom theme (must provide all 9 core tokens)
<FunctionSpaceProvider theme={{
  primary: '#6366f1',
  accent: '#f59e0b',
  positive: '#22c55e',
  negative: '#ef4444',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  border: '#333333',
}} />
```

**Preset Constants**

Four built-in presets, each providing all 30 tokens:

| Constant        | Preset ID        | Description                                                                                                                     |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `FS_DARK`       | `'fs-dark'`      | FunctionSpace branded dark theme. Blue primary, dark purple-tinted background, 2px borders, 300ms transitions.                  |
| `FS_LIGHT`      | `'fs-light'`     | FunctionSpace branded light theme. Blue primary, light gray background.                                                         |
| `NATIVE_DARK`   | `'native-dark'`  | De-branded dark theme. Pure black background, system fonts, compact radius (0.25/0.375/0.5rem), 1px borders, 150ms transitions. |
| `NATIVE_LIGHT`  | `'native-light'` | De-branded light theme. White surface, system fonts, compact radius.                                                            |
| `THEME_PRESETS` | n/a              | Metadata array for building theme-selector UIs: `{ id: ThemePresetId, label: string, group: string }[]`                         |

**`ChartColors`**

Concrete hex/rgba values for Recharts SVG rendering. Resolved from the theme and preset-specific overrides. Available on context as `ctx.chartColors`.

| Field           | Type            | Description                                     |
| --------------- | --------------- | ----------------------------------------------- |
| `grid`          | `string`        | CartesianGrid stroke color                      |
| `axisText`      | `string`        | Axis label and tick fill                        |
| `tooltipBg`     | `string`        | Custom tooltip background                       |
| `tooltipBorder` | `string`        | Custom tooltip border                           |
| `tooltipText`   | `string`        | Custom tooltip text color                       |
| `crosshair`     | `string`        | Cursor/crosshair stroke                         |
| `consensus`     | `string`        | Consensus curve stroke/fill                     |
| `previewLine`   | `string`        | Trade preview line stroke                       |
| `payout`        | `string`        | Payout curve color                              |
| `positions`     | `string[]`      | Position overlay curve colors (7-color palette) |
| `fanBands`      | `FanBandColors` | Fan chart band colors                           |

**`FanBandColors`:**

| Field    | Description                          |
| -------- | ------------------------------------ |
| `mean`   | Solid mean line color                |
| `band25` | Inner band (25th-75th percentile)    |
| `band50` | Mid-inner band                       |
| `band75` | Mid-outer band                       |
| `band95` | Outer band (2.5th-97.5th percentile) |

**`resolveChartColors(theme, presetOverrides?, customOverrides?)`**

Produces a `ChartColors` object from a resolved theme. Merges three layers: base defaults (derived from theme tokens), preset-specific overrides, and custom overrides. Fan band colors are deep-merged separately.

```typescript
function resolveChartColors(
  theme: ResolvedFSTheme,
  presetOverrides?: Partial<ChartColors>,
  customOverrides?: Partial<ChartColors>,
): ChartColors
```

If `consensus` is overridden but neither `presetOverrides.fanBands.mean` nor `customOverrides.fanBands.mean` is explicitly set, `fanBands.mean` is automatically synced to the resolved consensus color. Note: all four built-in presets include explicit `fanBands.mean` values, so this auto-sync only fires for fully custom (non-preset) themes.

**`getPresetChartColors(presetId)`**

Returns preset-specific chart color overrides for a given preset ID. Used internally by the Provider during chart color resolution.

```typescript
function getPresetChartColors(presetId: ThemePresetId): Partial<ChartColors> | undefined
```

**CSS Custom Properties**

The Provider injects all 30 theme tokens as CSS custom properties on a wrapper div. UI components reference these properties for styling. You can also use them in your own CSS:

```css
.my-custom-panel {
  background: var(--fs-surface);
  color: var(--fs-text);
  border: var(--fs-border-width) solid var(--fs-border);
  border-radius: var(--fs-radius-md);
  transition: background var(--fs-transition-speed);
}
```

**Full property mapping:**

| CSS Property            | Theme Token       |
| ----------------------- | ----------------- |
| `--fs-primary`          | `primary`         |
| `--fs-accent`           | `accent`          |
| `--fs-positive`         | `positive`        |
| `--fs-negative`         | `negative`        |
| `--fs-background`       | `background`      |
| `--fs-surface`          | `surface`         |
| `--fs-text`             | `text`            |
| `--fs-text-secondary`   | `textSecondary`   |
| `--fs-border`           | `border`          |
| `--fs-bg-secondary`     | `bgSecondary`     |
| `--fs-surface-hover`    | `surfaceHover`    |
| `--fs-border-subtle`    | `borderSubtle`    |
| `--fs-text-muted`       | `textMuted`       |
| `--fs-nav-from`         | `navFrom`         |
| `--fs-nav-to`           | `navTo`           |
| `--fs-overlay`          | `overlay`         |
| `--fs-input-bg`         | `inputBg`         |
| `--fs-code-bg`          | `codeBg`          |
| `--fs-chart-bg`         | `chartBg`         |
| `--fs-accent-glow`      | `accentGlow`      |
| `--fs-badge-bg`         | `badgeBg`         |
| `--fs-badge-border`     | `badgeBorder`     |
| `--fs-badge-text`       | `badgeText`       |
| `--fs-logo-filter`      | `logoFilter`      |
| `--fs-font-family`      | `fontFamily`      |
| `--fs-radius-sm`        | `radiusSm`        |
| `--fs-radius-md`        | `radiusMd`        |
| `--fs-radius-lg`        | `radiusLg`        |
| `--fs-border-width`     | `borderWidth`     |
| `--fs-transition-speed` | `transitionSpeed` |
