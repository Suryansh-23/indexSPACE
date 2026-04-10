import React, { useContext, useMemo, useState, useCallback } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { transformHistoryToFanChart } from '@functionspace/core';
import type { MarketState, FanChartPoint } from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useMarketHistory, useChartZoom, rechartsPlotArea } from '@functionspace/react';
import '../styles/base.css';

// ── Band configuration (static metadata, colors resolved at render time) ──

const BAND_DEFS = [
  { key: 'band95', label: '95% CI', dataKey: 'band95' as const, colorKey: 'band95' as const },
  { key: 'band75', label: '75% CI', dataKey: 'band75' as const, colorKey: 'band75' as const },
  { key: 'band50', label: '50% CI', dataKey: 'band50' as const, colorKey: 'band50' as const },
  { key: 'band25', label: '25% CI', dataKey: 'band25' as const, colorKey: 'band25' as const },
] as const;

const TIME_FILTERS = [
  { value: 'all', label: 'All' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

function getFilterCutoff(filter: string): number {
  const now = Date.now();
  switch (filter) {
    case '24h': return now - 24 * 60 * 60 * 1000;
    case '7d': return now - 7 * 24 * 60 * 60 * 1000;
    case '30d': return now - 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

// ── Chart data point with Recharts band tuples ──

interface TimelineDataPoint extends FanChartPoint {
  band95: [number, number];
  band75: [number, number];
  band50: [number, number];
  band25: [number, number];
}

// ── Content component (used by MarketCharts) ──

export interface TimelineChartContentProps {
  marketId: string | number;
  market: MarketState;
  height: number;
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  zoomable?: boolean;
}

export function TimelineChartContent({
  marketId,
  market,
  height,
  timeFilter,
  onTimeFilterChange,
  zoomable,
}: TimelineChartContentProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('TimelineChartContent must be used within FunctionSpaceProvider');

  const { history, loading } = useMarketHistory(marketId);
  const [hiddenBands, setHiddenBands] = useState<Set<string>>(new Set());
  const fanBandColors = ctx.chartColors.fanBands;

  const { lowerBound, upperBound } = market.config;
  const decimals = market.decimals ?? 0;

  // Transform and filter data
  const chartData = useMemo<TimelineDataPoint[]>(() => {
    if (!history?.snapshots?.length) return [];

    // Filter by time
    const cutoff = getFilterCutoff(timeFilter);
    const filtered = cutoff > 0
      ? history.snapshots.filter(s => new Date(s.createdAt).getTime() >= cutoff)
      : history.snapshots;

    if (filtered.length === 0) return [];

    // Transform to fan chart points
    const fanPoints = transformHistoryToFanChart(filtered, lowerBound, upperBound);

    if (fanPoints.length < 2) {
      // Synthetic flat-line for <2 points
      if (fanPoints.length === 1) {
        const pt = fanPoints[0];
        const now = Date.now();
        return [pt, { ...pt, timestamp: now }].map(p => ({
          ...p,
          band95: [p.percentiles.p2_5, p.percentiles.p97_5] as [number, number],
          band75: [p.percentiles.p12_5, p.percentiles.p87_5] as [number, number],
          band50: [p.percentiles.p25, p.percentiles.p75] as [number, number],
          band25: [p.percentiles.p37_5, p.percentiles.p62_5] as [number, number],
        }));
      }
      return [];
    }

    // Add band tuples for Recharts
    const data: TimelineDataPoint[] = fanPoints.map(p => ({
      ...p,
      band95: [p.percentiles.p2_5, p.percentiles.p97_5],
      band75: [p.percentiles.p12_5, p.percentiles.p87_5],
      band50: [p.percentiles.p25, p.percentiles.p75],
      band25: [p.percentiles.p37_5, p.percentiles.p62_5],
    }));

    // Extend last point to now
    const last = data[data.length - 1];
    const now = Date.now();
    if (last.timestamp < now) {
      data.push({ ...last, timestamp: now });
    }

    return data;
  }, [history, timeFilter, lowerBound, upperBound]);

  // Compute Y domain
  const yDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [lowerBound, upperBound];
    let min = Infinity;
    let max = -Infinity;
    for (const d of chartData) {
      if (d.band95[0] < min) min = d.band95[0];
      if (d.band95[1] > max) max = d.band95[1];
    }
    const padding = (max - min) * 0.05;
    return [
      Math.max(lowerBound, min - padding),
      Math.min(upperBound, max + padding),
    ];
  }, [chartData, lowerBound, upperBound]);

  // Zoom support
  const fullXDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 1];
    return [chartData[0].timestamp, chartData[chartData.length - 1].timestamp];
  }, [chartData]);

  const getPlotArea = useMemo(() => rechartsPlotArea({ left: 10, right: 15 }, 60), []);

  const zoomComputeYDomain = useCallback((visible: any[], _full: any[]) => {
    if (!visible.length) return [lowerBound, upperBound] as [number, number];
    let min = Infinity, max = -Infinity;
    for (const d of visible) {
      if (d.band95[0] < min) min = d.band95[0];
      if (d.band95[1] > max) max = d.band95[1];
    }
    const padding = (max - min) * 0.05;
    return [Math.max(lowerBound, min - padding), Math.min(upperBound, max + padding)] as [number, number];
  }, [lowerBound, upperBound]);

  const zoom = useChartZoom({
    data: chartData,
    xKey: 'timestamp',
    fullXDomain,
    getPlotArea,
    computeYDomain: zoomComputeYDomain,
    resetTrigger: timeFilter,
    enabled: zoomable,
  });

  const effectiveYDomain = (zoomable && zoom.isZoomed && zoom.yDomain) ? zoom.yDomain : yDomain;

  // X-axis tick formatter
  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const range = timeFilter === '24h' ? 'time' : 'date';
    if (range === 'time') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const toggleBand = (bandKey: string) => {
    setHiddenBands(prev => {
      const next = new Set(prev);
      if (next.has(bandKey)) {
        next.delete(bandKey);
      } else {
        next.add(bandKey);
      }
      return next;
    });
  };

  const FanChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as TimelineDataPoint | undefined;
    if (!point) return null;

    const date = new Date(point.timestamp);
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="fs-tooltip">
        <p className="fs-tooltip-label">{dateStr} {timeStr}</p>
        <p className="fs-tooltip-row" style={{ color: fanBandColors.mean }}>
          Mean: {point.mean.toFixed(decimals)}
        </p>
        <p className="fs-tooltip-row" style={{ color: 'var(--fs-text-secondary)' }}>
          Median (p50): {point.percentiles.p50.toFixed(decimals)}
        </p>
        <p className="fs-tooltip-row" style={{ color: 'var(--fs-text-secondary)' }}>
          50% CI: {point.percentiles.p25.toFixed(decimals)} - {point.percentiles.p75.toFixed(decimals)}
        </p>
        <p className="fs-tooltip-row" style={{ color: 'var(--fs-text-secondary)' }}>
          95% CI: {point.percentiles.p2_5.toFixed(decimals)} - {point.percentiles.p97_5.toFixed(decimals)}
        </p>
      </div>
    );
  };

  return (
    <>
      <div className="fs-chart-timeline-subheader">
        <div>
          <h4 className="fs-chart-distribution-title">Market Evolution</h4>
          <p className="fs-chart-distribution-subtitle">
            Consensus percentile bands over time ({chartData.length > 0 ? chartData.length : 0} snapshots)
          </p>
        </div>
        <div className="fs-chart-time-filters">
          {TIME_FILTERS.map(f => (
            <button
              key={f.value}
              className={`fs-chart-time-filter-btn ${timeFilter === f.value ? 'active' : ''}`}
              onClick={() => onTimeFilterChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fs-chart-body" ref={zoom.containerRef} {...zoom.containerProps} style={{ height, position: 'relative', ...zoom.containerProps.style }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fs-text-secondary)' }}>
            Loading history data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fs-text-secondary)' }}>
            No history data available for this time range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 15, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={ctx.chartColors.grid} vertical={false} />

              <XAxis
                dataKey="timestamp"
                type="number"
                domain={zoomable ? zoom.xDomain : ['dataMin', 'dataMax']}
                allowDataOverflow={zoomable && zoom.isZoomed}
                tick={{ fill: ctx.chartColors.axisText, fontSize: 11 }}
                tickFormatter={formatTimestamp}
                label={{
                  value: 'Time',
                  position: 'insideBottom',
                  offset: -15,
                  fill: ctx.chartColors.axisText,
                  fontSize: 12,
                }}
              />

              <YAxis
                domain={effectiveYDomain}
                tick={{ fill: ctx.chartColors.axisText, fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(decimals)}
                label={{
                  value: `Outcome${market.xAxisUnits ? ` (${market.xAxisUnits})` : ''}`,
                  angle: -90,
                  position: 'insideLeft',
                  fill: ctx.chartColors.axisText,
                  fontSize: 11,
                  dy: 50,
                }}
              />

              <Tooltip
                content={<FanChartTooltip />}
                cursor={{ stroke: ctx.chartColors.crosshair, strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              {/* Bands: widest first (95% → 25%) so narrower bands paint on top */}
              {BAND_DEFS.map(band => (
                !hiddenBands.has(band.key) && (
                  <Area
                    key={band.key}
                    type="linear"
                    dataKey={band.dataKey}
                    stroke="none"
                    fill={fanBandColors[band.colorKey]}
                    fillOpacity={1}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                )
              ))}

              {/* Mean line */}
              <Line
                type="linear"
                dataKey="mean"
                stroke={fanBandColors.mean}
                strokeWidth={2}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* End-of-series annotation */}
        {chartData.length > 0 && !loading && (
          <div className="fs-chart-fan-annotation">
            <span style={{ color: fanBandColors.mean, fontSize: '0.6875rem', fontWeight: 600 }}>
              {chartData[chartData.length - 1].mean.toFixed(decimals)}
            </span>
          </div>
        )}
      </div>

      {/* Interactive legend */}
      <div className="fs-chart-fan-legend">
        <div
          className={`fs-chart-fan-legend-item`}
          style={{ cursor: 'default' }}
        >
          <span className="fs-chart-fan-legend-swatch" style={{ background: fanBandColors.mean, width: '16px', height: '2px' }} />
          <span style={{ fontSize: '0.6875rem', color: 'var(--fs-text-secondary)' }}>Mean</span>
        </div>
        {BAND_DEFS.map(band => (
          <div
            key={band.key}
            className={`fs-chart-fan-legend-item ${hiddenBands.has(band.key) ? 'hidden' : ''}`}
            onClick={() => toggleBand(band.key)}
          >
            <span className="fs-chart-fan-legend-swatch" style={{ background: fanBandColors[band.colorKey] }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--fs-text-secondary)' }}>{band.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Standalone component ──

export interface TimelineChartProps {
  marketId: string | number;
  height?: number;
  zoomable?: boolean;
}

export function TimelineChart({
  marketId,
  height = 300,
  zoomable,
}: TimelineChartProps) {
  const { market, loading, error } = useMarket(marketId);
  const [timeFilter, setTimeFilter] = useState('all');

  if (loading) {
    return (
      <div className="fs-chart-container" style={{ minHeight: height, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-text-secondary)' }}>Loading market data...</span>
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

  if (!market) return null;

  return (
    <div className="fs-chart-container">
      <div className="fs-chart-header">
        <div className="fs-chart-header-row">
          <div>
            <h3 className="fs-chart-title">{market.title || 'Timeline'}</h3>
            <p className="fs-chart-subtitle">Consensus evolution over time</p>
          </div>
        </div>
      </div>
      <TimelineChartContent
        marketId={marketId}
        market={market}
        height={height}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        zoomable={zoomable}
      />
    </div>
  );
}
