import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  buildGaussian,
  buildPlateau,
  projectPayoutCurve,
  buy,
} from '@functionspace/core';
import type { BuyResult } from '@functionspace/core';
import { FunctionSpaceContext, useMarket } from '@functionspace/react';
import { Slider } from '../components/Slider.js';
import { RangeSlider } from '../components/RangeSlider.js';
import '../styles/base.css';

export interface TradePanelProps {
  marketId: string | number;
  modes?: ('gaussian' | 'plateau')[];
  onBuy?: (result: BuyResult) => void;
}

export function TradePanel({ marketId, modes = ['gaussian', 'plateau'], onBuy }: TradePanelProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('TradePanel must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);

  const [activeMode, setActiveMode] = useState<'gaussian' | 'plateau'>(modes[0]);
  const [amount, setAmount] = useState('100');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(50); // 0-100 percentage
  const [rangeValues, setRangeValues] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Initialize slider values from market config
  useEffect(() => {
    if (market) {
      const { L, H } = market.config;
      if (prediction === null) {
        setPrediction((L + H) / 2);
      }
      if (rangeValues === null) {
        const range = H - L;
        setRangeValues([L + range * 0.25, L + range * 0.75]);
      }
    }
  }, [market, prediction, rangeValues]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);
    };
  }, []);

  // Convert confidence (0-100) to stdDev
  const getStdDevFromConfidence = useCallback((conf: number): number => {
    if (!market) return 4.0;
    const { L, H } = market.config;
    const range = H - L;
    const minSigma = range * 0.01;  // 1% of range (high confidence)
    const maxSigma = range * 0.20;  // 20% of range (low confidence)
    return maxSigma - ((conf / 100) * (maxSigma - minSigma));
  }, [market]);

  // Build belief from current inputs
  const buildCurrentBelief = useCallback(() => {
    if (!market) return null;
    const { K, L, H } = market.config;

    if (activeMode === 'gaussian') {
      if (prediction === null) return null;
      const stdDev = getStdDevFromConfidence(confidence);
      if (prediction < L || prediction > H) return null;
      return buildGaussian(prediction, stdDev, K, L, H);
    } else {
      if (!rangeValues) return null;
      const [lo, hi] = rangeValues;
      if (lo >= hi) return null;
      if (lo < L || hi > H) return null;
      return buildPlateau(lo, hi, K, L, H);
    }
  }, [market, activeMode, prediction, confidence, rangeValues, getStdDevFromConfidence]);

  // Instant preview update (no debounce)
  useEffect(() => {
    const belief = buildCurrentBelief();
    ctx.setPreviewBelief(belief);

    if (!belief) {
      setPotentialPayout(null);
      ctx.setPreviewPayout(null);
    }
  }, [buildCurrentBelief]);

  // Debounced payout projection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const belief = buildCurrentBelief();
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
  }, [buildCurrentBelief, amount, market, marketId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const belief = buildCurrentBelief();
    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral < 1) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const predValue = activeMode === 'gaussian'
        ? prediction!
        : (rangeValues![0] + rangeValues![1]) / 2;

      const result = await buy(ctx.client, marketId, belief, collateral, {
        prediction: predValue,
      });

      // Reset to defaults
      if (market) {
        const { L, H } = market.config;
        setPrediction((L + H) / 2);
        setConfidence(50);
        const range = H - L;
        setRangeValues([L + range * 0.25, L + range * 0.75]);
      }
      setAmount('100');
      setPotentialPayout(null);
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);

      onBuy?.(result);
      ctx.invalidate(marketId);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = (() => {
    const collateral = parseFloat(amount);
    if (isNaN(collateral) || collateral < 1) return false;
    return buildCurrentBelief() !== null;
  })();

  const showTabs = modes.length > 1;

  // Calculate step based on market range
  const getStep = () => {
    if (!market) return 1;
    const range = market.config.H - market.config.L;
    return range / 100;
  };

  return (
    <div className="fs-trade-panel">
      <div className="fs-trade-header">
        <h3>Submit Trade</h3>
        <p>Enter your position</p>
      </div>

      {showTabs && (
        <div className="fs-tabs">
          {modes.map((mode) => (
            <button
              key={mode}
              className={`fs-tab ${activeMode === mode ? 'active' : ''}`}
              onClick={() => setActiveMode(mode)}
              type="button"
            >
              {mode === 'gaussian' ? 'Gaussian' : 'Range'}
            </button>
          ))}
        </div>
      )}

      <form className="fs-trade-form" onSubmit={handleSubmit}>
        <div className="fs-input-group">
          <label htmlFor="fs-amount">Amount (USDC)</label>
          <input
            id="fs-amount"
            type="number"
            step="0.01"
            min="1"
            placeholder="100.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className="fs-input-hint">Minimum: 1.00 USDC</span>
        </div>

        {activeMode === 'gaussian' ? (
          <>
            <div className="fs-slider-group">
              <div className="fs-slider-header">
                <span className="fs-slider-label">My Prediction</span>
                {market && prediction !== null && (
                  <span className="fs-slider-value">{prediction.toFixed(1)}</span>
                )}
              </div>
              {market && prediction !== null && (
                <>
                  <Slider
                    min={market.config.L}
                    max={market.config.H}
                    value={prediction}
                    onChange={setPrediction}
                    step={getStep()}
                    disabled={isSubmitting}
                  />
                  <div className="fs-slider-bounds">
                    <span>{market.config.L}</span>
                    <span>{market.config.H}</span>
                  </div>
                </>
              )}
            </div>
            <div className="fs-slider-group">
              <div className="fs-slider-header">
                <span className="fs-slider-label">Confidence</span>
                <span className="fs-slider-value">{confidence}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                value={confidence}
                onChange={setConfidence}
                step={1}
                disabled={isSubmitting}
              />
              <div className="fs-slider-bounds">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </>
        ) : (
          <div className="fs-slider-group">
            <div className="fs-slider-header">
              <span className="fs-slider-label">Select Range</span>
            </div>
            {market && rangeValues && (
              <>
                <RangeSlider
                  min={market.config.L}
                  max={market.config.H}
                  values={rangeValues}
                  onChange={setRangeValues}
                  step={getStep()}
                  disabled={isSubmitting}
                />
                <div className="fs-range-values">
                  <span className="fs-range-value">{rangeValues[0].toFixed(1)}</span>
                  <span className="fs-range-separator">to</span>
                  <span className="fs-range-value">{rangeValues[1].toFixed(1)}</span>
                </div>
                <div className="fs-slider-bounds">
                  <span>{market.config.L}</span>
                  <span>{market.config.H}</span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="fs-payout-box">
          <span className="fs-payout-label">Potential Payout</span>
          <span className={`fs-payout-value ${potentialPayout !== null ? 'has-value' : 'no-value'}`}>
            {potentialPayout !== null ? `$${potentialPayout.toFixed(2)}` : '—'}
          </span>
          <p className="fs-payout-hint">
            This is your payout if the market settles at your exact prediction.
          </p>
        </div>

        {error && <div className="fs-error-box">{error}</div>}

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
