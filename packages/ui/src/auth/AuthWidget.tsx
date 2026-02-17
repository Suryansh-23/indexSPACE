import React, { useState, useCallback } from 'react';
import { useAuth } from '@functionspace/react';
import { validateUsername } from '@functionspace/core';
import type { UserProfile } from '@functionspace/core';
import '../styles/base.css';

export interface AuthWidgetProps {
  requireAccessCode?: boolean;
  onLogin?: (user: UserProfile) => void;
  onSignup?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export function AuthWidget({
  requireAccessCode = false,
  onLogin,
  onSignup,
  onLogout,
}: AuthWidgetProps) {
  const { user, isAuthenticated, login, signup, logout, loading } = useAuth();

  const [view, setView] = useState<'idle' | 'login' | 'signup'>('idle');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setAccessCode('');
    setFormError(null);
    setUsernameError(null);
  }, []);

  const handleUsernameBlur = useCallback(() => {
    if (!username.trim()) {
      setUsernameError(null);
      return;
    }
    const result = validateUsername(username);
    setUsernameError(result.valid ? null : result.error ?? 'Invalid username');
  }, [username]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError('Username and password are required');
      return;
    }

    try {
      const loggedInUser = await login(username.trim(), password);
      resetForm();
      setView('idle');
      onLogin?.(loggedInUser);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed');
    }
  }, [username, password, login, resetForm, onLogin]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Invalid username');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      const options = requireAccessCode && accessCode ? { accessCode } : undefined;
      const signedUpUser = await signup(username.trim(), password, options);
      resetForm();
      setView('idle');
      onSignup?.(signedUpUser);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed');
    }
  }, [username, password, confirmPassword, accessCode, requireAccessCode, signup, resetForm, onSignup]);

  const handleLogout = useCallback(() => {
    logout();
    resetForm();
    setView('idle');
    onLogout?.();
  }, [logout, resetForm, onLogout]);

  const handleCancel = useCallback(() => {
    resetForm();
    setView('idle');
  }, [resetForm]);

  // ── Authenticated View ──
  if (isAuthenticated && user) {
    return (
      <div className="fs-auth-widget">
        <div className="fs-auth-user-bar">
          <span className="fs-auth-wallet">
            ${user.walletValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="fs-auth-username">
            {user.username}
          </span>
          <button className="fs-auth-signout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // ── Idle View (unauthenticated) ──
  if (view === 'idle') {
    return (
      <div className="fs-auth-widget">
        <div className="fs-auth-actions">
          <button
            className="fs-auth-btn fs-auth-btn-primary"
            onClick={() => { resetForm(); setView('login'); }}
          >
            Sign In
          </button>
          <button
            className="fs-auth-btn fs-auth-btn-secondary"
            onClick={() => { resetForm(); setView('signup'); }}
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  // ── Login Form ──
  if (view === 'login') {
    return (
      <div className="fs-auth-widget">
        <form className="fs-auth-form" onSubmit={handleLogin}>
          <h4 className="fs-auth-form-title">Sign In</h4>

          <div className="fs-auth-input-group">
            <label className="fs-auth-label">Username</label>
            <input
              className="fs-auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={handleUsernameBlur}
              placeholder="Enter username"
              disabled={loading}
              autoComplete="username"
            />
            {usernameError && <span className="fs-auth-input-hint" style={{ color: 'var(--fs-negative)' }}>{usernameError}</span>}
          </div>

          <div className="fs-auth-input-group">
            <label className="fs-auth-label">Password</label>
            <input
              className="fs-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {formError && <div className="fs-auth-error">{formError}</div>}

          <div className="fs-auth-form-footer">
            <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
            <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </button>
          </div>

          <button
            type="button"
            className="fs-auth-switch-link"
            onClick={() => { resetForm(); setView('signup'); }}
          >
            Don't have an account? Sign up
          </button>
        </form>
      </div>
    );
  }

  // ── Signup Form ──
  return (
    <div className="fs-auth-widget">
      <form className="fs-auth-form" onSubmit={handleSignup}>
        <h4 className="fs-auth-form-title">Create Account</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={handleUsernameBlur}
            placeholder="Choose a username"
            disabled={loading}
            autoComplete="username"
          />
          {usernameError && <span className="fs-auth-input-hint" style={{ color: 'var(--fs-negative)' }}>{usernameError}</span>}
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Password</label>
          <input
            className="fs-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 6 characters"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Confirm Password</label>
          <input
            className="fs-auth-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        {requireAccessCode && (
          <div className="fs-auth-input-group">
            <label className="fs-auth-label">Access Code</label>
            <input
              className="fs-auth-input"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
              disabled={loading}
            />
          </div>
        )}

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={handleCancel} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-switch-link"
          onClick={() => { resetForm(); setView('login'); }}
        >
          Already have an account? Log in
        </button>
      </form>
    </div>
  );
}
