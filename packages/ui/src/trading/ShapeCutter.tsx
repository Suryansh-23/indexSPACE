import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  generateGaussian,
  generateRange,
  generateBelief,
  generateDip,
  generateLeftSkew,
  generateRightSkew,
  SHAPE_DEFINITIONS,
} from '@functionspace/core';
import type { ShapeId } from '@functionspace/core';
import { FunctionSpaceContext, useMarket, useBuy, usePreviewPayout } from '@functionspace/react';
import type { TradeInputBaseProps } from './types.js';
import { Slider } from '../components/Slider.js';
import { RangeSlider } from '../components/RangeSlider.js';
import '../styles/base.css';

export interface ShapeCutterProps extends TradeInputBaseProps {
  /** Which shapes to offer. Defaults to all 8. */
  shapes?: ShapeId[];
  /** Initial shape selection. Defaults to 'gaussian'. */
  defaultShape?: ShapeId;
}

export function ShapeCutter({
  marketId,
  onBuy,
  onError,
  shapes,
  defaultShape = 'gaussian',
}: ShapeCutterProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('ShapeCutter must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { execute: submitBuy, loading: isSubmitting, error: buyError } = useBuy(marketId);
  const { execute: previewPayout } = usePreviewPayout(marketId);

  const [selectedShape, setSelectedShape] = useState<ShapeId>(defaultShape);
  const [amount, setAmount] = useState('100');
  const [targetOutcome, setTargetOutcome] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [rangeValues, setRangeValues] = useState<[number, number] | null>(null);
  const [peakBias, setPeakBias] = useState(50); // 0-100, displayed as percentage
  const [skewAmount, setSkewAmount] = useState(50); // 0-100, mapped to 0-1 for generators
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Filter shape definitions
  const availableShapes = shapes
    ? SHAPE_DEFINITIONS.filter((d) => shapes.includes(d.id))
    : SHAPE_DEFINITIONS;

  // Initialize slider values from market config
  useEffect(() => {
    if (market) {
      const { lowerBound, upperBound } = market.config;
      if (targetOutcome === null) {
        setTargetOutcome((lowerBound + upperBound) / 2);
      }
      if (rangeValues === null) {
        const range = upperBound - lowerBound;
        setRangeValues([lowerBound + range * 0.25, lowerBound + range * 0.75]);
      }
    }
  }, [market, targetOutcome, rangeValues]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);
    };
  }, []);

  // Confidence → spread conversion (same formula as TradePanel)
  const getSpreadFromConfidence = useCallback((conf: number): number => {
    if (!market) return 4.0;
    const { lowerBound, upperBound } = market.config;
    const range = upperBound - lowerBound;
    const minSigma = range * 0.01;
    const maxSigma = range * 0.20;
    return maxSigma - ((conf / 100) * (maxSigma - minSigma));
  }, [market]);

  // Generate belief from current shape + parameters
  const generateCurrentBelief = useCallback(() => {
    if (!market) return null;
    const { numBuckets, lowerBound, upperBound } = market.config;
    const spread = getSpreadFromConfidence(confidence);

    switch (selectedShape) {
      case 'gaussian':
        if (targetOutcome === null) return null;
        return generateGaussian(targetOutcome, spread, numBuckets, lowerBound, upperBound);

      case 'spike': {
        if (targetOutcome === null) return null;
        // Dynamic multiplier: 0.4x at low confidence → 0.02x at high confidence
        // Gives the spike ~20x more dynamic range than gaussian across confidence levels
        const spikeMul = 0.4 - (confidence / 100) * 0.38;
        return generateGaussian(targetOutcome, spread * spikeMul, numBuckets, lowerBound, upperBound);
      }

      case 'range':
        if (!rangeValues) return null;
        return generateRange(rangeValues[0], rangeValues[1], numBuckets, lowerBound, upperBound, 1);

      case 'bimodal':
        if (!rangeValues) return null;
        return generateBelief([
          { type: 'point', center: rangeValues[0], spread: spread * 0.8, weight: 1 - (peakBias / 100) },
          { type: 'point', center: rangeValues[1], spread: spread * 0.8, weight: peakBias / 100 },
        ], numBuckets, lowerBound, upperBound);

      case 'dip':
        if (targetOutcome === null) return null;
        return generateDip(targetOutcome, spread, numBuckets, lowerBound, upperBound);

      case 'leftskew':
        if (targetOutcome === null) return null;
        return generateLeftSkew(targetOutcome, spread, numBuckets, lowerBound, upperBound, skewAmount / 100);

      case 'rightskew':
        if (targetOutcome === null) return null;
        return generateRightSkew(targetOutcome, spread, numBuckets, lowerBound, upperBound, skewAmount / 100);

      case 'uniform':
        return generateRange(lowerBound, upperBound, numBuckets, lowerBound, upperBound, 1);

      default:
        return null;
    }
  }, [market, selectedShape, targetOutcome, confidence, rangeValues, peakBias, skewAmount, getSpreadFromConfidence]);

  // Instant preview update
  useEffect(() => {
    const belief = generateCurrentBelief();
    ctx.setPreviewBelief(belief);

    if (!belief) {
      setPotentialPayout(null);
      ctx.setPreviewPayout(null);
    }
  }, [generateCurrentBelief]);

  // Debounced payout preview
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const belief = generateCurrentBelief();
    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral <= 0 || !market) {
      setPotentialPayout(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await previewPayout(belief, collateral);
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
  }, [generateCurrentBelief, amount, market, marketId]);

  const resetToDefaults = () => {
    if (market) {
      const { lowerBound, upperBound } = market.config;
      setTargetOutcome((lowerBound + upperBound) / 2);
      setConfidence(50);
      const range = upperBound - lowerBound;
      setRangeValues([lowerBound + range * 0.25, lowerBound + range * 0.75]);
      setPeakBias(50);
      setSkewAmount(50);
    }
    setAmount('100');
    setPotentialPayout(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const belief = generateCurrentBelief();
    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral < 1) return;

    try {
      const result = await submitBuy(belief, collateral);

      resetToDefaults();
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);

      onBuy?.(result);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const isFormValid = (() => {
    const collateral = parseFloat(amount);
    if (isNaN(collateral) || collateral < 1) return false;
    return generateCurrentBelief() !== null;
  })();

  const getStep = () => {
    if (!market) return 1;
    const range = market.config.upperBound - market.config.lowerBound;
    return range / 100;
  };

  // Determine which parameters the selected shape needs
  const shapeDef = SHAPE_DEFINITIONS.find((d) => d.id === selectedShape);
  const needs = (param: string) => shapeDef?.parameters.includes(param as any) ?? false;

  // Display values for trade summary
  const collateral = parseFloat(amount);
  const displayPrediction = (() => {
    if (selectedShape === 'uniform' && market) return (market.config.lowerBound + market.config.upperBound) / 2;
    if (selectedShape === 'range' || selectedShape === 'bimodal') {
      if (!rangeValues) return null;
      return selectedShape === 'bimodal'
        ? ((peakBias / 100) <= 0.5 ? rangeValues[0] : rangeValues[1])
        : (rangeValues[0] + rangeValues[1]) / 2;
    }
    return targetOutcome;
  })();

  return (
    <div className="fs-shape-cutter">
      <form className="fs-trade-form" onSubmit={handleSubmit}>
        {/* Main area: Controls (left) + Strategy Geometry (right) */}
        <div className="fs-sc-columns">
          {/* Left: Trade summary + all sliders */}
          <div className="fs-sc-left">
            <div className="fs-sc-summary">
              <div className="fs-sc-summary-header">Trade Summary</div>
              <div className="fs-sc-summary-stats">
                <div className="fs-sc-stat">
                  <span className="fs-sc-stat-label">Prediction</span>
                  <span className="fs-sc-stat-value fs-sc-stat-primary">
                    {displayPrediction !== null ? displayPrediction.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="fs-sc-stat">
                  <span className="fs-sc-stat-label">Payout Potential</span>
                  <span className={`fs-sc-stat-value ${potentialPayout !== null ? 'has-value' : ''}`}>
                    {potentialPayout !== null ? `$${potentialPayout.toFixed(2)}` : '--'}
                  </span>
                </div>
                <div className="fs-sc-stat">
                  <span className="fs-sc-stat-label">Max Loss</span>
                  <span className="fs-sc-stat-value fs-sc-stat-negative">
                    {!isNaN(collateral) && collateral >= 1 ? `$${collateral.toFixed(2)}` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* All sliders consolidated in left column */}
            <div className="fs-sc-controls">
              {/* Slot 1: Target outcome OR Range */}
              <div style={{ visibility: needs('targetOutcome') || needs('rangeValues') ? 'visible' : 'hidden' }}>
                {needs('rangeValues') ? (
                  <div className="fs-slider-group">
                    <div className="fs-slider-header">
                      <span className="fs-slider-label">{selectedShape === 'bimodal' ? 'Select Peaks' : 'Select Range'}</span>
                    </div>
                    {market && rangeValues && (
                      <div className="fs-range-inline">
                        <span className="fs-range-value">{Math.round(rangeValues[0])}</span>
                        <RangeSlider
                          min={market.config.lowerBound}
                          max={market.config.upperBound}
                          values={rangeValues}
                          onChange={setRangeValues}
                          step={getStep()}
                          disabled={isSubmitting}
                          showTrack={selectedShape !== 'bimodal'}
                        />
                        <span className="fs-range-value">{Math.round(rangeValues[1])}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="fs-slider-group">
                    <div className="fs-slider-header">
                      <span className="fs-slider-label">Target Outcome</span>
                      {market && targetOutcome !== null && (
                        <span className="fs-slider-value">{targetOutcome.toFixed(1)}</span>
                      )}
                    </div>
                    {market && targetOutcome !== null && (
                      <>
                        <Slider
                          min={market.config.lowerBound}
                          max={market.config.upperBound}
                          value={targetOutcome}
                          onChange={setTargetOutcome}
                          step={getStep()}
                          disabled={isSubmitting || !needs('targetOutcome')}
                        />
                        <div className="fs-slider-bounds">
                          <span>{market.config.lowerBound}</span>
                          <span>{market.config.upperBound}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Slot 2: Confidence */}
              <div style={{ visibility: needs('confidence') ? 'visible' : 'hidden' }}>
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
                    disabled={isSubmitting || !needs('confidence')}
                  />
                  <div className="fs-slider-bounds">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              {/* Slot 3: Peak Balance or Skew Intensity */}
              <div style={{ visibility: needs('peakBias') || needs('skewAmount') ? 'visible' : 'hidden' }}>
                {needs('peakBias') ? (
                  <div className="fs-slider-group">
                    <div className="fs-slider-header">
                      <span className="fs-slider-label">Peak Balance</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={peakBias}
                      onChange={setPeakBias}
                      step={1}
                      disabled={isSubmitting}
                      showTrack={false}
                    />
                    <div className="fs-slider-bounds">
                      <span>Left Peak</span>
                      <span>Right Peak</span>
                    </div>
                  </div>
                ) : (
                  <div className="fs-slider-group">
                    <div className="fs-slider-header">
                      <span className="fs-slider-label">Skew Intensity</span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={skewAmount}
                      onChange={setSkewAmount}
                      step={1}
                      disabled={isSubmitting}
                    />
                    <div className="fs-slider-bounds">
                      <span>Symmetric</span>
                      <span>Heavy Skew</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Strategy Geometry */}
          <div className="fs-sc-geometry-section">
            <span className="fs-sc-geometry-label">Strategy Geometry</span>
            <div className="fs-shape-grid">
              {availableShapes.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  className={`fs-shape-btn ${selectedShape === def.id ? 'active' : ''}`}
                  onClick={() => setSelectedShape(def.id)}
                  title={def.description}
                  disabled={isSubmitting}
                >
                  <svg
                    className="fs-shape-icon"
                    viewBox="0 0 100 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={def.svgPath} />
                  </svg>
                  <span className="fs-shape-name">{def.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {buyError && <div className="fs-error-box">{buyError.message}</div>}

        {/* Footer: Amount input + Submit side by side */}
        <div className="fs-sc-footer">
          <div className="fs-sc-amount-wrapper">
            <span className="fs-sc-amount-prefix">$</span>
            <input
              id="fs-sc-amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
