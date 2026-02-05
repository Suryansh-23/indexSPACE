import React, { useContext, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { evaluateDensityCurve } from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useConsensus } from '@functionspace/react';
import { CHART_COLORS } from '../theme.js';
import '../styles/base.css';

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
}

interface ChartPoint {
  x: number;
  consensus: number;
  preview?: number;
  payout?: number;
  [key: string]: number | undefined;
}

export function ConsensusChart({ marketId, height = 400, showStats = true, overlayCurves }: ConsensusChartProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('ConsensusChart must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { consensus, loading, error } = useConsensus(marketId, 100);

  // Build chart data merging consensus, preview belief, payout, and overlays
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!consensus) return [];

    const points: ChartPoint[] = consensus.points.map((p) => ({
      x: Math.round(p.x * 100) / 100,
      consensus: p.y,
    }));

    // Add preview belief overlay (from trade panel)
    if (ctx.previewBelief && market) {
      const { L, H } = market.config;
      const previewCurve = evaluateDensityCurve(ctx.previewBelief, L, H, points.length);
      for (let i = 0; i < points.length && i < previewCurve.length; i++) {
        points[i].preview = previewCurve[i].y;
      }
    }

    // Add overlay curves (passed via props)
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
  }, [consensus, ctx.previewBelief, ctx.previewPayout, overlayCurves, market]);

  // Dynamic Y-axis domain for density
  const densityDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 0.1];
    let max = 0;
    for (const d of chartData) {
      if (d.consensus > max) max = d.consensus;
      if (d.preview !== undefined && d.preview > max) max = d.preview;
      // Check overlay values
      if (overlayCurves) {
        for (const overlay of overlayCurves) {
          const val = d[overlay.id];
          if (val !== undefined && val > max) max = val;
        }
      }
    }
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

  if (loading) {
    return (
      <div className="fs-chart-container" style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-text-secondary)' }}>Loading consensus data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fs-chart-container" style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-negative)' }}>Error: {error.message}</span>
      </div>
    );
  }

  return (
    <div className="fs-chart-container" style={{ height }}>
      <div className="fs-chart-header">
        <h3 className="fs-chart-title">{market?.title || 'Consensus'}</h3>
        <p className="fs-chart-subtitle">
          {hasPreview
            ? 'Compare market consensus with your trade preview'
            : 'Current market probability density'}
        </p>
      </div>

      <div className="fs-chart-body">
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

            {/* Preview area — yellow dashed */}
            {hasPreview && (
              <Area
                yAxisId="left"
                type="monotone"
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
      </div>
    </div>
  );
}
