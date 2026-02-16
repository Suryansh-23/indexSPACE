import React, { useState, useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  buildRange,
  projectPayoutCurve,
  buy,
} from '@functionspace/core';
import type { BuyResult, BucketData, RangeInput } from '@functionspace/core';
import { FunctionSpaceContext, useDistributionState } from '@functionspace/react';
import type { DistributionState } from '@functionspace/react';
import '../styles/base.css';

export interface BucketRangeSelectorProps {
  marketId: string | number;
  distributionState?: DistributionState;
  defaultBucketCount?: number;
  maxSelections?: number;
  defaultAutoMode?: boolean;
  showCustomRange?: boolean;
  onBuy?: (result: BuyResult) => void;
}

export function BucketRangeSelector({
  marketId,
  distributionState,
  defaultBucketCount = 12,
  maxSelections = 3,
  defaultAutoMode = false,
  showCustomRange = true,
  onBuy,
}: BucketRangeSelectorProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('BucketRangeSelector must be used within FunctionSpaceProvider');

  // Use shared state if provided, otherwise create own
  const ownState = useDistributionState(marketId, { defaultBucketCount });
  const distState = distributionState ?? ownState;

  const { market, loading, error, bucketCount, percentiles, getBucketsForRange } = distState;

  // Local selection state
  const [selectedBuckets, setSelectedBuckets] = useState<number[]>([]);
  const [autoMode, setAutoMode] = useState(defaultAutoMode);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [customMin, setCustomMin] = useState('');
  const [customMax, setCustomMax] = useState('');
  const [customSelection, setCustomSelection] = useState<{ min: number; max: number } | null>(null);

  // Trade state
  const [amount, setAmount] = useState('100');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);
    };
  }, []);

  // Compute active buckets based on auto mode
  const activeBuckets = useMemo<BucketData[]>(() => {
    if (!market) return [];
    if (autoMode && percentiles) {
      return getBucketsForRange(percentiles.p2_5, percentiles.p97_5);
    }
    return distState.buckets ?? [];
  }, [market, autoMode, percentiles, distState.buckets, getBucketsForRange]);

  // Clear selections when bucket count or auto mode changes (boundaries shift)
  const prevBucketCountRef = useRef(bucketCount);
  const prevAutoModeRef = useRef(autoMode);
  useEffect(() => {
    if (prevBucketCountRef.current !== bucketCount || prevAutoModeRef.current !== autoMode) {
      setSelectedBuckets([]);
      prevBucketCountRef.current = bucketCount;
      prevAutoModeRef.current = autoMode;
    }
  }, [bucketCount, autoMode]);

  // FIFO toggle for bucket selection
  const toggleBucket = useCallback((index: number) => {
    setSelectedBuckets(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      const customCount = customSelection ? 1 : 0;
      const maxBucketSelections = maxSelections - customCount;
      if (prev.length >= maxBucketSelections) {
        // FIFO: drop oldest bucket selection
        return [...prev.slice(1), index];
      }
      return [...prev, index];
    });
  }, [maxSelections, customSelection]);

  // Custom range validation and application
  const applyCustomRange = useCallback(() => {
    const min = parseFloat(customMin);
    const max = parseFloat(customMax);
    if (!market || isNaN(min) || isNaN(max) || min >= max) return;

    const effectiveL = autoMode && percentiles ? percentiles.p2_5 : market.config.L;
    const effectiveH = autoMode && percentiles ? percentiles.p97_5 : market.config.H;

    if (min < effectiveL || max > effectiveH) return;

    // If adding custom would exceed maxSelections, drop oldest bucket
    if (selectedBuckets.length + 1 > maxSelections) {
      setSelectedBuckets(prev => prev.slice(1));
    }
    setCustomSelection({ min, max });
  }, [customMin, customMax, market, autoMode, percentiles, selectedBuckets, maxSelections]);

  const clearCustomRange = useCallback(() => {
    setCustomSelection(null);
    setCustomMin('');
    setCustomMax('');
  }, []);

  // Build belief from selections
  const belief = useMemo(() => {
    if (!market || activeBuckets.length === 0) return null;

    const ranges: RangeInput[] = [
      ...selectedBuckets
        .filter(i => i >= 0 && i < activeBuckets.length)
        .map(i => ({
          low: activeBuckets[i].min,
          high: activeBuckets[i].max,
          sharpness: 1,
        })),
      ...(customSelection ? [{ low: customSelection.min, high: customSelection.max, sharpness: 1 }] : []),
    ];

    if (ranges.length === 0) return null;

    const { K, L, H } = market.config;
    return buildRange(ranges, K, L, H);
  }, [market, activeBuckets, selectedBuckets, customSelection]);

  // Phase 1: Instant preview
  useEffect(() => {
    ctx.setPreviewBelief(belief);
    if (!belief) {
      setPotentialPayout(null);
      ctx.setPreviewPayout(null);
    }
  }, [belief]);

  // Phase 2: Debounced payout projection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral <= 0 || !market) {
      setPotentialPayout(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await projectPayoutCurve(ctx.client, marketId, belief, collateral);
        if (!mountedRef.current) return;
        setPotentialPayout(result.maxPayout);
        ctx.setPreviewPayout(result);
      } catch {
        if (!mountedRef.current) return;
        setPotentialPayout(null);
        ctx.setPreviewPayout(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [belief, amount, market, marketId]);

  // Phase 3: Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral < 1 || !market) return;

    setIsSubmitting(true);
    setTradeError(null);

    try {
      // Prediction: average midpoint of all selected ranges
      const allRanges: Array<{ min: number; max: number }> = [
        ...selectedBuckets
          .filter(i => i >= 0 && i < activeBuckets.length)
          .map(i => ({ min: activeBuckets[i].min, max: activeBuckets[i].max })),
        ...(customSelection ? [customSelection] : []),
      ];
      const prediction = allRanges.reduce((sum, r) => sum + (r.min + r.max) / 2, 0) / allRanges.length;

      const result = await buy(ctx.client, marketId, belief, collateral, {
        prediction,
      });

      // Reset
      setSelectedBuckets([]);
      clearCustomRange();
      setAmount('100');
      setPotentialPayout(null);
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);

      onBuy?.(result);
      ctx.invalidate(marketId);
    } catch (err: any) {
      setTradeError(err?.message || 'Failed to submit trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSelections = selectedBuckets.length + (customSelection ? 1 : 0);
  const isFormValid = totalSelections > 0 && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 1;

  // Adaptive grid columns
  const columns = bucketCount <= 9 ? 3 : bucketCount <= 16 ? 4 : bucketCount <= 25 ? 5 : 6;

  // Selection summary labels
  const selectionLabels = [
    ...selectedBuckets
      .filter(i => i >= 0 && i < activeBuckets.length)
      .map(i => activeBuckets[i].range),
    ...(customSelection ? [`${customSelection.min}–${customSelection.max}`] : []),
  ];

  if (loading) {
    return (
      <div className="fs-bucket-range" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-text-secondary)' }}>Loading market data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fs-bucket-range" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--fs-negative)' }}>Error: {error.message}</span>
      </div>
    );
  }

  if (!market) return null;

  return (
    <div className="fs-bucket-range">
      <div className="fs-bucket-range-header">
        <div>
          <h3 className="fs-bucket-range-title">{market.title || 'Select Ranges'}</h3>
          <p className="fs-bucket-range-subtitle">
            {autoMode ? 'Showing 95% CI range' : 'Select outcome ranges'}
          </p>
        </div>
        <label className="fs-bucket-range-auto-toggle">
          <span className="fs-bucket-range-auto-label">Auto</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoMode}
            className={`fs-toggle-switch ${autoMode ? 'active' : ''}`}
            onClick={() => setAutoMode(!autoMode)}
          />
        </label>
      </div>

      <div
        className="fs-bucket-range-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {activeBuckets.map((bucket, index) => (
          <button
            key={`${bucket.range}-${index}`}
            type="button"
            className={`fs-bucket-btn ${selectedBuckets.includes(index) ? 'selected' : ''}`}
            onClick={() => toggleBucket(index)}
            disabled={isSubmitting}
          >
            <span className="fs-bucket-range-label">{bucket.range}</span>
            <span className="fs-bucket-prob">{bucket.percentage.toFixed(1)}%</span>
          </button>
        ))}
      </div>

      <div className="fs-bucket-range-status">
        <span className="fs-bucket-range-count">
          {totalSelections}/{maxSelections} selected
          {selectionLabels.length > 0 && (
            <> — {selectionLabels.join(', ')}</>
          )}
        </span>
        {showCustomRange && (
          <button
            type="button"
            className={`fs-bucket-range-custom-toggle ${customExpanded ? 'active' : ''}`}
            onClick={() => setCustomExpanded(!customExpanded)}
          >
            + Custom
          </button>
        )}
      </div>

      {customExpanded && (
        <div className="fs-bucket-range-custom">
          <div className="fs-bucket-range-custom-inputs">
            <div className="fs-input-group">
              <label>Min</label>
              <input
                type="number"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                placeholder={String(market.config.L)}
                step="any"
              />
            </div>
            <div className="fs-input-group">
              <label>Max</label>
              <input
                type="number"
                value={customMax}
                onChange={(e) => setCustomMax(e.target.value)}
                placeholder={String(market.config.H)}
                step="any"
              />
            </div>
          </div>
          <div className="fs-bucket-range-custom-actions">
            <button
              type="button"
              className="fs-bucket-range-apply-btn"
              onClick={applyCustomRange}
              disabled={!customMin || !customMax}
            >
              Apply
            </button>
            {customSelection && (
              <button
                type="button"
                className="fs-bucket-range-clear-btn"
                onClick={clearCustomRange}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <form className="fs-trade-form" onSubmit={handleSubmit}>
        <div className="fs-input-group">
          <label htmlFor="fs-bucket-amount">Amount (USDC)</label>
          <input
            id="fs-bucket-amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
          />
          <span className="fs-input-hint">Minimum: 1.00 USDC</span>
        </div>

        <div className="fs-payout-box">
          <span className="fs-payout-label">Potential Payout</span>
          <span className={`fs-payout-value ${potentialPayout !== null ? 'has-value' : 'no-value'}`}>
            {potentialPayout !== null ? `$${potentialPayout.toFixed(2)}` : '—'}
          </span>
          <p className="fs-payout-hint">
            Maximum payout if the market settles within your selected ranges.
          </p>
        </div>

        {tradeError && <div className="fs-error-box">{tradeError}</div>}

        <button
          type="submit"
          className="fs-submit-btn"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Trade'}
        </button>
      </form>
    </div>
  );
}
