import React, { useContext } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import '../styles/base.css';

export interface MarketCardProps {
  market: MarketState;
  onSelect?: (marketId: number) => void;
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatResolutionDate(expiresAt: string | null): string {
  if (!expiresAt) return 'Resolves TBD';
  const date = new Date(expiresAt);
  if (isNaN(date.getTime())) return 'Resolves TBD';
  return 'Resolves ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(state: MarketState['resolutionState']): string {
  if (state === 'open') return 'Active';
  if (state === 'resolved') return 'Resolved';
  return 'Voided';
}

export function MarketCard({ market, onSelect }: MarketCardProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MarketCard must be used within FunctionSpaceProvider');

  return (
    <div
      className="fs-market-card"
      role="button"
      aria-label={market.title}
      tabIndex={0}
      onClick={() => onSelect?.(market.marketId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.key === ' ') e.preventDefault();
          onSelect?.(market.marketId);
        }
      }}
    >
      <div className="fs-market-card-hover-overlay" />

      {/* Header: title + status badge */}
      <div className="fs-market-card-header">
        <h3 className="fs-market-card-title">{market.title}</h3>
        <span className={`fs-market-card-badge ${market.resolutionState}`}>
          {statusLabel(market.resolutionState)}
        </span>
      </div>

      {/* Consensus value */}
      <div className="fs-market-card-consensus">
        <div className="fs-market-card-consensus-header">
          <span className="fs-market-card-consensus-label">Market Consensus</span>
          <span className="fs-market-card-consensus-range">
            Range: {market.config.lowerBound.toLocaleString()} - {market.config.upperBound.toLocaleString()}
          </span>
        </div>
        <div className="fs-market-card-consensus-value">
          {Number.isFinite(market.consensusMean) ? market.consensusMean.toLocaleString('en-US', { maximumFractionDigits: market.decimals }) : '--'} {market.xAxisUnits}
        </div>
      </div>

      {/* Stats grid: volume, liquidity, traders */}
      <div className="fs-market-card-stats">
        <div className="fs-market-card-stat">
          <span className="fs-market-card-stat-icon fs-market-card-stat-icon-volume">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </span>
          <span className="fs-market-card-stat-value">{formatCompactNumber(market.totalVolume)}</span>
          <span className="fs-market-card-stat-label">Volume</span>
        </div>
        <div className="fs-market-card-stat">
          <span className="fs-market-card-stat-icon fs-market-card-stat-icon-liquidity">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
              <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
            </svg>
          </span>
          <span className="fs-market-card-stat-value">{formatCompactNumber(market.poolBalance)}</span>
          <span className="fs-market-card-stat-label">Liquidity</span>
        </div>
        <div className="fs-market-card-stat">
          <span className="fs-market-card-stat-icon fs-market-card-stat-icon-traders">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="fs-market-card-stat-value">{market.positionsOpen}</span>
          <span className="fs-market-card-stat-label">Traders</span>
        </div>
      </div>

      {/* Footer: resolution date + trade button */}
      <div className="fs-market-card-footer">
        <span className="fs-market-card-date">
          {formatResolutionDate(market.expiresAt)}
        </span>
        <span
          className="fs-market-card-trade-btn"
          aria-hidden="true"
        >
          Trade
        </span>
      </div>
    </div>
  );
}
