// ── Theme Types ──

export interface FSTheme {
  // ── Core 9 (required) ──
  primary: string;
  accent: string;
  positive: string;
  negative: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;

  // ── Tier 1 (optional — defaults derived from core 9) ──
  bgSecondary?: string;
  surfaceHover?: string;
  borderSubtle?: string;
  textMuted?: string;

  // ── Tier 2 (optional — consumed by components) ──
  navFrom?: string;
  navTo?: string;
  overlay?: string;
  inputBg?: string;
  codeBg?: string;
  chartBg?: string;
  accentGlow?: string;
  badgeBg?: string;
  badgeBorder?: string;
  badgeText?: string;
  logoFilter?: string;

  // ── Tier 3 (optional — shape/personality) ──
  fontFamily?: string;
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  borderWidth?: string;
  transitionSpeed?: string;
}

/** Fully resolved theme — every token guaranteed present */
export type ResolvedFSTheme = Required<FSTheme>;

// ── Chart Colors ──

/** Chart color values — concrete hex/rgba for Recharts SVG rendering */
export interface ChartColors {
  /** CartesianGrid stroke */
  grid: string;
  /** Axis label/tick fill */
  axisText: string;
  /** Custom tooltip background */
  tooltipBg: string;
  /** Custom tooltip border */
  tooltipBorder: string;
  /** Custom tooltip text */
  tooltipText: string;
  /** Cursor/crosshair stroke */
  crosshair: string;
  /** Consensus curve stroke/fill */
  consensus: string;
  /** Trade preview line stroke */
  previewLine: string;
  /** Payout curve color (defaults to theme.positive) */
  payout: string;
  /** Position curve colors */
  positions: string[];
  /** Fan band colors (opacity variants of consensus) */
  fanBands: FanBandColors;
}

/** Fan chart band colors for TimelineChart */
export interface FanBandColors {
  mean: string;
  band25: string;
  band50: string;
  band75: string;
  band95: string;
}

// ── Preset ID ──

export type ThemePresetId = 'fs-dark' | 'fs-light' | 'native-dark' | 'native-light';

// ── Metadata array (powers future theme selector UIs) ──

export const THEME_PRESETS: { id: ThemePresetId; label: string; group: string }[] = [
  { id: 'fs-dark',      label: 'FunctionSpace Dark',  group: 'FunctionSpace' },
  { id: 'fs-light',     label: 'FunctionSpace Light', group: 'FunctionSpace' },
  { id: 'native-dark',  label: 'Native Dark',         group: 'Native' },
  { id: 'native-light', label: 'Native Light',        group: 'Native' },
];

// ── Preset Chart Color Overrides ──

const PRESET_CHART_COLORS: Record<ThemePresetId, Partial<ChartColors>> = {
  'fs-dark': {
    grid: '#1f2937',
    axisText: '#6b7280',
    tooltipBg: '#111827',
    tooltipBorder: '#1f2937',
    tooltipText: '#f3f4f6',
    crosshair: '#4b5563',
    // consensus + previewLine omitted → derived from theme.primary / theme.accent
    fanBands: {
      mean: '#3b82f6',
      band25: 'rgba(59,130,246,0.58)',
      band50: 'rgba(59,130,246,0.40)',
      band75: 'rgba(59,130,246,0.28)',
      band95: 'rgba(59,130,246,0.20)',
    },
  },
  'fs-light': {
    grid: '#E5E7EB',
    axisText: '#000000',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E5E7EB',
    tooltipText: '#202124',
    crosshair: '#9CA3AF',
    fanBands: {
      mean: '#3b82f6',
      band25: 'rgba(59,130,246,0.58)',
      band50: 'rgba(59,130,246,0.40)',
      band75: 'rgba(59,130,246,0.28)',
      band95: 'rgba(59,130,246,0.20)',
    },
  },
  'native-dark': {
    grid: '#1A1A1A',
    axisText: '#555555',
    tooltipBg: '#0A0A0A',
    tooltipBorder: '#333333',
    tooltipText: '#E0E0E0',
    crosshair: '#333333',
    consensus: '#6B7280',      // Gray, not brand blue — native is de-branded
    previewLine: '#9CA3AF',
    fanBands: {
      mean: '#6B7280',
      band25: 'rgba(107,114,128,0.58)',
      band50: 'rgba(107,114,128,0.40)',
      band75: 'rgba(107,114,128,0.28)',
      band95: 'rgba(107,114,128,0.20)',
    },
  },
  'native-light': {
    grid: '#E8E8E8',
    axisText: '#000000',
    tooltipBg: '#FFFFFF',
    tooltipBorder: '#E0E0E0',
    tooltipText: '#202124',
    crosshair: '#B0B0B0',
    consensus: '#6B7280',
    previewLine: '#000000',
    fanBands: {
      mean: '#6B7280',
      band25: 'rgba(107,114,128,0.58)',
      band50: 'rgba(107,114,128,0.40)',
      band75: 'rgba(107,114,128,0.28)',
      band95: 'rgba(107,114,128,0.20)',
    },
  },
};

// ── Preset Definitions (all 30 tokens explicit) ──

export const FS_DARK: ResolvedFSTheme = {
  primary: '#3b82f6',
  accent: '#F59E0B',
  positive: '#10b981',
  negative: '#f43f5e',
  background: '#201e26',
  surface: '#111827',
  text: '#f3f4f6',
  textSecondary: '#9ca3af',
  border: '#1f2937',
  bgSecondary: '#050816',
  surfaceHover: 'rgba(31,41,55,0.9)',
  borderSubtle: '#374151',
  textMuted: '#6b7280',
  navFrom: '#111827',
  navTo: '#030712',
  overlay: 'rgba(0,0,0,0.2)',
  inputBg: '#1f2937',
  codeBg: '#0f172a',
  chartBg: '#050816',
  accentGlow: 'rgba(59,130,246,0.25)',
  badgeBg: 'rgba(168,85,247,0.2)',
  badgeBorder: 'rgba(168,85,247,0.3)',
  badgeText: '#c4b5fd',
  logoFilter: 'none',
  fontFamily: 'inherit',
  radiusSm: '0.375rem',
  radiusMd: '0.75rem',
  radiusLg: '1rem',
  borderWidth: '2px',
  transitionSpeed: '300ms',
};

export const FS_LIGHT: ResolvedFSTheme = {
  primary: '#3b82f6',
  accent: '#F59E0B',
  positive: '#10b981',
  negative: '#f43f5e',
  background: '#F9F9F9',
  surface: '#FFFFFF',
  text: '#202124',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
  bgSecondary: '#F9F9F9',
  surfaceHover: '#F3F4F6',
  borderSubtle: '#D1D5DB',
  textMuted: '#6B7280',
  navFrom: '#FFFFFF',
  navTo: '#F9FAFB',
  overlay: 'rgba(0,0,0,0.05)',
  inputBg: '#F3F4F6',
  codeBg: '#F1F5F9',
  chartBg: '#F9F9F9',
  accentGlow: 'rgba(59,130,246,0.2)',
  badgeBg: 'rgba(168,85,247,0.1)',
  badgeBorder: 'rgba(168,85,247,0.2)',
  badgeText: '#7C3AED',
  logoFilter: 'none',
  fontFamily: 'inherit',
  radiusSm: '0.375rem',
  radiusMd: '0.75rem',
  radiusLg: '1rem',
  borderWidth: '2px',
  transitionSpeed: '300ms',
};

export const NATIVE_DARK: ResolvedFSTheme = {
  primary: '#3b82f6',
  accent: '#ffffff',
  positive: '#10b981',
  negative: '#f43f5e',
  background: '#000000',
  surface: '#000000',
  text: '#E0E0E0',
  textSecondary: '#A0A0A0',
  border: '#333333',
  bgSecondary: '#000000',
  surfaceHover: '#0A0A0A',
  borderSubtle: '#404040',
  textMuted: '#707070',
  navFrom: '#000000',
  navTo: '#000000',
  overlay: 'rgba(0,0,0,0.3)',
  inputBg: '#1A1A1A',
  codeBg: '#0A0A0A',
  chartBg: '#000000',
  accentGlow: 'rgba(59,130,246,0.25)',
  badgeBg: 'rgba(160,160,160,0.15)',
  badgeBorder: 'rgba(160,160,160,0.25)',
  badgeText: '#A0A0A0',
  logoFilter: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  radiusSm: '0.25rem',
  radiusMd: '0.375rem',
  radiusLg: '0.5rem',
  borderWidth: '1px',
  transitionSpeed: '150ms',
};

export const NATIVE_LIGHT: ResolvedFSTheme = {
  primary: '#3b82f6',
  accent: '#000000',
  positive: '#10b981',
  negative: '#f43f5e',
  background: '#F9F9F9',
  surface: '#FFFFFF',
  text: '#202124',
  textSecondary: '#5F6368',
  border: '#E0E0E0',
  bgSecondary: '#FFFFFF',
  surfaceHover: '#F5F5F5',
  borderSubtle: '#D0D0D0',
  textMuted: '#80868B',
  navFrom: '#FFFFFF',
  navTo: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.04)',
  inputBg: '#F0F0F0',
  codeBg: '#F5F5F5',
  chartBg: '#FFFFFF',
  accentGlow: 'rgba(59,130,246,0.2)',
  badgeBg: 'rgba(100,100,100,0.1)',
  badgeBorder: 'rgba(100,100,100,0.2)',
  badgeText: '#5F6368',
  logoFilter: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  radiusSm: '0.25rem',
  radiusMd: '0.375rem',
  radiusLg: '0.5rem',
  borderWidth: '1px',
  transitionSpeed: '150ms',
};

// ── Chart Color Resolution ──

/** Get preset-specific chart color overrides (if any) */
export function getPresetChartColors(presetId: ThemePresetId): Partial<ChartColors> | undefined {
  return PRESET_CHART_COLORS[presetId];
}

/**
 * Resolve chart colors for a theme.
 *
 * For named presets: merges preset-specific overrides with smart defaults.
 * For custom themes: derives all fields from the theme's semantic tokens.
 * Consumers can additionally override any field.
 */
export function resolveChartColors(
  theme: ResolvedFSTheme,
  presetOverrides?: Partial<ChartColors>,
  customOverrides?: Partial<ChartColors>,
): ChartColors {
  const defaultFanBands: FanBandColors = {
    mean: theme.primary,
    band25: 'rgba(59,130,246,0.58)',
    band50: 'rgba(59,130,246,0.40)',
    band75: 'rgba(59,130,246,0.28)',
    band95: 'rgba(59,130,246,0.20)',
  };

  const base: ChartColors = {
    grid:        theme.borderSubtle,
    axisText:    theme.textMuted,
    tooltipBg:   theme.surface,
    tooltipBorder: theme.border,
    tooltipText: theme.text,
    crosshair:   theme.textSecondary,
    consensus:   theme.primary,
    previewLine: theme.accent,
    payout:      theme.positive,
    positions:   [theme.positive, theme.negative, '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#06b6d4'],
    fanBands:    defaultFanBands,
  };

  // Merge: base → preset overrides → custom overrides
  // fanBands needs special merging since it's nested
  const presetFanBands = presetOverrides?.fanBands;
  const customFanBands = customOverrides?.fanBands;

  const merged: ChartColors = {
    ...base,
    ...presetOverrides,
    ...customOverrides,
    fanBands: {
      ...base.fanBands,
      ...(presetFanBands ?? {}),
      ...(customFanBands ?? {}),
    },
  };

  // If consensus was overridden but fanBands.mean was not explicitly set,
  // sync fanBands.mean to the resolved consensus color
  if (!customFanBands?.mean && !presetFanBands?.mean && (presetOverrides?.consensus || customOverrides?.consensus)) {
    merged.fanBands.mean = merged.consensus;
  }

  return merged;
}
