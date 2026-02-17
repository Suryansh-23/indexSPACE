# Auth Widget — Handoff Document

> **Scope**: Add interactive authentication to the SDK — a login/signup widget, auth state
> in context, and the ability for the provider to start unauthenticated so users can browse
> markets before signing in. Auth is required only for actions (buy/sell).
>
> **Touches all 3 layers**: Core (auth functions, types, client changes), React (context
> auth state, provider dual mode, useAuth hook), UI (AuthWidget component).

---

## 1. Source File Map

### Demo Source (fs_demo)

| File | Purpose | SDK Relevance |
|------|---------|---------------|
| `src/context/AuthContext.jsx` | Auth state management, login/signup/logout/refreshWallet functions | **High** — port `login`, `signup`, `logout`, `refreshWallet` logic (stripped of Supabase/OAuth) |
| `src/components/LoginScreen.jsx` | Login modal with username/password form | **High** — port the username/password form (strip Google OAuth button) |
| `src/components/SignUpScreen.jsx` | Signup form with username, password, access code | **High** — port username/password/accessCode form (strip Google OAuth) |
| `src/App.jsx` (NavBar, lines 20-105) | Wallet balance + username display + logout button | **High** — port the authenticated-state display layout |
| `src/services/apiService.js` (interceptor) | Guest header fallback (`X-Username: guest`) for unauthenticated requests | **Medium** — replicate guest-mode pattern in FSClient |
| `src/lib/username.js` | Username validation (3-32 chars, alphanumeric + dots/dashes/underscores) | **Port directly** — pure validation function for core layer |

### SDK Destination

| File | Layer | Change Required |
|------|-------|-----------------|
| `packages/core/src/types.ts` | Core | **Add** `UserProfile` type, update `FSConfig` (optional credentials + `autoAuthenticate` flag) |
| `packages/core/src/client.ts` | Core | **Modify** — support unauthenticated mode, add `setToken()`/`clearToken()`/`isAuthenticated` getter, public `base` getter, guest mode in `request()`, 401 retry guard for guest mode |
| `packages/core/src/auth/` | Core | **New directory** — `auth.ts` with auth functions and `validateUsername` |
| `packages/react/src/context.ts` | React | **Modify** — add auth fields to `FSContext` |
| `packages/react/src/FunctionSpaceProvider.tsx` | React | **Modify** — dual-mode auth, expose auth state |
| `packages/react/src/useAuth.ts` | React | **New** — hook exposing auth state and actions |
| `packages/ui/src/market/AuthWidget.tsx` | UI | **New** — the sign in / sign up / user info widget |
| `packages/ui/src/styles/base.css` | UI | **Add** auth widget styles |
| `tests/architecture.test.ts` | Tests | **Update** — verify exports, layer boundaries |
| `tests/hooks.test.tsx` | Tests | **Update** — add useAuth tests |

---

## 2. What the Component Displays

### Unauthenticated State (Sign In / Sign Up)

```
┌──────────────────────────────────┐
│        Sign In to Trade          │
│                                  │
│  [Sign In]     [Sign Up]         │
└──────────────────────────────────┘
```

Clicking **Sign In** expands to:

```
┌──────────────────────────────────┐
│           Sign In                │
│                                  │
│  Username ___________________    │
│  Password ___________________    │
│                                  │
│  (error message if any)          │
│                                  │
│  [Log In]              [Cancel]  │
│                                  │
│  Don't have an account? Sign up  │
└──────────────────────────────────┘
```

Clicking **Sign Up** expands to:

```
┌──────────────────────────────────┐
│        Create Account            │
│                                  │
│  Username ___________________    │
│  (3-32 chars, alphanumeric)      │
│  Password ___________________    │
│  Confirm  ___________________    │
│  Access Code ________________    │  ← only if requireAccessCode={true}
│                                  │
│  (error message if any)          │
│                                  │
│  [Create Account]      [Cancel]  │
│                                  │
│  Already have an account? Log in │
└──────────────────────────────────┘
```

### Authenticated State (User Info)

```
┌──────────────────────────────────┐
│  💰 $1,000.00    👤 alice  [⎋]  │
└──────────────────────────────────┘
```

Three elements in a horizontal row:
- **Wallet balance**: Positive-colored, `$X,XXX.XX` format
- **Username**: Secondary-text-colored
- **Sign Out button**: Negative-colored, small

### Loading State

```
┌──────────────────────────────────┐
│  Signing in...                   │
└──────────────────────────────────┘
```

### Error State

Errors display inline within the sign-in/sign-up form, not as a separate widget state.

---

## 3. API Contract

### POST /api/auth/login

**Request:**
```json
{ "username": "alice", "password": "secret123" }
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "user_id": 1,
    "username": "alice",
    "wallet_value": 1000.00,
    "has_admin": false,
    "role": "trader"
  },
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "message": "Login successful"
}
```

**Error (401):** `{ "detail": "Invalid username or password" }`

### POST /api/auth/signup

**Request:**
```json
{
  "username": "bob",
  "password": "secret456",
  "access_code": "ABC123"    // only if access code required
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "user_id": 2,
    "username": "bob",
    "wallet_value": 1000.00,
    "has_admin": false,
    "role": "trader"
  },
  "message": "Account created successfully"
}
```

**Errors:**
- 409: `{ "detail": "Username already exists" }`
- 403: `{ "detail": "Invalid access code" }`
- 400: `{ "detail": "Username must be 3-50 characters..." }`

**Note:** Signup response does NOT include `access_token`. After signup, the widget
should automatically call login to get a token and authenticate the session.

### GET /api/auth/me

**Request Headers:** `Authorization: Bearer <access_token>`

**Response (200):**
```json
{
  "user_id": 1,
  "username": "alice",
  "email": null,
  "wallet_value": 985.50,
  "has_admin": false,
  "role": "trader"
}
```

**Error (401):** Token invalid/expired.

### Unauthenticated Requests (Guest Mode)

The demo's `apiService.js` sends `X-Username: guest` as a fallback header when no token
exists. The backend accepts this for read-only endpoints (market state, consensus PDF,
positions listing). The SDK client should replicate this pattern so unauthenticated users
can browse market data.

---

## 4. Core Layer Types

### New: `UserProfile`

```typescript
export interface UserProfile {
  userId: number;
  username: string;
  walletValue: number;
  role: 'trader' | 'creator' | 'admin';
}
```

Map from backend snake_case: `user_id` → `userId`, `wallet_value` → `walletValue`,
`has_admin` → omitted (redundant with `role`).

### New: `AuthResult`

```typescript
export interface AuthResult {
  user: UserProfile;
  token: string;
}

export interface SignupResult {
  user: UserProfile;
}

export interface SignupOptions {
  accessCode?: string;
}
```

All four types (`UserProfile`, `AuthResult`, `SignupResult`, `SignupOptions`) live in
`packages/core/src/types.ts` alongside the existing types. Auth functions in `auth/auth.ts`
import them from `../types.js`.

### Updated: `FSConfig`

```typescript
export interface FSConfig {
  baseUrl: string;
  username?: string;           // Now optional
  password?: string;           // Now optional
  autoAuthenticate?: boolean;  // Default: true if username+password provided, false otherwise
}
```

**Backwards compatibility:** Existing consumers passing `{ baseUrl, username, password }`
get identical auto-auth behavior. The `autoAuthenticate` flag is for testing — set it to
`false` to bypass auto-login even when credentials are provided (lets developers experience
the unauthenticated flow during development).

---

## 5. Core Layer Auth Functions

Create `packages/core/src/auth/auth.ts`.

**Why `auth/` instead of splitting across `queries/` and `transactions/`?** Auth is a
cross-cutting concern — `loginUser` is a POST, `fetchCurrentUser` is a GET, `validateUsername`
is pure validation. Grouping them in one directory lets the implementing agent find all
auth logic in one place rather than scattered across three existing directories.

### `loginUser(client, username, password) → AuthResult`

```typescript
export async function loginUser(
  client: FSClient,
  username: string,
  password: string,
): Promise<AuthResult> {
  // IMPORTANT: Use raw fetch() against client.base — NOT client.post().
  // client.post() calls ensureAuth() which either auto-authenticates (wrong)
  // or throws "Authentication required" in guest mode (also wrong).
  // Auth endpoints are the one case where we POST without a token.
  // This matches how client.authenticate() already uses fetch() directly.
  const res = await fetch(`${client.base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Login failed: ${res.status}`);
  }
  const data = await res.json();
  // Return { user: mapUserProfile(data.user), token: data.access_token }
  // Do NOT call client.setToken() — the React layer (provider) handles token
  // storage. Core functions return data; the caller decides what to do with it.
  return { user: mapUserProfile(data.user), token: data.access_token };
}
```

### `signupUser(client, username, password, options?) → SignupResult`

```typescript
// SignupOptions imported from types.ts (defined in section 4)

export async function signupUser(
  client: FSClient,
  username: string,
  password: string,
  options?: SignupOptions,
): Promise<SignupResult> {
  // Same as loginUser: use raw fetch() — NOT client.post()
  const body: Record<string, string> = { username, password };
  if (options?.accessCode) body.access_code = options.accessCode;

  const res = await fetch(`${client.base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Signup failed: ${res.status}`);
  }
  const data = await res.json();
  return { user: mapUserProfile(data.user) };
  // NOTE: Does NOT return a token — caller must call loginUser after signup
}
```

### `fetchCurrentUser(client) → UserProfile`

```typescript
export async function fetchCurrentUser(client: FSClient): Promise<UserProfile> {
  // GET /api/auth/me (requires authenticated client)
  // Return mapUserProfile(data)
  // Used for wallet refresh after buy/sell
}
```

### `validateUsername(username) → { valid: boolean; error?: string }`

Port from demo's `src/lib/username.js`:

```typescript
export function validateUsername(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (trimmed.length > 32) return { valid: false, error: 'Username must be at most 32 characters' };
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return { valid: false, error: 'Only letters, numbers, dots, dashes, and underscores allowed' };
  }
  return { valid: true };
}
```

### `mapUserProfile(raw) → UserProfile`

```typescript
function mapUserProfile(raw: any): UserProfile {
  return {
    userId: raw.user_id,
    username: raw.username,
    walletValue: raw.wallet_value,
    role: raw.role || 'trader',
  };
}
```

---

## 6. FSClient Changes

The client needs four modifications:

### 1. Support optional credentials

```typescript
constructor(config: FSConfig) {
  this.baseUrl = config.baseUrl;
  this.username = config.username ?? '';   // May be empty
  this.password = config.password ?? '';   // May be empty
}
```

### 2. Guest mode for unauthenticated requests

When no token exists and the request is a GET, send `X-Username: guest` header instead
of blocking on authentication. This lets unauthenticated users browse market data.

```typescript
private async request<T>(...) {
  // If no token and no credentials → guest mode for GET requests
  if (!this.token && !this.username) {
    if (method === 'GET') {
      // Send with X-Username: guest header (no Authorization)
      const url = this.buildUrl(path, params);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'X-Username': 'guest', 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText} on GET ${path}`);
      return (await res.json()) as T;
    } else {
      throw new Error('Authentication required. Please sign in to perform this action.');
    }
  }

  // Otherwise: existing ensureAuth + Bearer token flow
  await this.ensureAuth();
  // ... rest of existing request logic ...
}
```

**Also update the 401 retry logic.** The existing retry (lines 79-82 of current `client.ts`)
calls `this.authenticate()` on 401. In guest mode (`!this.username`), this would attempt
to POST with empty credentials and fail. Add a guard:

```typescript
if (res.status === 401 && !isRetry) {
  this.token = null;
  // Only retry auth if credentials exist — guest mode cannot re-authenticate
  if (!this.username) {
    throw new Error('Authentication required. Please sign in to perform this action.');
  }
  await this.authenticate();
  return this.request<T>(method, path, body, params, true);
}
```

### 3. Public `base` getter

Auth functions (`loginUser`, `signupUser`) need the base URL to make raw `fetch()` calls
that bypass `ensureAuth()`. The existing `baseUrl` property is private. Add a public getter:

```typescript
public get base(): string {
  return this.baseUrl;
}
```

### 4. Public `setToken` / `clearToken` / `isAuthenticated`

After the provider's `login` callback calls `loginUser()`, it stores the returned token
on the client:

```typescript
public setToken(token: string): void {
  this.token = token;
}

public clearToken(): void {
  this.token = null;
}

public get isAuthenticated(): boolean {
  return this.token !== null;
}
```

---

## 7. React Layer: Context Auth State

### Updated `FSContext`

```typescript
export interface FSContext {
  // Existing fields (unchanged)
  client: FSClient;
  previewBelief: number[] | null;
  setPreviewBelief: (belief: number[] | null) => void;
  previewPayout: PayoutCurve | null;
  setPreviewPayout: (payout: PayoutCurve | null) => void;
  invalidate: (marketId: string | number) => void;
  invalidationCount: number;
  selectedPosition: Position | null;
  setSelectedPosition: (pos: Position | null) => void;

  // NEW: Auth state
  user: UserProfile | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: Error | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, options?: SignupOptions) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

---

## 8. React Layer: FunctionSpaceProvider Changes

### Dual-Mode Authentication

```typescript
export interface FunctionSpaceProviderProps {
  config: {
    baseUrl: string;
    username?: string;          // Now optional
    password?: string;          // Now optional
    autoAuthenticate?: boolean; // Default: true when credentials present
  };
  theme?: FSThemeInput;
  children: React.ReactNode;
}
```

**Behavior:**

| Config | `autoAuthenticate` | Provider Behavior |
|--------|-------------------|-------------------|
| `{ baseUrl, username, password }` | `true` (default) | Current behavior — auto-login, block until authenticated |
| `{ baseUrl, username, password }` | `false` | Start unauthenticated, credentials available for widget to use |
| `{ baseUrl }` | N/A (no credentials) | Start unauthenticated, widget handles login interactively |

When starting unauthenticated:
- The provider renders children immediately (no blocking)
- `ctx.user` is `null`, `ctx.isAuthenticated` is `false`
- Read-only hooks (useMarket, useConsensus, etc.) work via guest mode
- Write operations (buy, sell) throw a clear error: *"Authentication required"*
- After login via widget → `ctx.user` populated, `ctx.isAuthenticated` becomes `true`, all hooks invalidated to refetch with auth

### Login / Signup / Logout implementations in provider

```typescript
const login = useCallback(async (username: string, password: string) => {
  setAuthLoading(true);
  setAuthError(null);  // Clear previous errors on retry
  try {
    const result = await loginUser(clientRef.current!, username, password);
    clientRef.current!.setToken(result.token);
    setUser(result.user);
    setInvalidationCount(c => c + 1);  // Refetch all hooks with authenticated client
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setAuthError(error);  // Expose via useAuth().error for custom UIs
    throw error;          // Also rethrow so AuthWidget can catch and display inline
  } finally {
    setAuthLoading(false);
  }
}, []);

const signup = useCallback(async (username: string, password: string, options?: SignupOptions) => {
  setAuthLoading(true);
  setAuthError(null);  // Clear previous errors on retry
  try {
    await signupUser(clientRef.current!, username, password, options);
    // Auto-login after successful signup
    const result = await loginUser(clientRef.current!, username, password);
    clientRef.current!.setToken(result.token);
    setUser(result.user);
    setInvalidationCount(c => c + 1);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    setAuthError(error);
    throw error;
  } finally {
    setAuthLoading(false);
  }
}, []);

const logout = useCallback(() => {
  clientRef.current!.clearToken();
  setUser(null);
  setSelectedPosition(null);
  setPreviewBelief(null);
  setPreviewPayout(null);
  setInvalidationCount(c => c + 1);  // Refetch all hooks in guest mode
}, []);

const refreshUser = useCallback(async () => {
  if (!clientRef.current!.isAuthenticated) return;
  try {
    const profile = await fetchCurrentUser(clientRef.current!);
    setUser(profile);
  } catch (err) {
    console.error('Failed to refresh user:', err);
  }
}, []);
```

### Auto-auth on mount (backwards compatible)

**Important naming**: Rename the existing internal `authenticated` state variable to
`providerReady` to avoid confusion with `ctx.isAuthenticated`. The old `authenticated`
meant "user is authenticated"; now `providerReady` means "provider is initialized and
ready to render children." Auth state is tracked separately via `user !== null`.

```typescript
const [providerReady, setProviderReady] = useState(false);

useEffect(() => {
  const client = clientRef.current!;
  const shouldAutoAuth = config.autoAuthenticate !== false && config.username && config.password;

  if (shouldAutoAuth) {
    setAuthLoading(true);
    client.authenticate()
      .then(() => fetchCurrentUser(client))
      .then((profile) => {
        setUser(profile);
        setProviderReady(true);
      })
      .catch((err) => setAuthError(err))
      .finally(() => setAuthLoading(false));
  } else {
    // Start immediately in unauthenticated mode
    setProviderReady(true);
    setAuthLoading(false);
  }
}, []);

// Gate on providerReady (not isAuthenticated):
if (authError && !providerReady) {
  return <div style={{ color: 'red', padding: '1rem' }}>Authentication failed: {authError.message}</div>;
}
if (!providerReady) {
  return <div style={{ color: '#94a3b8', padding: '1rem' }}>Authenticating...</div>;
}
```

---

## 9. React Layer: `useAuth` Hook

```typescript
// packages/react/src/useAuth.ts
import { useContext } from 'react';
import { FunctionSpaceContext } from './context.js';

export function useAuth() {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useAuth must be used within FunctionSpaceProvider');

  return {
    user: ctx.user,
    isAuthenticated: ctx.isAuthenticated,
    loading: ctx.authLoading,
    error: ctx.authError,
    login: ctx.login,
    signup: ctx.signup,
    logout: ctx.logout,
    refreshUser: ctx.refreshUser,
  };
}
```

This follows the hook convention: `{ user, loading, error, ... }` where `user` is the named
property matching the hook purpose. The `error` field exposes `authError` from context so
consumers building custom auth UIs can display errors without wrapping `login()`/`signup()`
in try/catch.

**Note:** This hook is a state/action hook, not a data-fetching hook. It does NOT use
`ctx.invalidationCount` because auth state is managed by the provider itself, not
refetched on cache invalidation. The architecture test must exclude `useAuth.ts` from
the `invalidationCount` check (see section 12, step 10).

---

## 10. UI Layer: AuthWidget Component

### Props Interface

```typescript
export interface AuthWidgetProps {
  requireAccessCode?: boolean;  // Show access code field in signup (default: false)
  onLogin?: (user: UserProfile) => void;   // Callback after successful login
  onSignup?: (user: UserProfile) => void;  // Callback after successful signup
  onLogout?: () => void;                   // Callback after logout
}
```

### Component Structure

```typescript
export function AuthWidget({
  requireAccessCode = false,
  onLogin,
  onSignup,
  onLogout,
}: AuthWidgetProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('AuthWidget must be used within FunctionSpaceProvider');

  const { user, isAuthenticated, login, signup, logout, loading } = useAuth();
  const [view, setView] = useState<'idle' | 'login' | 'signup'>('idle');
  // Form state...

  if (isAuthenticated && user) {
    return <AuthenticatedView user={user} onLogout={...} />;
  }

  return <UnauthenticatedView view={view} ... />;
}
```

### Authenticated View

Horizontal row: wallet badge + username badge + sign out button.

```
[💰 $1,000.00]  [👤 alice]  [Sign Out]
```

- Wallet uses `var(--fs-positive)` color
- Username uses `var(--fs-text-secondary)` color
- Sign Out uses `var(--fs-negative)` color
- After sell/buy actions, `refreshUser` should be called to update wallet balance.
  This happens automatically: the provider calls `refreshUser` as part of the
  `invalidate()` flow after mutations.

### Unauthenticated View — Idle

Two buttons side by side:

```
[Sign In]  [Sign Up]
```

Clicking either sets the view to `'login'` or `'signup'`.

### Unauthenticated View — Login Form

Fields: Username (text), Password (password).
Buttons: Log In (primary), Cancel (secondary).
Link: "Don't have an account? Sign up" → switches to signup view.

### Unauthenticated View — Signup Form

Fields: Username (text), Password (password), Confirm Password (password),
Access Code (text, only if `requireAccessCode={true}`).
Buttons: Create Account (primary), Cancel (secondary).
Link: "Already have an account? Log in" → switches to login view.

### Validation

**Username** — validate on blur using `validateUsername()` from core:
- 3-32 characters
- Alphanumeric + dots, dashes, underscores
- Show inline error below the field

**Password** — validate on submit:
- Minimum 6 characters
- Confirm password must match

**Access Code** — no client-side validation, backend validates.

### Error Display

Errors from `login()` / `signup()` are caught and displayed inline:

```
┌─────────────────────────────┐
│  Invalid username or password│
└─────────────────────────────┘
```

Styled with `var(--fs-negative)` background tint.

### Wallet Refresh After Mutations

When `ctx.invalidate(marketId)` is called after a buy or sell, the provider should also call
`refreshUser()` to update the wallet balance. Add this to the `invalidate` callback:

```typescript
const invalidate = useCallback((_marketId: string | number) => {
  setInvalidationCount((c) => c + 1);
  // Also refresh user wallet if authenticated
  if (clientRef.current?.isAuthenticated) {
    fetchCurrentUser(clientRef.current).then(setUser).catch(() => {});
  }
}, []);
```

---

## 11. CSS Additions

Add to `base.css`. The auth widget root class `.fs-auth-widget` must be added to the
derived-variables selector (lines 4-12 of base.css).

```css
/* Auth widget */
.fs-auth-widget {
  background: linear-gradient(to bottom right, var(--fs-background), var(--fs-background-dark));
  border: 1px solid var(--fs-border);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
}

/* Authenticated state — horizontal row */
.fs-auth-user-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fs-auth-wallet {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: color-mix(in srgb, var(--fs-positive) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--fs-positive) 20%, transparent);
  border-radius: 0.5rem;
  color: var(--fs-positive);
  font-size: 0.875rem;
  font-weight: 600;
}

.fs-auth-username {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--fs-surface);
  border: 1px solid var(--fs-border);
  border-radius: 0.5rem;
  color: var(--fs-text-secondary);
  font-size: 0.875rem;
}

.fs-auth-signout-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: color-mix(in srgb, var(--fs-negative) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--fs-negative) 20%, transparent);
  border-radius: 0.5rem;
  color: var(--fs-negative);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.fs-auth-signout-btn:hover {
  background: color-mix(in srgb, var(--fs-negative) 20%, transparent);
}

/* Unauthenticated state — forms */
.fs-auth-actions {
  display: flex;
  gap: 0.75rem;
}

.fs-auth-btn {
  flex: 1;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.fs-auth-btn-primary {
  background: var(--fs-primary);
  color: white;
  border: none;
}

.fs-auth-btn-primary:hover {
  filter: brightness(1.1);
}

.fs-auth-btn-secondary {
  background: var(--fs-surface);
  color: var(--fs-text);
  border: 1px solid var(--fs-border);
}

.fs-auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.fs-auth-form-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--fs-text);
  margin: 0;
}

.fs-auth-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fs-auth-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--fs-text-secondary);
}

.fs-auth-input {
  padding: 0.5rem 0.75rem;
  background: var(--fs-input-bg);
  border: 1px solid var(--fs-border);
  border-radius: 0.375rem;
  color: var(--fs-text);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.fs-auth-input:focus {
  border-color: var(--fs-primary);
  box-shadow: 0 0 0 2px var(--fs-primary-glow);
}

.fs-auth-input-hint {
  font-size: 0.6875rem;
  color: var(--fs-text-secondary);
  opacity: 0.6;
}

.fs-auth-error {
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--fs-negative) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--fs-negative) 20%, transparent);
  border-radius: 0.375rem;
  color: var(--fs-negative);
  font-size: 0.8125rem;
}

.fs-auth-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.fs-auth-switch-link {
  font-size: 0.8125rem;
  color: var(--fs-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.fs-auth-switch-link:hover {
  color: var(--fs-primary);
}
```

**Critical**: Add `.fs-auth-widget` to the derived-variables selector at the top of `base.css`.

---

## 12. Implementation Guidance

### What to Change (Ordered by Priority)

1. **`packages/core/src/types.ts`** — Add `UserProfile`, `AuthResult`, `SignupResult`,
   `SignupOptions` types. Make `username` and `password` optional on `FSConfig`.
   Add `autoAuthenticate?: boolean`.

   **Note on config type sync:** The provider (`FunctionSpaceProvider.tsx`) currently
   inlines its own config shape rather than importing `FSConfig`. When updating `FSConfig`
   in types.ts, also update the inline config type in the provider's
   `FunctionSpaceProviderProps` to match. Both must have `username?`, `password?`, and
   `autoAuthenticate?`. Alternatively, refactor the provider to import `FSConfig` directly
   to avoid future drift — either approach is acceptable.

2. **`packages/core/src/auth/auth.ts`** — New file with `loginUser`, `signupUser`,
   `fetchCurrentUser`, `validateUsername`, `mapUserProfile`. Export from
   `packages/core/src/index.ts`.

3. **`packages/core/src/client.ts`** — Add `get base()` (public getter for `baseUrl`,
   needed by auth functions that bypass `ensureAuth`), `setToken()`, `clearToken()`,
   `get isAuthenticated`. Modify `request()` to support guest mode (GET requests
   without auth send `X-Username: guest`). POST/PUT without auth throws clear error.
   Update 401 retry to guard against guest mode. Make credentials optional in constructor.

4. **`packages/react/src/context.ts`** — Add `user`, `isAuthenticated`, `authLoading`,
   `login`, `signup`, `logout`, `refreshUser` to `FSContext`.

5. **`packages/react/src/FunctionSpaceProvider.tsx`** — Implement dual-mode auth.
   Add `login`, `signup`, `logout`, `refreshUser` functions. Update `invalidate` to
   also refresh user wallet. Remove the blocking auth check when in unauthenticated mode.

6. **`packages/react/src/useAuth.ts`** — New hook. Export from
   `packages/react/src/index.ts`.

7. **`packages/ui/src/market/AuthWidget.tsx`** — New component with three states:
   idle (sign in/up buttons), login form, signup form, and authenticated user bar.

8. **`packages/ui/src/styles/base.css`** — Add auth widget styles. Add `.fs-auth-widget`
   to derived-variables selector.

9. **Exports** — Follow the PLAYBOOK export chain (3-step for UI, direct for core/react):

   **Step 1 — Core** (`packages/core/src/index.ts`):
   ```typescript
   // Auth
   export { loginUser, signupUser, fetchCurrentUser, validateUsername } from './auth/auth.js';
   // Auth types (add to existing `export type { ... } from './types.js'` block)
   export type { UserProfile, AuthResult, SignupResult, SignupOptions } from './types.js';
   ```

   **Step 2 — React** (`packages/react/src/index.ts`):
   ```typescript
   export { useAuth } from './useAuth.js';
   ```

   **Step 3 — UI** (two files):
   ```typescript
   // packages/ui/src/market/index.ts
   export { AuthWidget } from './AuthWidget.js';
   export type { AuthWidgetProps } from './AuthWidget.js';

   // packages/ui/src/index.ts
   export { AuthWidget } from './market/index.js';
   export type { AuthWidgetProps } from './market/index.js';
   ```

10. **`tests/architecture.test.ts`** — Three changes:

    a. **Exclude `useAuth` from data-fetching hook checks.** The "Hook Patterns" tests
       (lines 57-97) check ALL `use*.ts` files for `ctx.invalidationCount` and the
       `{ loading, error, refetch }` pattern. `useAuth` is a state/action hook and does
       not use `invalidationCount`. Add a filter to exclude it:
       ```typescript
       const hookFiles = getFiles(reactDir, /^use.*\.ts$/).filter(f =>
         !f.endsWith('useAuth.ts') // Auth is a state/action hook, not data-fetching
       );
       ```
       Apply this exclusion to all three tests in the "Hook Patterns" describe block.

    b. **Add export completeness checks:**
       - `useAuth` in react package index
       - `AuthWidget` and `AuthWidgetProps` in ui package index
       - `UserProfile`, `AuthResult`, `SignupResult`, `SignupOptions` in core package index
       - `loginUser`, `signupUser`, `fetchCurrentUser`, `validateUsername` in core package index

    c. **Add component prop pattern check:**
       - `AuthWidget` has `requireAccessCode` prop

11. **`tests/hooks.test.tsx`** — Add `useAuth` tests: context check, returns
    `{ user, isAuthenticated, loading, error, login, signup, logout, refreshUser }`.

12. **Demo-app build** — `cd demo-app && npx vite build` must succeed.

### What NOT to Change

- Existing hooks (`useMarket`, `useConsensus`, `usePositions`, etc.) — they already work
  via `ctx.client`. When the client switches from guest to authenticated, `invalidationCount`
  increments and they refetch automatically.
- `ConsensusChart`, `DistributionChart`, `TimelineChart` — read-only, work in guest mode.
- `TradePanel`, `ShapeCutter` — these call `buy()` which goes through the client. If the
  client is unauthenticated, the POST will throw "Authentication required." These widgets
  don't need to check auth themselves — the error propagates naturally.

### Critical Invariants

1. **Backwards compatible** — `{ baseUrl, username, password }` config auto-authenticates
   exactly as before. No existing consumer code breaks.
2. **Guest mode = GET only** — Unauthenticated users can view market data but NOT trade.
   POST requests without auth throw a clear error.
3. **Single token source** — The token lives on `FSClient`. No localStorage, no cookies.
   The SDK is stateless across page reloads (consumer manages persistence if needed).
4. **Wallet refreshes on invalidate** — After every buy/sell, `invalidate()` also calls
   `fetchCurrentUser()` to update the wallet balance shown in the widget.
5. **CSS variables only** — No hardcoded colors in the auth widget.
6. **No Supabase / OAuth dependency** — Username/password only. No external auth providers.

### Established Precedents to Follow

- **Widget pattern**: Follow `MarketStats.tsx` — context check, loading/error states,
  self-contained data (PLAYBOOK "Quick Reference: Adding a New Widget").
- **Hook pattern**: `useAuth` checks context, returns named fields. Does NOT need
  `invalidationCount` reactivity since auth state is managed by the provider itself.
- **CSS naming**: `.fs-auth-{element}` following `.fs-{widget}-{element}` convention.
- **Export chain**: Component file → `market/index.ts` → `ui/src/index.ts` with
  `export type { }` for types.

---

## 13. Testing Checklist

| Test Case | Verify |
|-----------|--------|
| `FSConfig` with `username+password` auto-authenticates (existing behavior) | No regression |
| `FSConfig` with only `baseUrl` starts unauthenticated | Provider renders, `ctx.user === null` |
| `FSConfig` with credentials + `autoAuthenticate: false` starts unauthenticated | Provider renders without auto-login |
| `useAuth` outside provider throws | Clear error message |
| `useAuth` returns correct shape | `{ user, isAuthenticated, loading, error, login, signup, logout, refreshUser }` |
| AuthWidget unauthenticated shows Sign In / Sign Up buttons | Correct idle state |
| Clicking Sign In shows login form | Username + password fields |
| Clicking Sign Up shows signup form | Username + password + confirm fields |
| `requireAccessCode={true}` shows access code field in signup | Field visible and required |
| `requireAccessCode={false}` hides access code field | Field not rendered |
| Successful login shows authenticated view | Wallet + username + sign out |
| Successful signup auto-logs in and shows authenticated view | User created and authenticated |
| Login error displays inline | "Invalid username or password" shown |
| Signup error displays inline | "Username already exists" shown |
| Username validation on blur | Error shown for invalid usernames |
| Password validation on submit | Error for < 6 chars, mismatch |
| Sign Out clears auth state | `ctx.user === null`, hooks refetch in guest mode |
| Wallet updates after buy/sell | `invalidate()` triggers `refreshUser()` |
| Guest GET requests work | Market data loads without auth |
| Guest POST requests throw clear error | "Authentication required" message |
| Architecture tests pass | New exports verified |
| Demo-app build succeeds | `cd demo-app && npx vite build` |

---

## 14. Relationship to Other Handoff Documents

- **`positions-table-tabs-handoff.md`** — The `PositionTable` accepts a `username` prop
  to filter positions. Currently consumers pass `config.username`. With the auth widget,
  consumers could instead read `ctx.user?.username` from context. This is a future
  enhancement — do NOT change PositionTable in this handoff.

- **All existing widgets** — No changes needed. They work through the client, which
  now supports both authenticated and guest modes transparently.

---

## 15. Developer Usage Examples

### Interactive Auth (new pattern)
```tsx
<FunctionSpaceProvider config={{ baseUrl: 'https://api.example.com' }} theme="dark">
  <AuthWidget />
  <ConsensusChart marketId={1} height={400} />
  <PositionTable marketId={1} username="alice" />
</FunctionSpaceProvider>
```

User sees the chart immediately. AuthWidget shows "Sign In / Sign Up". After signing in,
wallet appears and trading is enabled.

### Interactive Auth with Access Code
```tsx
<FunctionSpaceProvider config={{ baseUrl: 'https://api.example.com' }} theme="dark">
  <AuthWidget requireAccessCode />
  <MarketCharts marketId={1} views={['consensus', 'distribution']} />
</FunctionSpaceProvider>
```

### Auto-Auth (existing pattern, backwards compatible)
```tsx
<FunctionSpaceProvider config={config} theme="dark">
  <AuthWidget />
  <ConsensusChart marketId={1} height={400} />
</FunctionSpaceProvider>
```

When `config` has `username + password`, auto-auth happens on mount. AuthWidget immediately
shows the authenticated state (wallet + username + sign out).

### Dev Testing Mode (bypass auto-auth)
```tsx
const config = {
  baseUrl: import.meta.env.VITE_FS_BASE_URL,
  username: import.meta.env.VITE_FS_USERNAME,
  password: import.meta.env.VITE_FS_PASSWORD,
  autoAuthenticate: false,  // ← Skip auto-login even though credentials exist
};

<FunctionSpaceProvider config={config} theme="dark">
  <AuthWidget />
  {/* Experience the unauthenticated flow as an end user would */}
</FunctionSpaceProvider>
```

### Custom Auth Hook Usage (advanced consumer)
```tsx
function MyCustomAuthUI() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (isAuthenticated) {
    return <div>Welcome {user.username}! Balance: ${user.walletValue}</div>;
  }

  return <button onClick={() => login('alice', 'pass')}>Log In</button>;
}
```
