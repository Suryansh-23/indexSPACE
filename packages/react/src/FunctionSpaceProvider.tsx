import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FSClient, loginUser, signupUser, fetchCurrentUser } from '@functionspace/core';
import type { PayoutCurve, Position, UserProfile, SignupOptions } from '@functionspace/core';
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
    username?: string;
    password?: string;
    autoAuthenticate?: boolean;
  };
  theme?: FSThemeInput;
  children: React.ReactNode;
}

export function FunctionSpaceProvider({ config, theme, children }: FunctionSpaceProviderProps) {
  const clientRef = useRef<FSClient | null>(null);
  const [providerReady, setProviderReady] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [previewBelief, setPreviewBelief] = useState<number[] | null>(null);
  const [previewPayout, setPreviewPayout] = useState<PayoutCurve | null>(null);
  const [invalidationCount, setInvalidationCount] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Create client once
  if (!clientRef.current) {
    clientRef.current = new FSClient(config);
  }

  const client = clientRef.current;

  // Dual-mode auth on mount
  useEffect(() => {
    const shouldAutoAuth = config.autoAuthenticate !== false && !!config.username && !!config.password;

    if (shouldAutoAuth) {
      // Auto-auth via loginUser — single request returns token + user profile
      setAuthLoading(true);
      loginUser(client, config.username!, config.password!)
        .then((result) => {
          client.setToken(result.token);
          setUser(result.user);
          setProviderReady(true);
        })
        .catch((err) => {
          setAuthError(err instanceof Error ? err : new Error(String(err)));
          setProviderReady(true);
        })
        .finally(() => setAuthLoading(false));
    } else {
      // Interactive mode: ready immediately, guest browsing enabled
      setProviderReady(true);
    }
  }, []);

  // Login callback (interactive auth) — returns UserProfile for caller convenience
  const login = useCallback(async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await loginUser(client, username, password);
      client.setToken(result.token);
      setUser(result.user);
      setInvalidationCount((c) => c + 1);
      return result.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      throw error; // re-throw so AuthWidget can catch and display inline
    } finally {
      setAuthLoading(false);
    }
  }, [client]);

  // Signup callback (signup → auto-login) — returns UserProfile for caller convenience
  const signup = useCallback(async (username: string, password: string, options?: SignupOptions) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signupUser(client, username, password, options);
      // Signup returns no token — login to get session
      const result = await loginUser(client, username, password);
      client.setToken(result.token);
      setUser(result.user);
      setInvalidationCount((c) => c + 1);
      return result.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [client]);

  // Logout callback
  const logout = useCallback(() => {
    client.clearToken();
    setUser(null);
    setAuthError(null);
    setSelectedPosition(null);
    setPreviewBelief(null);
    setPreviewPayout(null);
    setInvalidationCount((c) => c + 1);
  }, [client]);

  // Refresh user profile (wallet balance update after trades)
  const refreshUser = useCallback(async () => {
    if (!client.isAuthenticated) return;
    try {
      const profile = await fetchCurrentUser(client);
      setUser(profile);
    } catch {
      // silently fail — wallet refresh is best-effort
    }
  }, [client]);

  // Invalidate: increment counter + refresh user wallet when authenticated
  const invalidate = useCallback((_marketId: string | number) => {
    setInvalidationCount((c) => c + 1);
    if (client.isAuthenticated) {
      fetchCurrentUser(client).then(setUser).catch(() => {});
    }
  }, [client]);

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

  const isAuthenticated = user !== null;

  const contextValue = useMemo(() => ({
    client,
    previewBelief,
    setPreviewBelief,
    previewPayout,
    setPreviewPayout,
    invalidate,
    invalidationCount,
    selectedPosition,
    setSelectedPosition,
    user,
    isAuthenticated,
    authLoading,
    authError,
    login,
    signup,
    logout,
    refreshUser,
  }), [
    previewBelief, previewPayout, invalidate, invalidationCount,
    selectedPosition, user, isAuthenticated, authLoading, authError,
    login, signup, logout, refreshUser,
  ]);

  if (!providerReady) {
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
