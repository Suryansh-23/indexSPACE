import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Customized,
  ResponsiveContainer,
} from 'recharts';
import {
  evaluateDensityCurve,
} from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useConsensus, useCustomShape, useChartZoom, rechartsPlotArea, useBuy, usePreviewPayout } from '@functionspace/react';
import type { TradeInputBaseProps } from './types.js';
import '../styles/base.css';

export interface CustomShapeEditorProps extends TradeInputBaseProps {
  defaultNumPoints?: number;
  zoomable?: boolean;
}

const ZOOM_PAN_EXCLUDE_SELECTORS = ['circle', '.recharts-active-dot'];

interface ChartPoint {
  x: number;
  consensus: number;
  belief?: number;
  selected?: number;
  payout?: number;
}

interface ControlDot {
  x: number;
  y: number;
  index: number;
  isLocked: boolean;
}

export function CustomShapeEditor({
  marketId,
  onBuy,
  onError,
  defaultNumPoints = 20,
  zoomable,
}: CustomShapeEditorProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('CustomShapeEditor must be used within FunctionSpaceProvider');

  const { market, loading: marketLoading, error: marketError } = useMarket(marketId);
  const { consensus } = useConsensus(marketId, 100);
  const shape = useCustomShape(market);
  const { execute: submitBuy, loading: isSubmitting, error: buyError } = useBuy(marketId);
  const { execute: previewPayout } = usePreviewPayout(marketId);

  const [amount, setAmount] = useState('100');
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Initialize numPoints from prop
  useEffect(() => {
    if (defaultNumPoints !== 20) {
      shape.setNumPoints(defaultNumPoints);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 1: Instant preview update
  useEffect(() => {
    ctx.setPreviewBelief(shape.pVector);
    if (!shape.pVector) {
      setPotentialPayout(null);
      ctx.setPreviewPayout(null);
    }
  }, [shape.pVector]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: Debounced payout preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const collateral = parseFloat(amount);
    if (!shape.pVector || isNaN(collateral) || collateral <= 0 || !market) {
      setPotentialPayout(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await previewPayout(shape.pVector!, collateral);
        if (!mountedRef.current) return;
        setPotentialPayout(result.maxPayout);
        ctx.setPreviewPayout(result);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!mountedRef.current) return;
        setPotentialPayout(null);
        ctx.setPreviewPayout(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [shape.pVector, amount, market, marketId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chart data: merge consensus + belief + selected position + payout
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!consensus || !market) return [];

    const points: ChartPoint[] = consensus.points.map((p) => ({
      x: Math.round(p.x * 100) / 100,
      consensus: p.y,
    }));

    if (shape.pVector) {
      const { L, H } = market.config;
      const beliefCurve = evaluateDensityCurve(shape.pVector, L, H, points.length);
      for (let i = 0; i < points.length && i < beliefCurve.length; i++) {
        points[i].belief = beliefCurve[i].y;
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

    // Add payout data (tooltip-only)
    if (ctx.previewPayout?.previews?.length && market) {
      const previews = ctx.previewPayout.previews;
      for (const point of points) {
        let best = previews[0];
        let bestDist = Math.abs(best.outcome - point.x);
        for (let j = 1; j < previews.length; j++) {
          const dist = Math.abs(previews[j].outcome - point.x);
          if (dist < bestDist) {
            best = previews[j];
            bestDist = dist;
          }
        }
        const step = (market.config.H - market.config.L) / (market.config.K || 50);
        if (bestDist < step * 2) {
          point.payout = best.payout;
        }
      }
    }

    return points;
  }, [consensus, market, shape.pVector, ctx.selectedPosition, ctx.previewPayout]);

  // Zoom support
  const csFullXDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 1];
    return [chartData[0].x, chartData[chartData.length - 1].x];
  }, [chartData]);

  const csGetPlotArea = useMemo(() => rechartsPlotArea({ left: 10, right: 15 }, 60), []);

  const zoom = useChartZoom({
    data: chartData,
    xKey: 'x',
    fullXDomain: csFullXDomain,
    getPlotArea: csGetPlotArea,
    panExcludeSelectors: ZOOM_PAN_EXCLUDE_SELECTORS,
    enabled: zoomable,
  });

  // Merge refs  -- both chartContainerRef (control-point coords) and zoom.containerRef (scroll zoom)
  const mergedChartRef = useCallback((node: HTMLDivElement | null) => {
    chartContainerRef.current = node;
    zoom.containerRef.current = node;
  }, [zoom.containerRef]);

  // Control point positions for chart scatter dots
  const controlDots = useMemo<ControlDot[]>(() => {
    if (!market || !shape.pVector) return [];
    const { L, H, K } = market.config;
    const step = (H - L) / K;
    const N = shape.controlValues.length;

    return shape.controlValues.map((_, i) => {
      const x = N === 1 ? (L + H) / 2 : L + (i / (N - 1)) * (H - L);

      // Interpolate Y from pVector density at this X
      const exactIdx = (x - L) / step;
      const loIdx = Math.floor(exactIdx);
      const hiIdx = Math.min(Math.ceil(exactIdx), K);
      let prob: number;
      if (loIdx === hiIdx || loIdx >= K) {
        prob = shape.pVector![Math.min(loIdx, K)];
      } else {
        const t = exactIdx - loIdx;
        prob = shape.pVector![loIdx] * (1 - t) + shape.pVector![hiIdx] * t;
      }
      const density = prob / step;

      return {
        x: Math.round(x * 100) / 100,
        y: density,
        index: i,
        isLocked: shape.lockedPoints.includes(i),
      };
    });
  }, [market, shape.pVector, shape.controlValues, shape.lockedPoints]);

  // Drag: convert mouse/touch Y position to control value [0, 25]
  const getValueFromPointerY = useCallback((clientY: number): number => {
    const container = chartContainerRef.current;
    if (!container) return 1;
    const rect = container.getBoundingClientRect();
    // Recharts default margins: top=5, bottom=~25 (axis labels)
    const chartTop = 5;
    const chartBottom = 30;
    const chartHeight = rect.height - chartTop - chartBottom;
    const mouseY = clientY - rect.top - chartTop;
    const clamped = Math.max(0, Math.min(chartHeight, mouseY));
    const yRatio = 1 - (clamped / chartHeight);
    return yRatio * 25; // Map to [0, 25]
  }, []);

  // Global drag listeners
  useEffect(() => {
    if (shape.draggingIndex === null) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!chartContainerRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      shape.handleDrag(getValueFromPointerY(clientY));
    };

    const handleUp = () => {
      shape.endDrag();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
    };
  }, [shape.draggingIndex, shape.handleDrag, shape.endDrag, getValueFromPointerY]);

  // Phase 3: Submit trade
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const collateral = parseFloat(amount);
    if (!shape.pVector || isNaN(collateral) || collateral < 1) return;

    try {
      const result = await submitBuy(shape.pVector, collateral);

      shape.resetToDefault();
      setPotentialPayout(null);
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);

      onBuy?.(result);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const collateral = parseFloat(amount);
  const isFormValid = shape.pVector !== null && !isNaN(collateral) && collateral >= 1;

  // Dynamic Y-axis domain for density  -- caps overlay influence so consensus stays visible
  const densityDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 0.1];
    let consensusMax = 0;
    let overlayMax = 0;
    for (const d of chartData) {
      if (d.consensus > consensusMax) consensusMax = d.consensus;
      if (d.belief !== undefined && d.belief > overlayMax) overlayMax = d.belief;
      if (d.selected !== undefined && d.selected > overlayMax) overlayMax = d.selected;
    }
    const cappedOverlay = Math.min(overlayMax, consensusMax * 4);
    const max = Math.max(consensusMax, cappedOverlay);
    return [0, max * 1.15];
  }, [chartData]);

  // Payout Y-axis domain
  const payoutDomain = useMemo<[number, number]>(() => {
    if (!chartData.length) return [0, 100];
    let max = 0;
    for (const d of chartData) {
      if (d.payout !== undefined && d.payout > max) max = d.payout;
    }
    return [0, Math.max(max * 1.1, 10)];
  }, [chartData]);

  const hasPreview = shape.pVector !== null;
  const hasSelected = ctx.selectedPosition !== null;
  const hasPayout = chartData.some((d) => d.payout !== undefined);

  // Memoized control dots renderer  -- avoids new function reference every render
  const renderControlDots = useCallback((props: any) => {
    const xScale = props.xAxisMap?.[0]?.scale;
    const yScale = props.yAxisMap?.left?.scale;
    if (!xScale || !yScale || !controlDots.length) return null;
    return (
      <g>
        {controlDots.map((dot) => {
          const cx = xScale(dot.x);
          const cy = yScale(dot.y);
          const isDragging = shape.draggingIndex === dot.index;
          const r = isDragging ? 8 : 6;
          return (
            <g key={dot.index}>
              {/* Invisible hit area */}
              <circle
                cx={cx} cy={cy} r={20}
                fill="transparent"
                style={{ cursor: dot.isLocked ? 'not-allowed' : 'grab' }}
                onMouseDown={(e) => { e.preventDefault(); shape.startDrag(dot.index); }}
                onTouchStart={() => shape.startDrag(dot.index)}
              />
              {/* Visible dot */}
              <circle
                cx={cx} cy={cy} r={r}
                fill={dot.isLocked ? ctx.chartColors.consensus : ctx.chartColors.previewLine}
                stroke={ctx.chartColors.tooltipBg}
                strokeWidth={2}
                style={{
                  cursor: dot.isLocked ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
                  filter: isDragging ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : undefined,
                  transition: isDragging ? 'none' : 'r 0.15s ease',
                }}
              />
            </g>
          );
        })}
      </g>
    );
  }, [controlDots, shape.draggingIndex, shape.startDrag, ctx.chartColors]);

  // Custom tooltip matching ConsensusChart pattern
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="fs-tooltip">
        <p className="fs-tooltip-label">Outcome: {Number(label).toFixed(4)}</p>
        {payload.map((entry: any, i: number) => {
          if (entry.dataKey === 'consensus') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: ctx.chartColors.consensus }}>
                Market Consensus: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'belief') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: ctx.chartColors.previewLine }}>
                Your Belief: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'selected') {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: ctx.chartColors.positions[0] }}>
                Selected Position: {entry.value?.toFixed(4)}
              </p>
            );
          }
          if (entry.dataKey === 'payout' && entry.value > 0) {
            return (
              <p key={i} className="fs-tooltip-row" style={{ color: ctx.chartColors.payout }}>
                Potential Payout: ${entry.value?.toFixed(2)}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };


  // Loading state
  if (marketLoading) {
    return (
      <div className="fs-custom-shape">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fs-text-secondary)' }}>
          Loading...
        </div>
      </div>
    );
  }

  // Error state
  if (marketError) {
    return (
      <div className="fs-custom-shape">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fs-negative)' }}>
          Error: {marketError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="fs-custom-shape">
      <form className="fs-trade-form" onSubmit={handleSubmit}>
        {/* Chart header */}
        <div className="fs-chart-header">
          <div className="fs-chart-header-row">
            <div>
              <h3 className="fs-chart-title">{market?.title || 'Custom Shape'}</h3>
              <p className="fs-chart-subtitle">
                {shape.pVector ? 'Drag control points to shape your belief' : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div
          className="fs-cs-chart-area"
          ref={mergedChartRef}
          onMouseDown={zoom.containerProps.onMouseDown}
          onMouseMove={zoom.containerProps.onMouseMove}
          onMouseUp={zoom.containerProps.onMouseUp}
          onMouseLeave={zoom.containerProps.onMouseLeave}
          onDoubleClick={zoom.containerProps.onDoubleClick}
          style={zoom.containerProps.style}
        >
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 25, right: 15, left: 10, bottom: 30 }}>
              <defs>
                <linearGradient id="fsCsConsensusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ctx.chartColors.consensus} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={ctx.chartColors.consensus} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="fsCsBeliefGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ctx.chartColors.previewLine} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ctx.chartColors.previewLine} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fsCsSelectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ctx.chartColors.positions[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ctx.chartColors.positions[0]} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={ctx.chartColors.grid} vertical={false} />

              <XAxis
                dataKey="x"
                type="number"
                domain={zoomable ? zoom.xDomain : ['dataMin', 'dataMax']}
                allowDataOverflow={zoomable && zoom.isZoomed}
                tick={{ fill: ctx.chartColors.axisText, fontSize: 12 }}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{
                  value: `Outcome${market?.xAxisUnits ? ` (${market.xAxisUnits})` : ''}`,
                  position: 'insideBottom',
                  offset: -15,
                  fill: ctx.chartColors.axisText,
                  fontSize: 12,
                }}
              />

              <YAxis
                yAxisId="left"
                domain={densityDomain}
                tick={{ fill: ctx.chartColors.axisText, fontSize: 10 }}
                tickFormatter={(v: number) => v.toFixed(3)}
                label={{
                  value: 'Probability Density',
                  angle: -90,
                  position: 'insideLeft',
                  fill: ctx.chartColors.axisText,
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
                cursor={{ stroke: ctx.chartColors.crosshair, strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value: string) => {
                  if (value === 'consensus') return <span style={{ color: ctx.chartColors.consensus, fontSize: '0.75rem' }}>Market Consensus</span>;
                  if (value === 'belief') return <span style={{ color: ctx.chartColors.previewLine, fontSize: '0.75rem' }}>Your Belief</span>;
                  if (value === 'selected') return <span style={{ color: ctx.chartColors.positions[0], fontSize: '0.75rem' }}>Selected Position</span>;
                  return null;
                }}
              />

              {/* Consensus area */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="consensus"
                stroke={ctx.chartColors.consensus}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fsCsConsensusGrad)"
                name="consensus"
                isAnimationActive={false}
              />

              {/* Belief preview area  -- dashed, linear for sharp edges */}
              {hasPreview && (
                <Area
                  yAxisId="left"
                  type="linear"
                  dataKey="belief"
                  stroke={ctx.chartColors.previewLine}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#fsCsBeliefGrad)"
                  name="belief"
                  animationDuration={300}
                />
              )}

              {/* Selected position from context */}
              {hasSelected && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="selected"
                  stroke={ctx.chartColors.positions[0]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#fsCsSelectedGrad)"
                  name="selected"
                  animationDuration={300}
                />
              )}

              {/* Payout  -- tooltip-only, invisible */}
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

              {/* Control dots rendered via Customized  -- completely outside Recharts data model,
                  uses real axis scale functions so positions are always correct */}
              <Customized component={renderControlDots} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Trade Summary */}
        <div className="fs-cs-summary">
          <div className="fs-cs-summary-header">Trade Summary</div>
          <div className="fs-cs-summary-stats">
            <div className="fs-cs-stat">
              <span className="fs-cs-stat-label">Prediction</span>
              <span className="fs-cs-stat-value fs-cs-stat-primary">
                {shape.prediction !== null ? shape.prediction.toFixed(2) : '--'}
              </span>
            </div>
            <div className="fs-cs-stat">
              <span className="fs-cs-stat-label">Peak Payout</span>
              <span className={`fs-cs-stat-value ${potentialPayout !== null ? 'has-value' : ''}`}>
                {potentialPayout !== null ? `$${potentialPayout.toFixed(2)}` : '--'}
              </span>
            </div>
            <div className="fs-cs-stat">
              <span className="fs-cs-stat-label">Max Loss</span>
              <span className="fs-cs-stat-value fs-cs-stat-negative">
                {!isNaN(collateral) && collateral >= 1 ? `$${collateral.toFixed(2)}` : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Vertical sliders + lock buttons */}
        <div className="fs-cs-sliders">
          {shape.controlValues.map((val, i) => {
            const isLocked = shape.lockedPoints.includes(i);
            return (
              <div key={i} className="fs-cs-slider-col">
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={0.01}
                  value={val}
                  disabled={isLocked || isSubmitting}
                  onChange={(e) => shape.setControlValue(i, parseFloat(e.target.value))}
                />
                <button
                  type="button"
                  className={`fs-cs-lock-btn ${isLocked ? 'locked' : ''}`}
                  onClick={() => shape.toggleLock(i)}
                  title={isLocked ? 'Unlock' : 'Lock'}
                  disabled={isSubmitting}
                >
                  {isLocked ? '\u{1F512}' : '\u{1F513}'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Control point count slider */}
        <div className="fs-cs-controls">
          <label>Control Points:</label>
          <input
            type="range"
            min={5}
            max={25}
            step={1}
            value={shape.numPoints}
            onChange={(e) => shape.setNumPoints(parseInt(e.target.value, 10))}
            disabled={isSubmitting}
          />
          <span className="fs-cs-points-value">{shape.numPoints}</span>
        </div>

        {/* Error */}
        {buyError && <div className="fs-cs-error">{buyError.message}</div>}

        {/* Footer: Amount + Submit */}
        <div className="fs-cs-footer">
          <div className="fs-cs-amount-wrapper">
            <span className="fs-cs-amount-prefix">$</span>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <button
            type="submit"
            className="fs-submit-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting
              ? 'Submitting...'
              : `Submit Trade ($${!isNaN(collateral) ? collateral.toFixed(0) : '0'})`}
          </button>
        </div>
      </form>
    </div>
  );
}
