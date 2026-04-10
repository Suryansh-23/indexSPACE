import type { MarketState } from '@functionspace/core';

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatValue(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export interface StatusConfig {
  color: string;
  glow: string;
  label: string;
}

export function getStatusConfig(resolutionState: string): StatusConfig {
  switch (resolutionState) {
    case 'open':
      return {
        color: 'var(--fs-positive)',
        glow: 'var(--fs-positive)',
        label: 'Active',
      };
    case 'resolved':
      return {
        color: 'var(--fs-negative)',
        glow: 'var(--fs-negative)',
        label: 'Resolved',
      };
    default:
      return {
        color: 'var(--fs-accent)',
        glow: 'var(--fs-accent)',
        label: 'Voided',
      };
  }
}

export function formatConsensus(market: MarketState): string {
  if (!Number.isFinite(market.consensusMean)) return '--';
  return market.consensusMean.toLocaleString('en-US', { maximumFractionDigits: market.decimals });
}

export function formatRange(market: MarketState): string {
  return `${market.config.lowerBound.toLocaleString()} - ${market.config.upperBound.toLocaleString()}`;
}
