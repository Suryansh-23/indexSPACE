import React, { useContext, useState, useMemo, useId } from 'react';
import { FunctionSpaceContext } from '@functionspace/react';
import { treemapLayout, evaluateDensityCurve } from '@functionspace/core';
import type { MarketState, TreemapItem } from '@functionspace/core';
import { formatCompactNumber } from './viewUtils.js';
import '../../styles/base.css';

export interface HeatmapViewProps {
  markets: MarketState[];
  onSelect?: (marketId: number) => void;
}

interface CategoryGroup extends TreemapItem {
  category: string;
  markets: MarketState[];
  value: number;
}

interface MarketBlock extends TreemapItem {
  market: MarketState;
  value: number;
}

const CONTAINER_HEIGHT = 520;

function getSizeClass(w: number, h: number): string {
  const area = w * h;
  if (area > 0.5) return 'huge';
  if (area > 0.2) return 'large';
  if (area > 0.08) return 'medium';
  return 'small';
}

const MiniSparkline = React.memo(function MiniSparkline({
  market,
  color,
  gradientId,
}: {
  market: MarketState;
  color: string;
  gradientId: string;
}) {
  const { lowerBound, upperBound } = market.config;
  if (lowerBound >= upperBound) return null;
  const curve = evaluateDensityCurve(market.consensus, lowerBound, upperBound, 30);
  if (curve.length === 0) return null;

  const maxY = Math.max(...curve.map(p => p.y), 0.001);

  const linePath = curve.map((p, i) => {
    const x = (i / (curve.length - 1)) * 100;
    const y = 100 - (p.y / maxY) * 80;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPath = `${linePath} L100,100 L0,100 Z`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="fs-heatmap-sparkline">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
});

export function HeatmapView({ markets, onSelect }: HeatmapViewProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('HeatmapView must be used within FunctionSpaceProvider');

  const uniqueId = useId();
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  // Group markets by category
  const categoryGroups = useMemo(() => {
    const groups: Record<string, MarketState[]> = {};
    for (const m of markets) {
      const cats = (m.metadata?.categories as string[]) || ['General'];
      for (const cat of cats) {
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(m);
      }
    }
    return Object.entries(groups).map(([category, mkts]): CategoryGroup => ({
      category,
      markets: mkts,
      value: mkts.reduce((sum, m) => sum + m.totalVolume, 0),
    }));
  }, [markets]);

  const getCategoryColor = (category: string): string => {
    return ctx.chartColors.categoryColors[category] || ctx.chartColors.consensus;
  };

  // Derive safe drill category: if drillCategory not found in data, treat as null (auto-back to overview)
  const safeDrillCategory = drillCategory !== null && categoryGroups.some(g => g.category === drillCategory)
    ? drillCategory
    : null;

  // Category overview
  if (safeDrillCategory === null) {
    const containerW = 1; // normalized
    const containerH = 1;
    const rects = treemapLayout(categoryGroups, 0, 0, containerW, containerH);

    return (
      <div className="fs-heatmap-view">
        <div className="fs-heatmap-container" style={{ height: CONTAINER_HEIGHT }}>
          {rects.map((rect) => {
            const color = getCategoryColor(rect.item.category);
            const sizeClass = getSizeClass(rect.w, rect.h);

            return (
              <div
                key={rect.item.category}
                className={`fs-heatmap-block fs-heatmap-block-${sizeClass}`}
                role="button"
                aria-label={`${rect.item.category} category`}
                tabIndex={0}
                onClick={() => setDrillCategory(rect.item.category)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    setDrillCategory(rect.item.category);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${(rect.x * 100).toFixed(2)}%`,
                  top: `${(rect.y * 100).toFixed(2)}%`,
                  width: `${(rect.w * 100).toFixed(2)}%`,
                  height: `${(rect.h * 100).toFixed(2)}%`,
                  background: `color-mix(in srgb, ${color} 12%, var(--fs-surface))`,
                  borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
                }}
              >
                <span className="fs-heatmap-block-title">{rect.item.category}</span>
                <span className="fs-heatmap-block-count">
                  {rect.item.markets.length} market{rect.item.markets.length !== 1 ? 's' : ''}
                </span>
                {(sizeClass === 'huge' || sizeClass === 'large') && (
                  <span className="fs-heatmap-block-volume">
                    Vol {formatCompactNumber(rect.item.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="fs-heatmap-legend">
          {categoryGroups.map(g => (
            <span key={g.category} className="fs-heatmap-legend-item">
              <span
                className="fs-heatmap-legend-swatch"
                style={{ background: getCategoryColor(g.category) }}
              />
              {g.category}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Drill-down: market-level treemap within selected category
  const group = categoryGroups.find(g => g.category === safeDrillCategory)!;

  const marketBlocks: MarketBlock[] = group.markets.map(m => ({
    market: m,
    value: m.totalVolume,
  }));

  const rects = treemapLayout(marketBlocks, 0, 0, 1, 1);
  const catColor = getCategoryColor(safeDrillCategory);

  return (
    <div className="fs-heatmap-view">
      {/* Drill-down header */}
      <div className="fs-heatmap-drill-header">
        <button
          className="fs-heatmap-back-btn"
          onClick={() => setDrillCategory(null)}
        >
          &larr; Back
        </button>
        <h3 className="fs-heatmap-drill-title" style={{ color: catColor }}>
          {safeDrillCategory}
        </h3>
        <span className="fs-heatmap-drill-count">
          {group.markets.length} market{group.markets.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="fs-heatmap-container" style={{ height: CONTAINER_HEIGHT }}>
        {rects.map((rect) => {
          const sizeClass = getSizeClass(rect.w, rect.h);
          const showSparkline = sizeClass === 'medium' || sizeClass === 'large' || sizeClass === 'huge';
          const sparkGradId = `${uniqueId}-spark-${rect.item.market.marketId}`;

          return (
            <div
              key={rect.item.market.marketId}
              className={`fs-heatmap-block fs-heatmap-block-${sizeClass}`}
              role="button"
              aria-label={rect.item.market.title}
              tabIndex={0}
              onClick={() => onSelect?.(rect.item.market.marketId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') e.preventDefault();
                  onSelect?.(rect.item.market.marketId);
                }
              }}
              style={{
                position: 'absolute',
                left: `${(rect.x * 100).toFixed(2)}%`,
                top: `${(rect.y * 100).toFixed(2)}%`,
                width: `${(rect.w * 100).toFixed(2)}%`,
                height: `${(rect.h * 100).toFixed(2)}%`,
                background: `color-mix(in srgb, ${catColor} 8%, var(--fs-surface))`,
                borderColor: `color-mix(in srgb, ${catColor} 25%, transparent)`,
              }}
            >
              <span className="fs-heatmap-block-title">{rect.item.market.title}</span>
              {(sizeClass !== 'small') && (
                <span className="fs-heatmap-block-volume">
                  Vol {formatCompactNumber(rect.item.market.totalVolume)}
                </span>
              )}
              {showSparkline && rect.item.market.consensus.length > 0 && (
                <MiniSparkline
                  market={rect.item.market}
                  color={catColor}
                  gradientId={sparkGradId}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="fs-heatmap-legend">
        <span className="fs-heatmap-legend-item">
          <span className="fs-heatmap-legend-swatch" style={{ background: catColor }} />
          {safeDrillCategory}
        </span>
      </div>
    </div>
  );
}
