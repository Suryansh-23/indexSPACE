import type { FSClient } from '../client.js';
import type { UserProfile, SignupOptions } from '../types.js';

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
 * Uses raw fetch() to bypass ensureAuth — auth endpoints are the one case
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
 * Register a new user. Returns the user profile but NO token —
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
