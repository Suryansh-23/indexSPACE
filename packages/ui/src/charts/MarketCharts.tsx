import React, { useContext, useState } from 'react';
import { FunctionSpaceContext, useMarket, useConsensus } from '@functionspace/react';
import type { DistributionState } from '@functionspace/react';
import type { ChartView, OverlayCurve } from './types.js';
import { ConsensusChartContent } from './ConsensusChart.js';
import { DistributionChartContent } from './DistributionChart.js';
import { TimelineChartContent } from './TimelineChart.js';
import '../styles/base.css';

export interface MarketChartsProps {
  marketId: string | number;
  height?: number;
  views?: ChartView[];
  overlayCurves?: OverlayCurve[];
  defaultBucketCount?: number;
  distributionState?: DistributionState;
}

export function MarketCharts({
  marketId,
  height = 300,
  views,
  overlayCurves,
  defaultBucketCount = 12,
  distributionState,
}: MarketChartsProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MarketCharts must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { consensus, loading, error } = useConsensus(marketId, 100);

  // View management
  const effectiveViews: ChartView[] = views && views.length > 0 ? views : ['consensus'];
  const showTabs = effectiveViews.length > 1;
  const [activeView, setActiveView] = useState<ChartView>(effectiveViews[0]);

  // Bucket state (persists across tab switches)
  const [internalBucketCount, setInternalBucketCount] = useState(defaultBucketCount);
  const bucketCount = distributionState?.bucketCount ?? internalBucketCount;
  const setBucketCount = distributionState?.setBucketCount ?? setInternalBucketCount;

  // Time filter state (persists across tab switches)
  const [timeFilter, setTimeFilter] = useState('all');

  const hasPreview = ctx.previewBelief !== null;

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

  if (!market || !consensus) return null;

  return (
    <div className="fs-chart-container">
      <div className="fs-chart-header">
        <div className="fs-chart-header-row">
          <div>
            <h3 className="fs-chart-title">{market.title || 'Consensus'}</h3>
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
                    {view === 'consensus' ? 'Consensus' : view === 'distribution' ? 'Distribution' : 'Timeline'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeView === 'consensus' && (
        <ConsensusChartContent
          market={market}
          consensus={consensus}
          height={height}
          overlayCurves={overlayCurves}
        />
      )}

      {activeView === 'distribution' && (
        <DistributionChartContent
          market={market}
          consensus={consensus}
          height={height}
          bucketCount={bucketCount}
          onBucketCountChange={setBucketCount}
        />
      )}

      {activeView === 'timeline' && (
        <TimelineChartContent
          marketId={marketId}
          market={market}
          height={height}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
        />
      )}
    </div>
  );
}
