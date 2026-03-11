---
title: "useAuth"
sidebar_position: 1
---

# useAuth

**`useAuth()`**

Thin accessor hook that extracts authentication state and actions from the Provider context. Does not add any state or logic of its own.

```typescript
function useAuth(): {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<UserProfile>;
  signup: (username: string, password: string, options?: SignupOptions) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  passwordlessLogin: (username: string) => Promise<PasswordlessLoginResult>;
  showAdminLogin: boolean;
  pendingAdminUsername: string | null;
  clearAdminLogin: () => void;
}
```

**Returns:**

| Field             | Type                                                                                    | Description                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`            | `UserProfile \| null`                                                                   | Current user profile (userId, username, walletValue, role), or `null` in guest mode                                                                                        |
| `isAuthenticated` | `boolean`                                                                               | `true` when `user` is not null                                                                                                                                             |
| `loading`         | `boolean`                                                                               | `true` during login or signup operations                                                                                                                                   |
| `error`           | `Error \| null`                                                                         | Most recent authentication error. Cleared when a new login/signup attempt starts or on logout.                                                                             |
| `login`           | `(username: string, password: string) => Promise<UserProfile>`                          | Authenticate and return the user profile. Sets the token on the client, stores the user, and increments the invalidation counter. Re-throws errors for inline UI handling. |
| `signup`          | `(username: string, password: string, options?: SignupOptions) => Promise<UserProfile>` | Register a new user, then automatically log in (signup returns no token, so a login call follows). Increments the invalidation counter. Re-throws errors.                  |
| `logout`          | `() => void`                                                                            | Clear token, user profile, auth error, preview state (belief and payout), and selected position. Increments the invalidation counter.                                      |
| `refreshUser`     | `() => Promise<void>`                                                                   | Re-fetch the current user's profile (e.g., to update wallet balance after a trade). Silently fails if not authenticated.                                                   |
| `passwordlessLogin` | `(username: string) => Promise<PasswordlessLoginResult>` | Passwordless login or auto-signup. Sets the token, stores the user, and increments the invalidation counter. Throws with `code: PASSWORD_REQUIRED` for password-protected accounts. |
| `showAdminLogin`  | `boolean`                                                                               | `true` when silent re-auth detected a password-protected account. UI widgets use this to auto-open a password prompt.                                                      |
| `pendingAdminUsername` | `string \| null`                                                                   | The username that triggered `showAdminLogin`. Pre-fills the username field in admin login forms.                                                                           |
| `clearAdminLogin` | `() => void`                                                                            | Resets `showAdminLogin` and `pendingAdminUsername` to their default states. Called after successful admin login or when the user dismisses the prompt.                      |

**Behavior:**

* **No local state.** This hook reads directly from `FunctionSpaceContext` and returns a subset of its fields. The `loading` and `error` fields are renamed from `ctx.authLoading` and `ctx.authError` for ergonomic consumption.
* **Invalidation triggers.** `login`, `signup`, and `logout` all increment the context-level `invalidationCount`, causing data-fetching hooks (e.g., `useMarket`, `usePositions`) to refetch automatically.
* **Error lifecycle.** `login` and `signup` clear `authError` before attempting the operation and set it on failure. `logout` also clears `authError`. Errors are re-thrown by `login` and `signup` so callers can handle them inline.
* **Provider guard.** Throws `"useAuth must be used within FunctionSpaceProvider"` if called outside the provider tree.

**Delegates to:** `FunctionSpaceContext` (read-only accessor).

**Example:**

```tsx
function AuthButton() {
  const { user, isAuthenticated, login, logout, loading } = useAuth();

  if (isAuthenticated) {
    return (
      
        <span>{user!.username} (${user!.walletValue})</span>
        <button onClick={logout}>Sign Out</button>
      
    );
  }

  return (
    <button
      onClick={() => login('trader1', 'secret')}
      disabled={loading}
    >
      {loading ? 'Signing in...' : 'Sign In'}
    </button>
  );
}
```
