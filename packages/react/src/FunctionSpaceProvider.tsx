import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FSClient } from '@functionspace/core';
import type { PayoutCurve } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

// ── Theme Types ──

export interface FSTheme {
  primary: string;
  accent: string;
  positive: string;
  negative: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export type ThemePreset = 'light' | 'dark';

export type FSThemeInput =
  | ThemePreset
  | (Partial<FSTheme> & { preset?: ThemePreset });

// ── Theme Presets ──

export const DARK_THEME: FSTheme = {
  primary: '#3b82f6',
  accent: '#fbbf24',
  positive: '#10b981',
  negative: '#f43f5e',
  background: '#0f1729',
  surface: '#1a2332',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  border: '#2d3748',
};

export const LIGHT_THEME: FSTheme = {
  primary: '#2563eb',
  accent: '#f59e0b',
  positive: '#059669',
  negative: '#dc2626',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
};

// ── Theme Resolution ──

function resolveTheme(input?: FSThemeInput): FSTheme {
  if (!input) return DARK_THEME;
  if (input === 'light') return LIGHT_THEME;
  if (input === 'dark') return DARK_THEME;

  const base = input.preset === 'light' ? LIGHT_THEME : DARK_THEME;
  const { preset, ...overrides } = input;
  return { ...base, ...overrides };
}

// ── Provider Props ──

export interface FunctionSpaceProviderProps {
  config: {
    baseUrl: string;
    username: string;
    password: string;
  };
  theme?: FSThemeInput;
  children: React.ReactNode;
}

export function FunctionSpaceProvider({ config, theme, children }: FunctionSpaceProviderProps) {
  const clientRef = useRef<FSClient | null>(null);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [previewBelief, setPreviewBelief] = useState<number[] | null>(null);
  const [previewPayout, setPreviewPayout] = useState<PayoutCurve | null>(null);
  const [invalidationCount, setInvalidationCount] = useState(0);

  // Create client once
  if (!clientRef.current) {
    clientRef.current = new FSClient(config);
  }

  // Authenticate on mount
  useEffect(() => {
    const client = clientRef.current!;
    client.authenticate()
      .then(() => setAuthenticated(true))
      .catch((err) => setAuthError(err));
  }, []);

  const invalidate = useCallback((_marketId: string | number) => {
    setInvalidationCount((c) => c + 1);
  }, []);

  // Resolve theme from preset + overrides
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  // CSS custom properties
  const style = useMemo(() => ({
    '--fs-primary': resolvedTheme.primary,
    '--fs-accent': resolvedTheme.accent,
    '--fs-positive': resolvedTheme.positive,
    '--fs-negative': resolvedTheme.negative,
    '--fs-background': resolvedTheme.background,
    '--fs-surface': resolvedTheme.surface,
    '--fs-text': resolvedTheme.text,
    '--fs-text-secondary': resolvedTheme.textSecondary,
    '--fs-border': resolvedTheme.border,
  } as React.CSSProperties), [resolvedTheme]);

  const contextValue = useMemo(() => ({
    client: clientRef.current!,
    previewBelief,
    setPreviewBelief,
    previewPayout,
    setPreviewPayout,
    invalidate,
    invalidationCount,
  }), [previewBelief, previewPayout, invalidate, invalidationCount]);

  if (authError) {
    return <div style={{ color: 'red', padding: '1rem' }}>Authentication failed: {authError.message}</div>;
  }

  if (!authenticated) {
    return <div style={{ color: '#94a3b8', padding: '1rem' }}>Authenticating...</div>;
  }

  return (
    <FunctionSpaceContext.Provider value={contextValue}>
      <div style={style}>
        {children}
      </div>
    </FunctionSpaceContext.Provider>
  );
}
