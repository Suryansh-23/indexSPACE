import React, { useContext, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { calculateBucketDistribution } from '@functionspace/core';
import type { BucketData, MarketState, ConsensusCurve } from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useConsensus } from '@functionspace/react';
import type { ChartColors } from '@functionspace/react';
import type { DistributionState } from '@functionspace/react';
import '../styles/base.css';

// ── Content component (used by MarketCharts and standalone) ──

export interface DistributionChartContentProps {
  market: MarketState;
  consensus: ConsensusCurve;
  height: number;
  bucketCount: number;
  onBucketCountChange: (count: number) => void;
}

export function DistributionChartContent({
  market,
  consensus,
  height,
  bucketCount,
  onBucketCountChange,
}: DistributionChartContentProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('DistributionChartContent must be used within FunctionSpaceProvider');

  // Smart decimals for bucket labels: use 0 if bucket width >= 1, otherwise use market.decimals
  const bucketDecimals = useMemo(() => {
    const bucketWidth = (market.config.upperBound - market.config.lowerBound) / bucketCount;
    return bucketWidth >= 1 ? 0 : (market.decimals ?? 0);
  }, [market, bucketCount]);

  const bucketData = useMemo<BucketData[]>(() => {
    return calculateBucketDistribution(
      consensus.points,
      market.config.lowerBound,
      market.config.upperBound,
      bucketCount,
      bucketDecimals,
    );
  }, [consensus, market, bucketCount, bucketDecimals]);

  return (
    <>
      <div className="fs-chart-distribution-subheader">
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
            onChange={(e) => onBucketCountChange(Number(e.target.value))}
            className="fs-chart-bucket-slider"
          />
        </div>
      </div>
      <div className="fs-chart-body" style={{ height }}>
        <DistributionView bucketData={bucketData} market={market} chartColors={ctx.chartColors} />
      </div>
    </>
  );
}

// ── Distribution bar chart (extracted from ConsensusChart) ──

function DistributionView({
  bucketData,
  market,
  chartColors,
}: {
  bucketData: BucketData[];
  market: MarketState | null;
  chartColors: ChartColors;
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
        <p className="fs-tooltip-row" style={{ color: chartColors.consensus }}>
          Probability: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={bucketData}
        margin={{ top: 5, right: 50, bottom: 5, left: 70 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={chartColors.grid}
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          domain={[0, Math.ceil(maxPercentage * 1.15)]}
          tick={{ fill: chartColors.axisText, fontSize: 11 }}
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          axisLine={{ stroke: chartColors.grid }}
          tickLine={{ stroke: chartColors.grid }}
        />
        <YAxis
          type="category"
          dataKey="range"
          width={65}
          tick={{ fill: chartColors.axisText, fontSize: 11 }}
          axisLine={{ stroke: chartColors.grid }}
          tickLine={false}
        />
        <Tooltip
          content={<DistributionTooltip />}
          cursor={{ fill: `${chartColors.consensus}1a` }}
        />
        <Bar
          dataKey="percentage"
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
        >
          {bucketData.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={chartColors.consensus}
              fillOpacity={index === peakBucketIdx ? 1 : 0.8}
            />
          ))}
          <LabelList
            dataKey="percentage"
            position="right"
            formatter={(v: number) => `${v.toFixed(0)}%`}
            fill={chartColors.axisText}
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Standalone component ──

export interface DistributionChartProps {
  marketId: string | number;
  height?: number;
  defaultBucketCount?: number;
  distributionState?: DistributionState;
}

export function DistributionChart({
  marketId,
  height = 300,
  defaultBucketCount = 12,
  distributionState,
}: DistributionChartProps) {
  const { market } = useMarket(marketId);
  const { consensus, loading, error } = useConsensus(marketId, 100);

  // Internal bucket state (used when no distributionState provided)
  const [internalBucketCount, setInternalBucketCount] = useState(defaultBucketCount);

  // Use shared state if provided, otherwise internal
  const bucketCount = distributionState?.bucketCount ?? internalBucketCount;
  const setBucketCount = distributionState?.setBucketCount ?? setInternalBucketCount;

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

  if (!market || !consensus) return null;

  return (
    <div className="fs-chart-container">
      <div className="fs-chart-header">
        <div className="fs-chart-header-row">
          <div>
            <h3 className="fs-chart-title">{market.title || 'Distribution'}</h3>
            <p className="fs-chart-subtitle">Probability distribution across outcome ranges</p>
          </div>
        </div>
      </div>
      <DistributionChartContent
        market={market}
        consensus={consensus}
        height={height}
        bucketCount={bucketCount}
        onBucketCountChange={setBucketCount}
      />
    </div>
  );
}
