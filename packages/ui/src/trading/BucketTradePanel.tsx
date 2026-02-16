import React from 'react';
import { useDistributionState } from '@functionspace/react';
import type { BuyResult } from '@functionspace/core';
import { DistributionChart } from '../charts/DistributionChart.js';
import { BucketRangeSelector } from './BucketRangeSelector.js';
import '../styles/base.css';

export interface BucketTradePanelProps {
  marketId: string | number;
  defaultBucketCount?: number;
  chartHeight?: number;
  maxSelections?: number;
  defaultAutoMode?: boolean;
  showCustomRange?: boolean;
  onBuy?: (result: BuyResult) => void;
}

export function BucketTradePanel({
  marketId,
  defaultBucketCount = 12,
  chartHeight = 300,
  maxSelections,
  defaultAutoMode,
  showCustomRange,
  onBuy,
}: BucketTradePanelProps) {
  const distState = useDistributionState(marketId, { defaultBucketCount });

  return (
    <div className="fs-bucket-trade-panel">
      <DistributionChart
        marketId={marketId}
        height={chartHeight}
        distributionState={distState}
      />
      <BucketRangeSelector
        marketId={marketId}
        distributionState={distState}
        maxSelections={maxSelections}
        defaultAutoMode={defaultAutoMode}
        showCustomRange={showCustomRange}
        onBuy={onBuy}
      />
    </div>
  );
}
