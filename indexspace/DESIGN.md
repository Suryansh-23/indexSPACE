# Design System: IndexSpace
**Project ID:** IndexSpace FunctionSpace Builder Competition App

## 1. Visual Theme & Atmosphere

IndexSpace should feel like a deadpan financial instrument: a Teenage
Engineering control surface for forecast indices, with MSCHF-style numbered
vault identity and trading-terminal precision.

The UI is functional first. It should look like a machine that manages
forecast exposure, not a SaaS dashboard, landing page, or generic crypto app.
The strongest references are:

- [Teenage Engineering EP-133 product control language](docs/design/teenage-ep133-mid.png)
- [Teenage Engineering EP-133 specification density](docs/design/teenage-ep133-specs.png)
- [Teenage Engineering OP-1 field product page](docs/design/teenage-op1.png)
- [Teenage Engineering homepage product grid](docs/design/teenage-engineering-home.png)
- [MSCHF archive homepage](docs/design/mschf-home.png)

Use Teenage Engineering as the structural base and MSCHF as the attitude layer:

```text
70% Teenage Engineering product/interface discipline
20% MSCHF deadpan archive attitude
10% Binance/Hyperliquid trading-terminal density
```

The mood is precise, modular, dry, tactile, and slightly strange. It should
feel like operating a forecast sampler or vault sequencer. Avoid inspirational
finance copy, decorative illustrations, gradient hero sections, glassmorphism,
rounded SaaS cards, and crypto casino visual language.

## 2. Color Palette & Roles

- **Machine Black (#000000):** Primary app shell, top bars, high-contrast
  terminal regions, and mode headers.
- **Instrument Ink (#0F0E12):** Main dark panel color for charts, trade
  drawers, status strips, and dense data areas.
- **Warm Panel White (#F6F8F7):** Primary light surface for market tables,
  vault details, empty states, and readable content panels.
- **Paper White (#F9FAF9):** Page background when the layout needs a quieter
  Teenage Engineering product-page feel.
- **Soft Machine Gray (#E5E5E5):** Secondary surfaces, separators, inactive
  control fills, table row alternation, and chart grid bands.
- **Muted Hardware Gray (#737373):** Secondary copy, labels, timestamps, unit
  annotations, and low-priority metadata.
- **Archive Gray (#84898E):** MSCHF-like archive text, disabled labels, and
  low-emphasis status copy on dark surfaces.
- **Action Blue (#0071BB):** Primary financial action, selected tabs,
  subscribe states, focused controls, and positive execution paths.
- **Signal Orange (#F05A24):** Warning, redeem mode, simulator state,
  exceptional tail movement, and attention states that are not errors.
- **MSCHF Yellow (#FFC700):** Rare accent for active vault identity, live
  status, selected index number, or one key alert. Use sparingly.
- **Execution Green (#1E9E5A):** Filled, claimable, healthy, and successful
  states. Keep it functional, not neon.
- **Fault Red (#D62D20):** Failed requests, contract rejection, disconnected
  services, and destructive actions.

Do not make the product monochrome. The default screen may be black, white, and
gray, but the system needs sharp blue, orange, and yellow moments to feel like a
live instrument.

## 3. Typography Rules

Use a compact grotesk or mono-forward stack. Good implementation defaults:

```css
font-family: "Inter", "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif;
font-family: "IBM Plex Mono", "JetBrains Mono", "SFMono-Regular", monospace;
```

If custom fonts are added later, the direction should stay close to Teenage
Engineering's thin technical sans plus MSCHF's mono archive type.

Typography rules:

- **Vault names:** small uppercase labels plus large exact identifiers.
  Example: `VAULT 01 / AI ACCELERATION`.
- **Numbers:** use tabular numerals everywhere for NAV, shares, percentages,
  request IDs, timestamps, market weights, and chart axes.
- **Labels:** short, lowercase or uppercase technical phrases. Prefer
  `curator armed`, `request pending`, `claim ready`, `tail widening`.
- **Headings:** restrained. Use large type only for vault identity or current
  index value, not for marketing headlines.
- **Body copy:** compact and factual. Most explanatory copy should be one or
  two lines.
- **Letter spacing:** keep normal letter spacing for body and numbers. Slight
  positive letter spacing is acceptable only for tiny uppercase labels.

Avoid title-case marketing copy. Avoid vague AI finance phrases. The product
should sound like an instrument readout.

## 4. Component Stylings

* **Buttons:** Sharp rectangular controls with squared-off edges. Primary
  subscribe buttons use Action Blue (#0071BB) on dark or light surfaces. Redeem
  actions use Signal Orange (#F05A24). Disabled buttons should look mechanically
  unavailable: gray fill, muted label, no decorative opacity tricks. Icon
  buttons should use simple familiar symbols, not text in rounded pills.

* **Trade Drawer:** A right-side drawer inspired by app.uniswap.org for flow,
  but visually closer to a hardware control panel. It should contain action
  mode, amount input, quote/NAV preview, request state, allowance state, and one
  final action. The drawer uses Instrument Ink (#0F0E12), sharp edges, thin
  separators, tabular numbers, and status lights.

* **Vault Cards:** Do not use soft cards. Use product tiles: sharp rectangular
  modules with a numbered identity, one large number, two to four compact
  metrics, and a terse interpretation line. Example:
  `VAULT 01`, `AI ACCELERATION`, `NAV 1.042`, `CURATOR ARMED`.

* **Charts:** Charts should feel like screens built into the instrument.
  Prefer black or off-white chart panels, thin grid lines, small axis labels,
  and crisp color-coded series. The main index/NAV chart can borrow density
  from Binance or Hyperliquid, but should not inherit their visual clutter.

* **Tables:** Dense, aligned, and spec-like. Use sharp row separators, tabular
  numerals, compact row height, and clear columns for market, weight, exposure,
  belief shape, preview value, and state. Tables should feel like Teenage
  Engineering specification blocks.

* **Inputs and Forms:** Rectangular input wells with thin strokes. Amount
  inputs can be large and instrument-like, but helper text should stay small.
  Validation states should use direct labels such as `insufficient usdc`,
  `wallet disconnected`, or `request already active`.

* **Status Lights:** Use small square or circular indicators for system states.
  Green means healthy or complete, orange means in progress or simulator driven,
  yellow means live attention, red means failed. Pair every light with a text
  label for accessibility.

* **Tabs:** Use segmented rectangular tabs with hard borders. Active tabs should
  invert or use Action Blue (#0071BB), not pill backgrounds.

* **Modals:** Avoid centered modals except for destructive confirmations.
  Prefer drawers and inline panels. If a modal is required, keep it sharp,
  flat, narrow, and copy-light.

* **FunctionSpace Widgets:** Existing FunctionSpace widgets may be embedded for
  constituent market drilldowns and internal strategy previews. Wrap them in
  sharp instrument panels, normalize spacing, and keep their labels consistent
  with IndexSpace. Do not let widget styling dominate the vault product shell.

## 5. Layout Principles

The first screen is a trading terminal, not a landing page.

Primary desktop layout:

```text
top system bar
left index/vault rail
center chart and vault detail surface
right trade drawer or compact execution panel
bottom request/activity strip
```

Layout rules:

- Use strong grid alignment and rectangular modules.
- Keep the first viewport useful: current index value, live chart, trade action,
  vault state, and request state should be visible without scrolling.
- Prefer full-width bands and machine panels over nested cards.
- Keep spacing tight but breathable. This is dense financial software, not a
  marketing page.
- Use clear hierarchy through size, contrast, and location rather than shadows.
- Mobile should become a stacked instrument: top vault identity, chart, action
  drawer trigger, metrics, constituents, activity.
- The portfolio drawer should open from the right and behave like a compact
  account console with `Portfolio`, `Requests`, and `Activity` tabs.

## 6. Depth & Elevation

The system is mostly flat. Depth comes from contrast, panel boundaries,
separators, and layout hierarchy.

Use:

- 1px borders
- sharp separators
- alternating surface color
- hard contrast between black instrument zones and warm white product zones

Avoid:

- blurred shadows
- glass panels
- floating card stacks
- gradient backgrounds
- soft neumorphic controls

If elevation is needed for a drawer, use a hard border and slight overlay
instead of a large shadow.

## 7. Product Language

Use product and machine language:

- `vault`
- `index`
- `subscription`
- `redemption`
- `curator`
- `request`
- `claim`
- `NAV`
- `shares`
- `constituents`
- `simulator`
- `FunctionSpace exposure`

Use numbered identities:

- `VAULT 01 / AI ACCELERATION`
- `VAULT 02 / CRYPTO REFLEXIVITY`
- `PREVIEW 03 / MACRO STRESS`
- `PREVIEW 04 / CREATOR MOMENTUM`

Avoid:

- `ETF`
- `trustless`
- `guaranteed`
- `magic`
- `AI-powered alpha`
- `one-click wealth`
- generic hero slogans

The writing should be dry and operational. The weirdness comes from precision,
numbering, and presentation, not from jokes.

## 8. Screen-Level Direction

### Terminal Dashboard

The dashboard is the main product surface. It should show all four indices,
with the two live vaults clearly marked as tradeable and the two preview-only
indices clearly marked as preview.

Required visual elements:

- numbered vault rail
- main selected index chart
- active trade drawer
- compact NAV/share/supply metrics
- curator state
- simulator state
- latest requests/activity strip

### Vault Detail

Vault detail should feel like opening the device panel for a single index.

Required visual elements:

- large index value and NAV
- chart with candle or line modes
- constituent weights table
- FunctionSpace exposure summary
- current belief templates
- request lifecycle panel
- methodology tab

### Trade Flow

The trade flow should visually compress a complex async process into a simple
state machine:

```text
connect wallet -> approve usdc -> request -> curator executing -> claim ready -> claimed
```

Do not hide the async nature. Make it legible and controlled.

### Internal Route

The internal route should feel like a machine room:

- backend health
- indexer checkpoint
- curator account
- simulator toggle
- FunctionSpace account state
- latest execution attempts

This can be plain and dense. It does not need product polish, but it should use
the same colors, typography, and sharp geometry.

## 9. Implementation Guardrails

- No rounded SaaS cards unless a third-party widget forces it.
- No gradient hero sections.
- No nested cards.
- No beige-only or purple-blue crypto palette.
- No marketing page as the first screen.
- No huge decorative type inside operational panels.
- No in-app tutorial copy explaining obvious controls.
- No text overlap at desktop or mobile widths.
- Use stable dimensions for chart panels, index tiles, controls, and status
  rows so live data does not shift layout.
- Favor icons for repeated actions, with tooltips where needed.
- All financial numbers use tabular numerals.
- All live or simulated states must be visibly labeled.

## 10. Reference Notes

Observed reference traits:

- MSCHF homepage: black background, archive list, huge mono identity,
  yellow accent, squared geometry, deliberately blunt catalogue attitude.
- Teenage Engineering homepage: black and off-white product grid, precise
  navigation, muted gray labels, orange and blue accents, flat panels.
- OP-1 product page: quiet gray/off-white hardware presentation, large product
  identity, precise feature blocks, thin technical typography.
- EP-133 product page: punchier product language, spec-list density, black
  strips, repeated CTAs, feature grids, tactile control-machine mood.

IndexSpace should inherit the control-machine mood, not the literal product
imagery.
