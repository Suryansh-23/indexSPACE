import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  generatePlateau,
  computeStatistics,
  projectPayoutCurve,
  buy,
} from '@functionspace/core';
import type { BuyResult } from '@functionspace/core';
import { FunctionSpaceContext, useMarket } from '@functionspace/react';
import type { TradeInputBaseProps } from './types.js';
import '../styles/base.css';

// ── X-Point Mode Types ──

export type XPointMode =
  | { mode: 'static'; value: number }
  | { mode: 'variable'; initial?: number }
  | { mode: 'dynamic-mode'; allowOverride?: boolean }
  | { mode: 'dynamic-mean'; allowOverride?: boolean };

export interface BinaryPanelProps extends TradeInputBaseProps {
  xPoint?: XPointMode;
  yesColor?: string;
  noColor?: string;
}

const DEFAULT_YES_COLOR = '#10b981';
const DEFAULT_NO_COLOR = '#f43f5e';

export function BinaryPanel({
  marketId,
  onBuy,
  onError,
  xPoint = { mode: 'variable' },
  yesColor = DEFAULT_YES_COLOR,
  noColor = DEFAULT_NO_COLOR,
}: BinaryPanelProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('BinaryPanel must be used within FunctionSpaceProvider');

  const { market, loading, error: marketError } = useMarket(marketId);

  const [side, setSide] = useState<'yes' | 'no' | null>(null);
  const [amount, setAmount] = useState('100');
  const [userOverrideX, setUserOverrideX] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local input state — allows free typing without mid-keystroke clamping
  const [xInputValue, setXInputValue] = useState('');
  const [isEditingX, setIsEditingX] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);
    };
  }, []);

  // ── X-Point Resolution ──

  const consensusStats = useMemo(() => {
    if (!market) return null;
    if (xPoint.mode !== 'dynamic-mode' && xPoint.mode !== 'dynamic-mean') return null;
    return computeStatistics(market.consensus, market.config.L, market.config.H);
  }, [market, xPoint.mode]);

  const resolvedX = useMemo(() => {
    if (!market) return null;
    const { L, H } = market.config;
    let raw: number | null = null;

    switch (xPoint.mode) {
      case 'static':
        raw = xPoint.value;
        break;
      case 'variable':
        raw = userOverrideX ?? xPoint.initial ?? (L + H) / 2;
        break;
      case 'dynamic-mode':
        raw = userOverrideX ?? consensusStats?.mode ?? (L + H) / 2;
        break;
      case 'dynamic-mean':
        raw = userOverrideX ?? consensusStats?.mean ?? (L + H) / 2;
        break;
    }

    return raw !== null ? Math.max(L, Math.min(H, raw)) : null;
  }, [market, xPoint, userOverrideX, consensusStats]);

  // Whether the X input is editable
  const xEditable = xPoint.mode === 'variable' ||
    ((xPoint.mode === 'dynamic-mode' || xPoint.mode === 'dynamic-mean') && xPoint.allowOverride);

  // ── Format X for display ──

  const formatX = (x: number): string => {
    if (!market) return x.toString();
    const decimals = market.decimals ?? 2;
    return x.toFixed(decimals);
  };

  // Sync local input from resolvedX when not actively editing
  useEffect(() => {
    if (!isEditingX && resolvedX !== null) {
      setXInputValue(formatX(resolvedX));
    }
  }, [resolvedX, isEditingX]);

  // ── Belief (single useMemo — consumed by Phase 1, 2, 3, and isFormValid) ──

  const belief = useMemo(() => {
    if (!market || !side || resolvedX === null) return null;
    const { K, L, H } = market.config;
    if (side === 'yes') {
      return generatePlateau(resolvedX, H, K, L, H, 1);
    } else {
      return generatePlateau(L, resolvedX, K, L, H, 1);
    }
  }, [market, side, resolvedX]);

  // Phase 1: Instant preview (no debounce)
  useEffect(() => {
    ctx.setPreviewBelief(belief);
    if (!belief) {
      ctx.setPreviewPayout(null);
    }
  }, [belief]);

  // Phase 2: Debounced payout projection
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral <= 0) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await projectPayoutCurve(ctx.client, marketId, belief, collateral);
        if (!mountedRef.current) return;
        ctx.setPreviewPayout(result);
      } catch {
        if (!mountedRef.current) return;
        ctx.setPreviewPayout(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [belief, amount, marketId]);

  // Phase 3: Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const collateral = parseFloat(amount);
    if (!belief || isNaN(collateral) || collateral < 1) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await buy(ctx.client, marketId, belief, collateral, {
        prediction: resolvedX!,
      });

      setSide(null);
      setAmount('100');
      ctx.setPreviewBelief(null);
      ctx.setPreviewPayout(null);

      onBuy?.(result);
      ctx.invalidate(marketId);
    } catch (err: any) {
      const errObj = err instanceof Error ? err : new Error(err?.message || 'Failed to submit trade');
      setError(errObj.message);
      onError?.(errObj);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = belief !== null && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 1;

  // ── X input commit (blur / Enter) ──

  const commitXValue = () => {
    setIsEditingX(false);
    const val = parseFloat(xInputValue);
    if (!isNaN(val) && market) {
      const { L, H } = market.config;
      setUserOverrideX(Math.max(L, Math.min(H, val)));
    }
  };

  // ── Button styles (dark-tinted background, colored text, subtle border) ──

  const getButtonStyle = (buttonSide: 'yes' | 'no'): React.CSSProperties => {
    const color = buttonSide === 'yes' ? yesColor : noColor;
    const isSelected = side === buttonSide;
    const isOtherSelected = side !== null && side !== buttonSide;

    return {
      flex: 1,
      padding: '0.75rem',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s',
      color,
      background: isSelected
        ? `color-mix(in srgb, ${color} 25%, black)`
        : `color-mix(in srgb, ${color} 12%, black)`,
      border: `1px solid color-mix(in srgb, ${color} ${isSelected ? 40 : 25}%, transparent)`,
      opacity: isOtherSelected ? 0.5 : 1,
    };
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="fs-binary-panel">
        <span style={{ color: 'var(--fs-text-secondary)', padding: '1.5rem', display: 'block' }}>Loading...</span>
      </div>
    );
  }

  if (marketError) {
    return (
      <div className="fs-binary-panel">
        <span style={{ color: 'var(--fs-negative)', padding: '1.5rem', display: 'block' }}>Error: {marketError.message}</span>
      </div>
    );
  }

  const units = market?.xAxisUnits ? ` ${market.xAxisUnits}` : '';

  return (
    <div className="fs-binary-panel">
      {/* Question header */}
      <div style={{ padding: '1.25rem 1.25rem 0' }}>
        <p style={{
          color: 'var(--fs-text)',
          fontSize: '1rem',
          fontWeight: 500,
          lineHeight: 1.5,
          margin: 0,
        }}>
          Will {market?.title || 'the outcome'} be{' '}
          more than{' '}
          {xEditable ? (
            <input
              type="number"
              value={xInputValue}
              onFocus={() => {
                setIsEditingX(true);
                if (resolvedX !== null) setXInputValue(formatX(resolvedX));
              }}
              onChange={(e) => setXInputValue(e.target.value)}
              onBlur={commitXValue}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              disabled={isSubmitting}
              style={{
                background: 'var(--fs-input-bg)',
                border: '1px solid var(--fs-border)',
                borderRadius: '0.25rem',
                color: 'var(--fs-primary)',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0.125rem 0.375rem',
                width: '5rem',
                textAlign: 'center',
                outline: 'none',
              }}
            />
          ) : (
            <span style={{
              background: 'var(--fs-input-bg)',
              borderRadius: '0.25rem',
              color: 'var(--fs-primary)',
              fontWeight: 700,
              padding: '0.125rem 0.375rem',
            }}>
              {resolvedX !== null ? formatX(resolvedX) : '—'}
            </span>
          )}
          {units}?
        </p>
      </div>

      {/* Yes / No buttons */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
      }}>
        <button
          type="button"
          onClick={() => setSide(side === 'yes' ? null : 'yes')}
          disabled={isSubmitting}
          style={getButtonStyle('yes')}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setSide(side === 'no' ? null : 'no')}
          disabled={isSubmitting}
          style={getButtonStyle('no')}
        >
          No
        </button>
      </div>

      {/* Amount + Submit (shown after selection) */}
      {side && (
        <form className="fs-trade-form" onSubmit={handleSubmit}>
          <div className="fs-input-group">
            <label htmlFor={`fs-binary-amount-${marketId}`}>Amount (USDC)</label>
            <input
              id={`fs-binary-amount-${marketId}`}
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

          {error && <div className="fs-error-box">{error}</div>}

          <button
            type="submit"
            className="fs-submit-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Trade'}
          </button>
        </form>
      )}
    </div>
  );
}
