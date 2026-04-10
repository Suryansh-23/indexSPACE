import React, { useContext } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber, getStatusConfig, formatConsensus, formatRange } from './viewUtils.js';
import '../../styles/base.css';

export interface SplitCardProps {
  market: MarketState;
  onSelect?: (marketId: number) => void;
}

export function SplitCard({ market, onSelect }: SplitCardProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('SplitCard must be used within FunctionSpaceProvider');

  const status = getStatusConfig(market.resolutionState);

  return (
    <div
      className="fs-split-card"
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
      {/* Left section */}
      <div className="fs-split-card-left">
        <h3 className="fs-split-card-title">{market.title}</h3>

        <span
          className="fs-split-card-badge"
          style={{
            color: status.color,
            background: `color-mix(in srgb, ${status.color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${status.color} 30%, transparent)`,
          }}
        >
          {status.label}
        </span>

        <div className="fs-split-card-stats">
          <span className="fs-split-card-stat">
            <span className="fs-split-card-stat-label">Vol</span>
            <span className="fs-split-card-stat-value">{formatCompactNumber(market.totalVolume)}</span>
          </span>
          <span className="fs-split-card-stat">
            <span className="fs-split-card-stat-label">Liq</span>
            <span className="fs-split-card-stat-value">{formatCompactNumber(market.poolBalance)}</span>
          </span>
          <span className="fs-split-card-stat">
            <span className="fs-split-card-stat-label">Pos</span>
            <span className="fs-split-card-stat-value">{market.positionsOpen}</span>
          </span>
        </div>

        <span
          className="fs-split-card-trade-btn"
          aria-hidden="true"
        >
          Trade &gt;
        </span>
      </div>

      {/* Right section - hero value */}
      <div className="fs-split-card-right">
        <span className="fs-split-card-hero-value">{formatConsensus(market)}</span>
        <span className="fs-split-card-hero-units">{market.xAxisUnits}</span>
        <span className="fs-split-card-range-pill">{formatRange(market)}</span>
      </div>
    </div>
  );
}
