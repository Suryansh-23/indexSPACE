import { DARK_THEME } from '@functionspace/react';

// Chart colors - these need concrete values for Recharts
// They use the dark theme as defaults; CSS variables handle actual theming
export const CHART_COLORS = {
  consensus: DARK_THEME.primary,
  preview: DARK_THEME.accent,
  payout: DARK_THEME.positive,
  positions: [DARK_THEME.positive, DARK_THEME.negative, '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#06b6d4'],
} as const;
