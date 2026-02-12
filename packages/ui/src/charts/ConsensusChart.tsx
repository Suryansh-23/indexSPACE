import React, { useContext, useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts';
import { evaluateDensityCurve, calculateBucketDistribution } from '@functionspace/core';
import type { BucketData, MarketState } from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useConsensus } from '@functionspace/react';
import { CHART_COLORS } from '../theme.js';
import '../styles/base.css';

export type ChartView = 'consensus' | 'distribution';

export interface OverlayCurve {
  id: string;
  label: string;
  curve: Array<{ x: number; y: number }>;
  color?: string;
}

export interface ConsensusChartProps {
  marketId: string | number;
  height?: number;
  showStats?: boolean;
  overlayCurves?: OverlayCurve[];
  views?: ChartView[];
  defaultBucketCount?: number;
}

interface ChartPoint {
  x: number;
  consensus: number;
  preview?: number;
  payout?: number;
  [key: string]: number | undefined;
}

// ── Distribution bar chart (private sub-component) ──

function DistributionView({
  bucketData,
  market,
}: {
  bucketData: BucketData[];
  market: MarketState | null;
}) {
  const maxPercentage = useMemo(() => {
    if (!bucketData.length) return 10;
    return Math.max(...bucketData.map(b => b.percentage), 1);
  }, [bucketData]);

  const peakBucketIdx = useMemo(() => {
    if (!bucketData.length) return -1;
    let maxIdx = 0;
    let maxVal = 0;
    bucketData.forEach((b, i) => {
      if (b.percentage > maxVal) {
        maxVal = b.percentage;
        maxIdx = i;
      }
    });
    return maxIdx;
  }, [bucketData]);

  if (!bucketData.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fs-text-secondary)' }}>
        No distribution data available
      </div>
    );
  }

  const DistributionTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const data = payload[0].payload;
    return (
      <div className="fs-tooltip">
        <p className="fs-tooltip-label">
          Range: {data.range}{market?.xAxisUnits ? ` ${market.xAxisUnits}` : ''}
        </p>
        <p className="fs-tooltip-row" style={{ color: CHART_COLORS.consensus }}>
          Probability: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  };

  // Use a lighter variant of primary for the peak bar
  const peakColor = '#60a5fa';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={bucketData}
        margin={{ top: 5, right: 50, bottom: 5, left: 70 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--fs-border)"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          domain={[0, Math.ceil(maxPercentage * 1.15)]}
          tick={{ fill: 'var(--fs-text-secondary)', fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          axisLine={{ stroke: 'var(--fs-border)' }}
          tickLine={{ stroke: 'var(--fs-border)' }}
        />
        <YAxis
          type="category"
          dataKey="range"
          width={65}
          tick={{ fill: 'var(--fs-text-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--fs-border)' }}
          tickLine={false}
        />
        <Tooltip
          content={<DistributionTooltip />}
          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
        />
        <Bar
          dataKey="percentage"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        >
          {bucketData.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index === peakBucketIdx ? peakColor : CHART_COLORS.consensus}
              fillOpacity={index === peakBucketIdx ? 1 : 0.8}
            />
          ))}
          <LabelList
            dataKey="percentage"
            position="right"
            formatter={(v: number) => `${v.toFixed(0)}%`}
            fill="var(--fs-text-secondary)"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main chart component ──

export function ConsensusChart({
  marketId,
  height = 300,
  showStats = true,
  overlayCurves,
  views,
  defaultBucketCount = 12,
}: ConsensusChartProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('ConsensusChart must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { consensus, loading, error } = useConsensus(marketId, 100);

  // View management
  const effectiveViews: ChartView[] = views && views.length > 0 ? views : ['consensus'];
  const showTabs = effectiveViews.length > 1;
  const [activeView, setActiveView] = useState<ChartView>(effectiveViews[0]);

  // Bucket state (for distribution view)
  const [bucketCount, setBucketCount] = useState(defaultBucketCount);

  // Smart decimals for bucket labels: use 0 if bucket width >= 1, otherwise use market.decimals
  const bucketDecimals = useMemo(() => {
    if (!market) return 0;
    const bucketWidth = (market.config.H - market.config.L) / bucketCount;
    return bucketWidth >= 1 ? 0 : (market.decimals ?? 0);
  }, [market, bucketCount]);

  // Bucket calculation (only when distribution is an enabled view)
  const bucketData = useMemo<BucketData[]>(() => {
    if (!effectiveViews.includes('distribution')) return [];
    if (!consensus || !market) return [];
    return calculateBucketDistribution(
      consensus.points,
      market.config.L,
      market.config.H,
      bucketCount,
      bucketDecimals,
    );
  }, [consensus, market, bucketCount, bucketDecimals, effectiveViews]);

  // Build chart data merging consensus, preview belief, payout, and overlays
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!consensus) return [];

    const points: ChartPoint[] = consensus.points.map((p) => ({
      x: Math.round(p.x * 100) / 100,
      consensus: p.y,
    }));

    // Add preview belief overlay (from trade panel)
    // Uses coefficient-direct interpolation for sharp edges (not Bernstein polynomial which smooths)
    if (ctx.previewBelief && market) {
      const { L, H } = market.config;
      const previewCurve = evaluateDensityCurve(ctx.previewBelief, L, H, points.length);
      for (let i = 0; i < points.length && i < previewCurve.length; i++) {
        points[i].preview = previewCurve[i].y;
      }
    }

    // Add selected position curve from context (automatic component coordination)
    if (ctx.selectedPosition?.belief && market) {
      const { L, H } = market.config;
      const selectedCurve = evaluateDensityCurve(ctx.selectedPosition.belief, L, H, points.length);
      for (let i = 0; i < points.length && i < selectedCurve.length; i++) {
        points[i].selected = selectedCurve[i].y;
      }
    }

    // Add overlay curves (passed via props for advanced use)
    if (overlayCurves && market) {
      for (const overlay of overlayCurves) {
        for (let i = 0; i < points.length && i < overlay.curve.length; i++) {
          points[i][overlay.id] = overlay.curve[i].y;
        }
      }
    }

    // Add payout data (tooltip-only)
    if (ctx.previewPayout?.projections && market) {
      const projections = ctx.previewPayout.projections;
      for (const point of points) {
        let best = projections[0];
        let bestDist = Math.abs(best.outcome - point.x);
        for (let j = 1; j < projections.length; j++) {
          const dist = Math.abs(projections[j].outcome - point.x);
          if (dist < bestDist) {
            best = projections[j];
            bestDist = dist;
          }
        }
        const step = market ? (market.config.H - market.config.L) / (market.config.K || 50) : 1;
        if (bestDist < step * 2) {
          point.payout = best.payout;
        }
      }
    }

    return points;
  }, [consensus, ctx.previewBelief, ctx.previewPayout, ctx.selectedPosition, overlayCurves, market]);

  // Dynamic Y-axis domain for density
  // Caps preview influence so the consensus curve always remains visible
  const densityDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 0.1];
    let consensusMax = 0;
    let overlayMax = 0;
    for (const d of chartData) {
      if (d.consensus > consensusMax) consensusMax = d.consensus;
      if (d.preview !== undefined && d.preview > overlayMax) overlayMax = d.preview;
      if (d.selected !== undefined && d.selected > overlayMax) overlayMax = d.selected;
      if (overlayCurves) {
        for (const overlay of overlayCurves) {
          const val = d[overlay.id];
          if (val !== undefined && val > overlayMax) overlayMax = val;
        }
      }
    }
    // Preview/overlays can stretch the axis up to 4x consensus height
    // Beyond that, peaks get clipped — keeps consensus visible
    const cappedOverlay = Math.min(overlayMax, consensusMax * 4);
    const max = Math.max(consensusMax, cappedOverlay);
    return [0, max * 1.15];
  }, [chartData, overlayCurves]);

  // Payout Y-axis domain
  const payoutDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 100];
    let max = 0;
    for (const d of chartData) {
      if (d.payout !== undefined && d.payout > max) max = d.payout;
    }
    return [0, Math.max(max * 1.1, 10)];
  }, [chartData]);

  const hasPreview = ctx.previewBelief !== null;
  const hasSelected = ctx.selectedPosition !== null;
  const hasPayout = chartData.some((d) => d.payout !== undefined);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="fs-tooltip">
        <p className="fs-tooltip-label">Outcome: {Number(label).toFixed(4)}</p>
        {payload.map((entry: any, i: number) => {
          if (entry.dataKey === 'consensus') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: CHART_COLORS.consensus }}>
                Market Consensus: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'preview') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: CHART_COLORS.preview }}>
                Trade Preview: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'selected') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: '#10b981' }}>
                Selected Position: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'payout' && entry.value > 0) {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: CHART_COLORS.payout }}>
                Potential Payout: ${entry.value?.toFixed(2)}
              </p>
            );
          }
          // Handle overlay curves
          const overlay = overlayCurves?.find(o => o.id === entry.dataKey);
          if (overlay && entry.value !== undefined) {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: overlay.color || CHART_COLORS.payout }}>
                {overlay.label}: {entry.value?.toFixed(4)}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Subtitle text depends on active view
  const subtitle = hasPreview
    ? 'Compare market consensus with your trade preview'
    : 'Current market probability density';

  if (loading) {
    return (
      <div className="fs-chart-container" style={{ minHeight: height, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-text-secondary)' }}>Loading consensus data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fs-chart-container" style={{ minHeight: height, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-negative)' }}>Error: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="fs-chart-container">
      <div className="fs-chart-header">
        <div className="fs-chart-header-row">
          <div>
            <h3 className="fs-chart-title">{market?.title || 'Consensus'}</h3>
            <p className="fs-chart-subtitle">{subtitle}</p>
          </div>

          <div className="fs-chart-header-controls">
            {showTabs && (
              <div className="fs-chart-tabs">
                {effectiveViews.map((view) => (
                  <button
                    key={view}
                    className={`fs-chart-tab ${activeView === view ? 'active' : ''}`}
                    onClick={() => setActiveView(view)}
                  >
                    {view === 'consensus' ? 'Consensus' : 'Distribution'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="fs-chart-distribution-subheader" style={{ visibility: activeView === 'distribution' ? 'visible' : 'hidden' }}>
          <div>
            <h4 className="fs-chart-distribution-title">Aggregate Distribution</h4>
            <p className="fs-chart-distribution-subtitle">Probability mass across {bucketCount} outcome ranges</p>
          </div>
          <div className="fs-chart-bucket-control">
            <span className="fs-chart-bucket-label">
              Buckets: <span className="fs-chart-bucket-value">{bucketCount}</span>
            </span>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              value={bucketCount}
              onChange={(e) => setBucketCount(Number(e.target.value))}
              className="fs-chart-bucket-slider"
            />
          </div>
        </div>
      </div>

      <div className="fs-chart-body" style={{ height }}>
        {activeView === 'consensus' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 25, right: 15, left: 10, bottom: 30 }}>
              <defs>
                <linearGradient id="fsConsensusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.consensus} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={CHART_COLORS.consensus} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fsPreviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.preview} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.preview} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fsSelectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                {/* Dynamic gradients for overlay curves */}
                {overlayCurves?.map((overlay) => (
                  <linearGradient key={`grad-${overlay.id}`} id={`fsOverlayGrad-${overlay.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={overlay.color || CHART_COLORS.payout} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={overlay.color || CHART_COLORS.payout} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--fs-border)" vertical={false} />

              <XAxis
                dataKey="x"
                type="number"
                domain={['dataMin', 'dataMax']}
                tick={{ fill: 'var(--fs-text-secondary)', fontSize: 12 }}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{
                  value: `Outcome${market?.xAxisUnits ? ` (${market.xAxisUnits})` : ''}`,
                  position: 'insideBottom',
                  offset: -15,
                  fill: 'var(--fs-text-secondary)',
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="left"
                domain={densityDomain}
                tick={{ fill: 'var(--fs-text-secondary)', fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(3)}
                label={{
                  value: 'Probability Density',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--fs-text-secondary)',
                  fontSize: 11,
                  dy: 50,
                }}
              />

              {hasPayout && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={payoutDomain}
                  hide={true}
                />
              )}

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'var(--fs-border)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value: string) => {
                  if (value === 'consensus') return <span style={{ color: CHART_COLORS.consensus, fontSize: '0.75rem' }}>Market Consensus</span>;
                  if (value === 'preview') return <span style={{ color: CHART_COLORS.preview, fontSize: '0.75rem' }}>Trade Preview</span>;
                  if (value === 'selected') return <span style={{ color: '#10b981', fontSize: '0.75rem' }}>Selected Position</span>;
                  const overlay = overlayCurves?.find(o => o.id === value);
                  if (overlay) return <span style={{ color: overlay.color || CHART_COLORS.payout, fontSize: '0.75rem' }}>{overlay.label}</span>;
                  return null;
                }}
              />

              {/* Consensus area — blue */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="consensus"
                stroke={CHART_COLORS.consensus}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fsConsensusGrad)"
                name="consensus"
                isAnimationActive={false}
              />

              {/* Preview area — yellow dashed, linear interpolation for sharp edges */}
              {hasPreview && (
                <Area
                  yAxisId="left"
                  type="linear"
                  dataKey="preview"
                  stroke={CHART_COLORS.preview}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#fsPreviewGrad)"
                  name="preview"
                  animationDuration={300}
                />
              )}

              {/* Selected position — green (from context, automatic coordination) */}
              {hasSelected && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="selected"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fsSelectedGrad)"
                  name="selected"
                  animationDuration={300}
                />
              )}

              {/* Payout — tooltip-only, invisible line for data access */}
              {hasPayout && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="payout"
                  stroke="transparent"
                  strokeWidth={0}
                  fill="transparent"
                  name="payout"
                  connectNulls
                  legendType="none"
                />
              )}

              {/* Overlay curves — from props */}
              {overlayCurves?.map((overlay) => (
                <Area
                  key={overlay.id}
                  yAxisId="left"
                  type="monotone"
                  dataKey={overlay.id}
                  stroke={overlay.color || CHART_COLORS.payout}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#fsOverlayGrad-${overlay.id})`}
                  name={overlay.id}
                  animationDuration={300}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeView === 'distribution' && (
          <DistributionView
            bucketData={bucketData}
            market={market}
          />
        )}
      </div>
    </div>
  );
}
