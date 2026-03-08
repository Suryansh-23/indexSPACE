import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@functionspace/react';
import { validateUsername, PASSWORD_REQUIRED } from '@functionspace/core';
import type { UserProfile } from '@functionspace/core';
import '../styles/base.css';

export interface PasswordlessAuthWidgetProps {
  requireAccessCode?: boolean;
  onLogin?: (user: UserProfile, action: 'login' | 'signup') => void;
  onSignup?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export function PasswordlessAuthWidget({
  requireAccessCode = false,
  onLogin,
  onSignup,
  onLogout,
}: PasswordlessAuthWidgetProps) {
  const {
    user,
    isAuthenticated,
    passwordlessLogin,
    login,
    signup,
    logout,
    loading,
    showAdminLogin,
    pendingAdminUsername,
    clearAdminLogin,
  } = useAuth();

  const [view, setView] = useState<'idle' | 'passwordless' | 'admin' | 'admin-signup'>('idle');
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setAccessCode('');
    setFormError(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setView('idle');
    resetForm();
  }, [resetForm]);

  // Escape key closes modal
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, closeModal]);

  // Auto re-auth sync: when showAdminLogin becomes true, open admin view
  useEffect(() => {
    if (showAdminLogin) {
      setModalOpen(true);
      setView('admin');
      if (pendingAdminUsername) {
        setUsername(pendingAdminUsername);
      }
    }
  }, [showAdminLogin, pendingAdminUsername]);

  const handlePasswordlessSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateUsername(username);
    if (!validation.valid) {
      setFormError(validation.error ?? 'Invalid username');
      return;
    }

    try {
      const result = await passwordlessLogin(username.trim());
      onLogin?.(result.user, result.action);
      closeModal();
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === PASSWORD_REQUIRED) {
        setFormError('This account requires a password. Use Admin Login below.');
      } else {
        setFormError(err instanceof Error ? err.message : 'Login failed');
      }
    }
  }, [username, passwordlessLogin, onLogin, closeModal]);

  const handleAdminLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError('Username and password are required');
      return;
    }

    try {
      const loggedInUser = await login(username.trim(), password);
      onLogin?.(loggedInUser, 'login');
      clearAdminLogin();
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed');
    }
  }, [username, password, login, onLogin, clearAdminLogin, closeModal]);

  const handleAdminSignup = useCallback(async (e: React.FormEvent) => {
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
      onSignup?.(signedUpUser);
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed');
    }
  }, [username, password, confirmPassword, accessCode, requireAccessCode, signup, onSignup, closeModal]);

  const handleLogout = useCallback(() => {
    logout();
    resetForm();
    setView('idle');
    onLogout?.();
  }, [logout, resetForm, onLogout]);

  // -- Authenticated View (no modal) --
  if (isAuthenticated && user) {
    return (
      <div className="fs-passwordless-auth">
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

  // -- Idle View (unauthenticated, no modal) --
  const idleContent = (
    <div className="fs-passwordless-auth">
      <div className="fs-auth-actions" style={{ alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ color: 'var(--fs-text-secondary)', fontSize: '0.875rem' }}>Sign In to Trade</span>
        <button
          className="fs-auth-btn fs-auth-btn-primary"
          onClick={() => {
            resetForm();
            setModalOpen(true);
            setView('passwordless');
          }}
        >
          Sign In / Sign Up
        </button>
      </div>
    </div>
  );

  // -- Modal Content --
  let modalContent: React.ReactNode = null;

  if (view === 'passwordless') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handlePasswordlessSubmit}>
        <h4 className="fs-auth-form-title">Sign In / Sign Up</h4>
        <span className="fs-auth-label-hint">Sign in OR sign up with desired username</span>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={loading}
            autoComplete="username"
          />
        </div>

        {formError && <div className="fs-auth-error">{formError}</div>}

        <div className="fs-auth-form-footer">
          <button type="submit" className="fs-auth-btn fs-auth-btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In / Sign Up'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Admin Login
        </button>
      </form>
    );
  }

  if (view === 'admin') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminLogin}>
        <h4 className="fs-auth-form-title">Admin Login</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            disabled={loading}
            autoComplete="username"
          />
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
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('passwordless'); }}
        >
          Back to Sign In / Sign Up
        </button>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin-signup'); }}
        >
          Create Admin Account
        </button>
      </form>
    );
  }

  if (view === 'admin-signup') {
    modalContent = (
      <form className="fs-auth-form" onSubmit={handleAdminSignup}>
        <h4 className="fs-auth-form-title">Create Admin Account</h4>

        <div className="fs-auth-input-group">
          <label className="fs-auth-label">Username</label>
          <input
            className="fs-auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            disabled={loading}
            autoComplete="username"
          />
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
          <button type="button" className="fs-auth-btn fs-auth-btn-secondary" onClick={closeModal} disabled={loading}>
            Cancel
          </button>
        </div>

        <button
          type="button"
          className="fs-auth-mode-link"
          onClick={() => { resetForm(); setView('admin'); }}
        >
          Back to Admin Login
        </button>
      </form>
    );
  }

  return (
    <>
      {idleContent}
      {modalOpen && (
        <div className="fs-auth-modal-backdrop" onClick={closeModal}>
          <div className="fs-auth-modal fs-passwordless-auth" onClick={(e) => e.stopPropagation()}>
            {modalContent}
          </div>
        </div>
      )}
    </>
  );
}
