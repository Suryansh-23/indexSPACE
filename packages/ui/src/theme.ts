import { FS_DARK } from '@functionspace/react';

/**
 * @deprecated Use `ctx.chartColors` from FunctionSpaceContext instead.
 * These static values are hardcoded to FS Dark and do not respond to theme changes.
 */
export const CHART_COLORS = {
  consensus: FS_DARK.primary,
  preview: FS_DARK.accent,
  payout: FS_DARK.positive,
  positions: [FS_DARK.positive, FS_DARK.negative, '#8b5cf6', '#f97316', '#14b8a6', '#ec4899', '#06b6d4'],
} as const;

/**
 * @deprecated Use `ctx.chartColors.fanBands` from FunctionSpaceContext instead.
 * These static values are hardcoded to FS Dark and do not respond to theme changes.
 */
export const FAN_BAND_COLORS = {
  mean: CHART_COLORS.consensus,
  band25: 'rgba(59,130,246,0.58)',
  band50: 'rgba(59,130,246,0.40)',
  band75: 'rgba(59,130,246,0.28)',
  band95: 'rgba(59,130,246,0.20)',
} as const;
