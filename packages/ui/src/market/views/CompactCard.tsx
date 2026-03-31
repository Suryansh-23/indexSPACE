import React, { useContext } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber, getStatusConfig, formatConsensus, formatRange } from './viewUtils.js';
import '../../styles/base.css';

export interface CompactCardProps {
  market: MarketState;
  onSelect?: (marketId: number) => void;
}

export function CompactCard({ market, onSelect }: CompactCardProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('CompactCard must be used within FunctionSpaceProvider');

  const status = getStatusConfig(market.resolutionState);

  return (
    <div
      className="fs-compact-card"
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
      {/* Header: title + status dot */}
      <div className="fs-compact-card-header">
        <h3 className="fs-compact-card-title">{market.title}</h3>
        <span
          className="fs-compact-card-dot"
          style={{ background: status.color }}
          title={status.label}
        />
      </div>

      {/* Consensus */}
      <div className="fs-compact-card-consensus">
        <span className="fs-compact-card-value">{formatConsensus(market)}</span>
        <span className="fs-compact-card-units">{market.xAxisUnits}</span>
      </div>

      {/* Range */}
      <span className="fs-compact-card-range">{formatRange(market)}</span>

      {/* Bottom stats strip */}
      <div className="fs-compact-card-stats">
        <span className="fs-compact-card-stat">Vol {formatCompactNumber(market.totalVolume)}</span>
        <span className="fs-compact-card-stat-separator" />
        <span className="fs-compact-card-stat">Liq {formatCompactNumber(market.poolBalance)}</span>
        <span className="fs-compact-card-stat-separator" />
        <span className="fs-compact-card-stat">{market.positionsOpen} pos</span>
      </div>
    </div>
  );
}
