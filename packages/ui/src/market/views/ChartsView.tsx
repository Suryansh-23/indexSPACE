import React, { useContext, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FunctionSpaceContext } from '@functionspace/react';
import type { MarketState } from '@functionspace/core';
import { formatCompactNumber } from './viewUtils.js';
import '../../styles/base.css';

export interface ChartsViewProps {
  markets: MarketState[];
  onSelect?: (marketId: number) => void;
}

type Metric = 'volume' | 'liquidity' | 'traders';

const METRIC_OPTIONS: { key: Metric; label: string }[] = [
  { key: 'volume', label: 'Volume' },
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'traders', label: 'Traders' },
];

function getMetricValue(market: MarketState, metric: Metric): number {
  switch (metric) {
    case 'volume': return market.totalVolume;
    case 'liquidity': return market.poolBalance;
    case 'traders': return market.positionsOpen;
  }
}

function getCategory(market: MarketState): string {
  const cats = market.metadata?.categories as string[] | undefined;
  return cats?.[0] || 'General';
}

interface BarDatum {
  name: string;
  value: number;
  marketId: number;
  category: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BarDatum }>;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  metricLabel: string;
  getCatColor: (category: string) => string;
}

function CustomTooltip({
  active,
  payload,
  tooltipBg,
  tooltipBorder,
  tooltipText,
  metricLabel,
  getCatColor,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        borderRadius: 6,
        padding: '8px 12px',
        color: tooltipText,
        fontSize: '0.8125rem',
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 4 }}>{data.name}</p>
      <p style={{ margin: 0, color: getCatColor(data.category) }}>
        {metricLabel}: {formatCompactNumber(data.value)}
      </p>
    </div>
  );
}

export function ChartsView({ markets, onSelect }: ChartsViewProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('ChartsView must be used within FunctionSpaceProvider');

  const [metric, setMetric] = useState<Metric>('volume');

  const barData = useMemo((): BarDatum[] => {
    return markets
      .map(m => ({
        name: m.title.length > 30 ? m.title.slice(0, 27) + '...' : m.title,
        value: getMetricValue(m, metric),
        marketId: m.marketId,
        category: getCategory(m),
      }))
      .sort((a, b) => b.value - a.value);
  }, [markets, metric]);

  // Top 3 summary
  const top3 = barData.slice(0, 3);

  // Unique categories for legend
  const categories = useMemo(() => {
    const set = new Set(barData.map(d => d.category));
    return Array.from(set);
  }, [barData]);

  const getCatColor = (category: string): string => {
    return ctx.chartColors.categoryColors[category] || ctx.chartColors.consensus;
  };

  const metricLabel = METRIC_OPTIONS.find(o => o.key === metric)?.label ?? '';

  return (
    <div className="fs-charts-view">
      {/* Metric toggle */}
      <div className="fs-charts-metric-toggle">
        {METRIC_OPTIONS.map(opt => (
          <button
            key={opt.key}
            className={`fs-charts-metric-btn${metric === opt.key ? ' active' : ''}`}
            onClick={() => setMetric(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Top 3 summary cards */}
      {top3.length > 0 && (
        <div className="fs-charts-top3">
          {top3.map((item, i) => (
            <div
              key={item.marketId}
              className="fs-charts-top3-card"
              role="button"
              aria-label={item.name}
              tabIndex={0}
              onClick={() => onSelect?.(item.marketId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.key === ' ') e.preventDefault();
                  onSelect?.(item.marketId);
                }
              }}
            >
              <span className="fs-charts-top3-rank">#{i + 1}</span>
              <span className="fs-charts-top3-name">{item.name}</span>
              <span className="fs-charts-top3-value">{formatCompactNumber(item.value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bar chart */}
      <div className="fs-charts-bar-container" style={{ height: Math.max(300, barData.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={ctx.chartColors.grid}
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: ctx.chartColors.axisText, fontSize: 11 }}
              tickFormatter={(v: number) => formatCompactNumber(v)}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: ctx.chartColors.axisText, fontSize: 11 }}
              width={160}
            />
            <Tooltip
              content={
                <CustomTooltip
                  tooltipBg={ctx.chartColors.tooltipBg}
                  tooltipBorder={ctx.chartColors.tooltipBorder}
                  tooltipText={ctx.chartColors.tooltipText}
                  metricLabel={metricLabel}
                  getCatColor={getCatColor}
                />
              }
              cursor={{ fill: `${ctx.chartColors.grid}08` }}
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              onClick={(data: any) => {
                if (data?.marketId && onSelect) {
                  onSelect(data.marketId);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {barData.map((entry) => (
                <Cell
                  key={entry.marketId}
                  fill={getCatColor(entry.category)}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="fs-charts-legend">
        {categories.map(cat => (
          <span key={cat} className="fs-charts-legend-item">
            <span className="fs-charts-legend-swatch" style={{ background: getCatColor(cat) }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
