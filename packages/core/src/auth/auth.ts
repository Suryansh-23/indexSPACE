import type { FSClient } from '../client.js';
import type { UserProfile, SignupOptions, PasswordlessLoginResult } from '../types.js';
import { PASSWORD_REQUIRED } from '../types.js';

// ── Response mapping ──

function mapUserProfile(raw: any): UserProfile {
  return {
    userId: raw.user_id,
    username: raw.username,
    walletValue: raw.wallet_value ?? 0,
    role: raw.role || 'trader',
  };
}

// ── Auth functions ──

/**
 * Authenticate a user and return token + profile.
 * Uses raw fetch() to bypass ensureAuth  -- auth endpoints are the one case
 * where we POST without a token.
 */
export async function loginUser(
  client: FSClient,
  username: string,
  password: string,
): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${client.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Login failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.success || !data.access_token) {
    throw new Error('Login failed: invalid response');
  }

  return {
    user: mapUserProfile(data.user),
    token: data.access_token,
  };
}

/**
 * Register a new user. Returns the user profile but NO token  --
 * caller must call loginUser after to obtain a session token.
 */
export async function signupUser(
  client: FSClient,
  username: string,
  password: string,
  options?: SignupOptions,
): Promise<{ user: UserProfile }> {
  const body: Record<string, string> = { username, password };
  if (options?.accessCode) body.access_code = options.accessCode;

  const res = await fetch(`${client.base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Signup failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.user) {
    throw new Error('Signup failed: no user in response');
  }
  return { user: mapUserProfile(data.user) };
}

/**
 * Fetch current user profile using existing auth token.
 * Routes through client.get() which includes the Bearer token.
 */
export async function fetchCurrentUser(client: FSClient): Promise<UserProfile> {
  const data = await client.get<any>('/api/auth/me');
  // Handle both nested ({ user: {...} }) and flat ({ user_id, ... }) response shapes
  const raw = data.user ?? data;
  return mapUserProfile(raw);
}

// ── Passwordless Auth ──

/**
 * Passwordless login: try login with username only, auto-signup if user
 * doesn't exist, throw PASSWORD_REQUIRED for password-protected accounts.
 *
 * Uses raw fetch() to bypass ensureAuth (same pattern as loginUser).
 */
export async function passwordlessLoginUser(
  client: FSClient,
  username: string,
): Promise<PasswordlessLoginResult> {
  // Step 1: Try passwordless login
  const loginRes = await fetch(`${client.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (loginRes.ok) {
    const data = await loginRes.json();
    if (!data.user || !data.access_token) {
      throw new Error('Login failed: invalid response');
    }
    return {
      action: 'login',
      user: mapUserProfile(data.user),
      token: data.access_token,
    };
  }

  // Step 2: Handle login failure
  const loginData = await loginRes.json().catch(() => ({}));
  const detail = loginData.detail || '';

  // Password-protected account
  if (detail === 'Password required for this account') {
    const err = new Error(detail) as Error & { code: string };
    err.code = PASSWORD_REQUIRED;
    throw err;
  }

  // User doesn't exist -- auto-signup
  if (detail === 'Invalid username') {
    const signupRes = await fetch(`${client.base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (signupRes.ok) {
      const signupData = await signupRes.json();
      if (!signupData.user || !signupData.access_token) {
        throw new Error('Signup failed: invalid response');
      }
      return {
        action: 'signup',
        user: mapUserProfile(signupData.user),
        token: signupData.access_token,
      };
    }

    // Signup failed (e.g., 409 username taken)
    const signupError = await signupRes.json().catch(() => ({}));
    throw new Error(signupError.detail || `Signup failed: ${signupRes.status}`);
  }

  // Other login error
  throw new Error(detail || `Login failed: ${loginRes.status}`);
}

/**
 * Attempt silent re-authentication with a stored username.
 * Used by the provider on mount when a previously authenticated user returns.
 *
 * Returns the result on success, or throws:
 * - PASSWORD_REQUIRED: account needs password
 * - Other errors: re-auth failed
 */
export async function silentReAuth(
  client: FSClient,
  username: string,
): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch(`${client.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (res.ok) {
    const data = await res.json();
    if (!data.user || !data.access_token) {
      throw new Error('Re-auth failed: invalid response');
    }
    return {
      user: mapUserProfile(data.user),
      token: data.access_token,
    };
  }

  const data = await res.json().catch(() => ({}));
  const detail = data.detail || '';

  if (detail === 'Password required for this account') {
    const err = new Error(detail) as Error & { code: string };
    err.code = PASSWORD_REQUIRED;
    throw err;
  }

  throw new Error(detail || `Re-auth failed: ${res.status}`);
}

// ── Validation ──

/**
 * Client-side username validation.
 * Port from demo's src/lib/username.js.
 */
export function validateUsername(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (trimmed.length > 32) return { valid: false, error: 'Username must be at most 32 characters' };
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return { valid: false, error: 'Only letters, numbers, dots, dashes, and underscores allowed' };
  }
  return { valid: true };
}
