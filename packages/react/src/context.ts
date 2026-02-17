import { createContext } from 'react';
import type { FSClient, PayoutCurve, Position, UserProfile, SignupOptions } from '@functionspace/core';

export interface FSContext {
  client: FSClient;
  previewBelief: number[] | null;
  setPreviewBelief: (belief: number[] | null) => void;
  previewPayout: PayoutCurve | null;
  setPreviewPayout: (payout: PayoutCurve | null) => void;
  invalidate: (marketId: string | number) => void;
  /** Internal: counter that increments on invalidate, hooks watch this */
  invalidationCount: number;
  /** Selected position for component coordination (chart/table sync) */
  selectedPosition: Position | null;
  setSelectedPosition: (pos: Position | null) => void;
  /** Current authenticated user, null when in guest mode */
  user: UserProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: Error | null;
  login: (username: string, password: string) => Promise<UserProfile>;
  signup: (username: string, password: string, options?: SignupOptions) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const FunctionSpaceContext = createContext<FSContext | null>(null);
