import React, { useContext, useMemo, useId } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import { evaluateDensityCurve } from '@functionspace/core';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber, getStatusConfig, formatConsensus, formatRange } from './viewUtils.js';
import '../../styles/base.css';

export interface PulseCardProps {
  market: MarketState;
  onSelect?: (marketId: number) => void;
}

export function PulseCard({ market, onSelect }: PulseCardProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('PulseCard must be used within FunctionSpaceProvider');

  const uniqueId = useId();
  const gradientId = `${uniqueId}-sparkline-grad`;

  const status = getStatusConfig(market.resolutionState);

  const sparklinePoints = useMemo(() => {
    if (!market.consensus || market.consensus.length === 0) return '';
    const { lowerBound, upperBound } = market.config;
    if (lowerBound >= upperBound) return '';
    const curve = evaluateDensityCurve(market.consensus, lowerBound, upperBound, 60);
    if (curve.length === 0) return '';

    const maxY = Math.max(...curve.map(p => p.y), 0.001);
    const svgWidth = 200;
    const svgHeight = 80;
    const padding = 4;
    const plotW = svgWidth - padding * 2;
    const plotH = svgHeight - padding * 2;

    return curve.map((p, i) => {
      const x = padding + (i / (curve.length - 1)) * plotW;
      const y = svgHeight - padding - (p.y / maxY) * plotH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [market.consensus, market.config]);

  const areaPath = useMemo(() => {
    if (!sparklinePoints) return '';
    return `${sparklinePoints} L200,80 L4,80 Z`;
  }, [sparklinePoints]);

  return (
    <div
      className="fs-pulse-card"
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
      <div className="fs-pulse-card-left">
        <span
          className="fs-pulse-card-badge"
          style={{
            color: status.color,
            background: `color-mix(in srgb, ${status.color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${status.color} 30%, transparent)`,
          }}
        >
          {status.label}
        </span>

        <h3 className="fs-pulse-card-title">{market.title}</h3>

        <div className="fs-pulse-card-stats">
          <div className="fs-pulse-card-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span>{formatCompactNumber(market.totalVolume)}</span>
          </div>
          <div className="fs-pulse-card-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
              <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
            </svg>
            <span>{formatCompactNumber(market.poolBalance)}</span>
          </div>
          <div className="fs-pulse-card-stat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{market.positionsOpen}</span>
          </div>
        </div>
      </div>

      {/* Right section - sparkline */}
      <div className="fs-pulse-card-right">
        <span className="fs-pulse-card-consensus-label">Market Consensus</span>
        <span className="fs-pulse-card-consensus-value">
          {formatConsensus(market)} <span className="fs-pulse-card-consensus-units">{market.xAxisUnits}</span>
        </span>
        {sparklinePoints && (
          <svg
            className="fs-pulse-card-sparkline"
            viewBox="0 0 200 80"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ctx.chartColors.consensus} stopOpacity={0.3} />
                <stop offset="100%" stopColor={ctx.chartColors.consensus} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={sparklinePoints} fill="none" stroke={ctx.chartColors.consensus} strokeWidth="2" />
          </svg>
        )}
      </div>
    </div>
  );
}
