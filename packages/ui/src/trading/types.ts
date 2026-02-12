/**
 * Shared types for trade input variants.
 *
 * All trade input variants (TradePanel, QuickBuy, SliderTrade, etc.) must satisfy
 * the TradeInputBaseProps interface. This ensures they are interchangeable and
 * share the same context contract.
 *
 * TYPE CONTRACT: All variants write Bernstein coefficient arrays to context:
 *   ctx.setPreviewBelief(belief: number[] | null)
 *   ctx.setPreviewPayout(payout: PayoutCurve | null)
 *
 * CLEANUP REQUIREMENT: All variants must clear context on unmount:
 *   useEffect(() => {
 *     return () => {
 *       ctx.setPreviewBelief(null);
 *       ctx.setPreviewPayout(null);
 *     };
 *   }, []);
 *
 * EXCLUSIVITY: Only one trade input should be mounted at a time.
 */

import type { BuyResult } from '@functionspace/core';

/**
 * Base props that all trade input variants must accept.
 */
export interface TradeInputBaseProps {
  /** The market to trade on */
  marketId: string | number;

  /** Callback when a trade is successfully submitted */
  onBuy?: (result: BuyResult) => void;

  /** Callback when a trade fails */
  onError?: (error: Error) => void;
}
