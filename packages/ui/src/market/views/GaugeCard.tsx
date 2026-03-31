import React, { useContext, useMemo, useId } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber, getStatusConfig, formatConsensus } from './viewUtils.js';
import '../../styles/base.css';

export interface GaugeCardProps {
  market: MarketState;
  onSelect?: (marketId: number) => void;
}

export function GaugeCard({ market, onSelect }: GaugeCardProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('GaugeCard must be used within FunctionSpaceProvider');

  const uniqueId = useId();
  const gaugeGradId = `${uniqueId}-gauge-grad`;

  const status = getStatusConfig(market.resolutionState);

  const gaugeData = useMemo(() => {
    const { lowerBound, upperBound } = market.config;
    const range = upperBound - lowerBound;
    const ratio = range > 0
      ? (market.consensusMean - lowerBound) / range
      : 0;
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    // 270-degree arc
    const totalAngle = 270;
    const startAngle = 135; // degrees from positive x-axis (bottom-left)
    const radius = 42;
    const cx = 55;
    const cy = 55;

    // Background arc (full 270)
    const bgStartRad = (startAngle * Math.PI) / 180;
    const bgEndRad = ((startAngle + totalAngle) * Math.PI) / 180;
    const bgX1 = cx + radius * Math.cos(bgStartRad);
    const bgY1 = cy + radius * Math.sin(bgStartRad);
    const bgX2 = cx + radius * Math.cos(bgEndRad);
    const bgY2 = cy + radius * Math.sin(bgEndRad);
    const bgLargeArc = totalAngle > 180 ? 1 : 0;
    const bgPath = `M${bgX1},${bgY1} A${radius},${radius} 0 ${bgLargeArc} 1 ${bgX2},${bgY2}`;

    // Filled arc (proportional to ratio)
    const fillAngle = totalAngle * clampedRatio;
    const fillEndRad = ((startAngle + fillAngle) * Math.PI) / 180;
    const fillX2 = cx + radius * Math.cos(fillEndRad);
    const fillY2 = cy + radius * Math.sin(fillEndRad);
    const fillLargeArc = fillAngle > 180 ? 1 : 0;
    const fillPath = fillAngle > 0
      ? `M${bgX1},${bgY1} A${radius},${radius} 0 ${fillLargeArc} 1 ${fillX2},${fillY2}`
      : '';

    return { bgPath, fillPath, cx, cy };
  }, [market.consensusMean, market.config]);

  return (
    <div
      className="fs-gauge-card"
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
      <div className="fs-gauge-card-left">
        <span
          className="fs-gauge-card-badge"
          style={{
            color: status.color,
            background: `color-mix(in srgb, ${status.color} 10%, transparent)`,
            borderColor: `color-mix(in srgb, ${status.color} 30%, transparent)`,
          }}
        >
          {status.label}
        </span>

        <h3 className="fs-gauge-card-title">{market.title}</h3>

        <div className="fs-gauge-card-stats">
          <div className="fs-gauge-card-stat">
            <span className="fs-gauge-card-stat-label">Volume</span>
            <span className="fs-gauge-card-stat-value">{formatCompactNumber(market.totalVolume)}</span>
          </div>
          <div className="fs-gauge-card-stat">
            <span className="fs-gauge-card-stat-label">Liquidity</span>
            <span className="fs-gauge-card-stat-value">{formatCompactNumber(market.poolBalance)}</span>
          </div>
          <div className="fs-gauge-card-stat">
            <span className="fs-gauge-card-stat-label">Positions</span>
            <span className="fs-gauge-card-stat-value">{market.positionsOpen}</span>
          </div>
        </div>
      </div>

      {/* Right section - gauge */}
      <div className="fs-gauge-card-right">
        <svg viewBox="0 0 110 110" className="fs-gauge-card-svg">
          <defs>
            <linearGradient id={gaugeGradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={ctx.chartColors.consensus} stopOpacity={0.6} />
              <stop offset="100%" stopColor={ctx.chartColors.consensus} stopOpacity={1} />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path
            d={gaugeData.bgPath}
            fill="none"
            stroke="var(--fs-border)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          {gaugeData.fillPath && (
            <path
              d={gaugeData.fillPath}
              fill="none"
              stroke={`url(#${gaugeGradId})`}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          {/* Center text */}
          <text
            x={gaugeData.cx}
            y={gaugeData.cy - 4}
            textAnchor="middle"
            dominantBaseline="central"
            fill={ctx.chartColors.consensus}
            fontSize="14"
            fontWeight="700"
          >
            {formatConsensus(market)}
          </text>
          <text
            x={gaugeData.cx}
            y={gaugeData.cy + 14}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--fs-text-secondary)"
            fontSize="9"
          >
            {market.xAxisUnits}
          </text>
        </svg>
      </div>
    </div>
  );
}
