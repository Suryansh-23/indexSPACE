import { createContext } from 'react';
import type { FSClient, PayoutCurve } from '@functionspace/core';

export interface FSContext {
  client: FSClient;
  previewBelief: number[] | null;
  setPreviewBelief: (belief: number[] | null) => void;
  previewPayout: PayoutCurve | null;
  setPreviewPayout: (payout: PayoutCurve | null) => void;
  invalidate: (marketId: string | number) => void;
  /** Internal: counter that increments on invalidate, hooks watch this */
  invalidationCount: number;
}

export const FunctionSpaceContext = createContext<FSContext | null>(null);
