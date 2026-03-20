import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FSClient, loginUser, signupUser, fetchCurrentUser, passwordlessLoginUser, silentReAuth, PASSWORD_REQUIRED } from '@functionspace/core';
import type { PayoutCurve, Position, UserProfile, SignupOptions, PasswordlessLoginResult } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';
import { QueryCache } from './cache/index.js';
import type { CacheConfig } from './cache/index.js';
import { QueryCacheContext } from './QueryCacheContext.js';
import {
  FS_DARK, FS_LIGHT, NATIVE_DARK, NATIVE_LIGHT,
  resolveChartColors, getPresetChartColors,
  type FSTheme, type ResolvedFSTheme, type ThemePresetId,
} from './themes.js';

// Re-export theme types from themes.ts for backward compat
export type { FSTheme, ResolvedFSTheme, ThemePresetId } from './themes.js';

// ── Theme Input Type ──

export type FSThemeInput =
  | ThemePresetId
  | (Partial<FSTheme> & { preset?: ThemePresetId });

// ── Theme Resolution ──

const PRESET_MAP: Record<ThemePresetId, ResolvedFSTheme> = {
  'fs-dark': FS_DARK,
  'fs-light': FS_LIGHT,
  'native-dark': NATIVE_DARK,
  'native-light': NATIVE_LIGHT,
};

function applyDefaults(theme: FSTheme): ResolvedFSTheme {
  return {
    ...theme,
    bgSecondary:     theme.bgSecondary     ?? theme.background,
    surfaceHover:    theme.surfaceHover    ?? theme.surface,
    borderSubtle:    theme.borderSubtle    ?? theme.border,
    textMuted:       theme.textMuted       ?? theme.textSecondary,
    navFrom:         theme.navFrom         ?? theme.background,
    navTo:           theme.navTo           ?? theme.background,
    overlay:         theme.overlay         ?? 'rgba(0,0,0,0.2)',
    inputBg:         theme.inputBg         ?? theme.background,
    codeBg:          theme.codeBg          ?? theme.background,
    chartBg:         theme.chartBg         ?? theme.background,
    accentGlow:      theme.accentGlow      ?? 'rgba(59,130,246,0.25)',
    badgeBg:         theme.badgeBg         ?? 'rgba(128,128,128,0.15)',
    badgeBorder:     theme.badgeBorder     ?? 'rgba(128,128,128,0.25)',
    badgeText:       theme.badgeText       ?? theme.textSecondary,
    logoFilter:      theme.logoFilter      ?? 'none',
    fontFamily:      theme.fontFamily      ?? 'inherit',
    radiusSm:        theme.radiusSm        ?? '0.375rem',
    radiusMd:        theme.radiusMd        ?? '0.75rem',
    radiusLg:        theme.radiusLg        ?? '1rem',
    borderWidth:     theme.borderWidth     ?? '1px',
    transitionSpeed: theme.transitionSpeed ?? '200ms',
  };
}

export function resolveTheme(input?: FSThemeInput): ResolvedFSTheme {
  if (!input) return FS_DARK;

  if (typeof input === 'string') {
    return PRESET_MAP[input] ?? FS_DARK;
  }

  const { preset, ...overrides } = input;
  if (preset) {
    const base = PRESET_MAP[preset] ?? FS_DARK;
    return applyDefaults({ ...base, ...overrides });
  }

  // No preset  -- apply defaults to derive optional tokens from core 9
  return applyDefaults(overrides as FSTheme);
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
  cache?: CacheConfig;
  storedUsername?: string | null;
  children: React.ReactNode;
}

export function FunctionSpaceProvider({ config, theme, cache, storedUsername, children }: FunctionSpaceProviderProps) {
  const clientRef = useRef<FSClient | null>(null);
  const [providerReady, setProviderReady] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [previewBelief, setPreviewBelief] = useState<number[] | null>(null);
  const [previewPayout, setPreviewPayout] = useState<PayoutCurve | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [pendingAdminUsername, setPendingAdminUsername] = useState<string | null>(null);

  // Create client once
  if (!clientRef.current) {
    clientRef.current = new FSClient(config);
  }

  const client = clientRef.current;

  // Create cache once
  const cacheRef = useRef<QueryCache | null>(null);
  if (!cacheRef.current) {
    cacheRef.current = new QueryCache(cache);
  }
  const queryCache = cacheRef.current;

  // Cache lifecycle: init on mount (handles StrictMode remount), destroy on unmount
  useEffect(() => {
    queryCache.init();
    return () => { cacheRef.current?.destroy(); };
  }, [queryCache]);

  // Dual-mode auth on mount
  useEffect(() => {
    const shouldAutoAuth = config.autoAuthenticate !== false && !!config.username && !!config.password;

    if (shouldAutoAuth) {
      // Auto-auth via loginUser  -- single request returns token + user profile
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
    } else if (storedUsername) {
      // Stored username: attempt silent re-auth without blocking rendering
      setProviderReady(true);
      setAuthLoading(true);
      silentReAuth(client, storedUsername)
        .then((result) => {
          client.setToken(result.token);
          client.setStoredUsername(storedUsername);
          setUser(result.user);
        })
        .catch((err) => {
          if ((err as Error & { code: string }).code === PASSWORD_REQUIRED) {
            setPendingAdminUsername(storedUsername);
            setShowAdminLogin(true);
          } else {
            client.clearStoredUsername();
          }
        })
        .finally(() => setAuthLoading(false));
    } else {
      // Interactive mode: ready immediately, guest browsing enabled
      setProviderReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only effect; config/storedUsername are read once
  }, []);

  // Login callback (interactive auth)  -- returns UserProfile for caller convenience
  const login = useCallback(async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await loginUser(client, username, password);
      client.setToken(result.token);
      client.setStoredUsername(username);
      setUser(result.user);
      setShowAdminLogin(false);
      setPendingAdminUsername(null);
      queryCache.invalidateAll();
      return result.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      throw error; // re-throw so AuthWidget can catch and display inline
    } finally {
      setAuthLoading(false);
    }
  }, [client, queryCache]);

  // Signup callback (signup → auto-login)  -- returns UserProfile for caller convenience
  const signup = useCallback(async (username: string, password: string, options?: SignupOptions) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signupUser(client, username, password, options);
      // Signup returns no token  -- login to get session
      const result = await loginUser(client, username, password);
      client.setToken(result.token);
      setUser(result.user);
      queryCache.invalidateAll();
      return result.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [client, queryCache]);

  // Logout callback
  const logout = useCallback(() => {
    client.clearToken();
    client.clearStoredUsername();
    setUser(null);
    setAuthError(null);
    setShowAdminLogin(false);
    setPendingAdminUsername(null);
    setSelectedPosition(null);
    setPreviewBelief(null);
    setPreviewPayout(null);
    queryCache.invalidateAll();
  }, [client, queryCache]);

  // Refresh user profile (wallet balance update after trades)
  const refreshUser = useCallback(async () => {
    if (!client.isAuthenticated) return;
    try {
      const profile = await fetchCurrentUser(client);
      setUser(profile);
    } catch {
      // silently fail  -- wallet refresh is best-effort
    }
  }, [client]);

  // Passwordless login callback
  const passwordlessLogin = useCallback(async (username: string): Promise<PasswordlessLoginResult> => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await passwordlessLoginUser(client, username);
      client.setToken(result.token);
      client.setStoredUsername(username);
      setUser(result.user);
      setShowAdminLogin(false);
      setPendingAdminUsername(null);
      queryCache.invalidateAll();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setAuthError(error);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  }, [client, queryCache]);

  // Clear admin login state
  const clearAdminLogin = useCallback(() => {
    setShowAdminLogin(false);
    setPendingAdminUsername(null);
  }, []);

  // Invalidate: bust cache for a specific market + refresh user wallet when authenticated
  const invalidate = useCallback((marketId: string | number) => {
    queryCache.invalidate(String(marketId));
    if (client.isAuthenticated) {
      fetchCurrentUser(client).then(setUser).catch(() => {});
    }
  }, [client, queryCache]);

  // Invalidate all cache entries
  const invalidateAll = useCallback(() => {
    queryCache.invalidateAll();
  }, [queryCache]);

  // Resolve theme from preset + overrides
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  // Determine if input is a named preset (for chart color overrides)
  const presetId = typeof theme === 'string' ? theme : theme?.preset;
  const presetChartOverrides = presetId ? getPresetChartColors(presetId as ThemePresetId) : undefined;

  const resolvedChartColors = useMemo(
    () => resolveChartColors(resolvedTheme, presetChartOverrides),
    [resolvedTheme, presetChartOverrides]
  );

  // CSS custom properties (all 30 tokens)
  const style = useMemo(() => ({
    '--fs-primary':          resolvedTheme.primary,
    '--fs-accent':           resolvedTheme.accent,
    '--fs-positive':         resolvedTheme.positive,
    '--fs-negative':         resolvedTheme.negative,
    '--fs-background':       resolvedTheme.background,
    '--fs-surface':          resolvedTheme.surface,
    '--fs-text':             resolvedTheme.text,
    '--fs-text-secondary':   resolvedTheme.textSecondary,
    '--fs-border':           resolvedTheme.border,
    '--fs-bg-secondary':     resolvedTheme.bgSecondary,
    '--fs-surface-hover':    resolvedTheme.surfaceHover,
    '--fs-border-subtle':    resolvedTheme.borderSubtle,
    '--fs-text-muted':       resolvedTheme.textMuted,
    '--fs-nav-from':         resolvedTheme.navFrom,
    '--fs-nav-to':           resolvedTheme.navTo,
    '--fs-overlay':          resolvedTheme.overlay,
    '--fs-input-bg':         resolvedTheme.inputBg,
    '--fs-code-bg':          resolvedTheme.codeBg,
    '--fs-chart-bg':         resolvedTheme.chartBg,
    '--fs-accent-glow':      resolvedTheme.accentGlow,
    '--fs-badge-bg':         resolvedTheme.badgeBg,
    '--fs-badge-border':     resolvedTheme.badgeBorder,
    '--fs-badge-text':       resolvedTheme.badgeText,
    '--fs-logo-filter':      resolvedTheme.logoFilter,
    '--fs-font-family':      resolvedTheme.fontFamily,
    '--fs-radius-sm':        resolvedTheme.radiusSm,
    '--fs-radius-md':        resolvedTheme.radiusMd,
    '--fs-radius-lg':        resolvedTheme.radiusLg,
    '--fs-border-width':     resolvedTheme.borderWidth,
    '--fs-transition-speed': resolvedTheme.transitionSpeed,
  } as React.CSSProperties), [resolvedTheme]);

  const isAuthenticated = user !== null;

  const contextValue = useMemo(() => ({
    client,
    previewBelief,
    setPreviewBelief,
    previewPayout,
    setPreviewPayout,
    invalidate,
    invalidateAll,
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
    passwordlessLogin,
    showAdminLogin,
    pendingAdminUsername,
    clearAdminLogin,
    chartColors: resolvedChartColors,
  }), [
    previewBelief, previewPayout, invalidate, invalidateAll,
    selectedPosition, user, isAuthenticated, authLoading, authError,
    login, signup, logout, refreshUser, passwordlessLogin,
    showAdminLogin, pendingAdminUsername, clearAdminLogin,
    resolvedChartColors,
  ]);

  if (!providerReady) {
    return <div style={{ color: 'var(--fs-text-secondary)', padding: '1rem' }}>Authenticating...</div>;
  }

  return (
    <QueryCacheContext.Provider value={queryCache}>
      <FunctionSpaceContext.Provider value={contextValue}>
        <div style={style}>
          {children}
        </div>
      </FunctionSpaceContext.Provider>
    </QueryCacheContext.Provider>
  );
}
