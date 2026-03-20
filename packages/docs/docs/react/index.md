---
title: "React"
sidebar_position: 1
description: "Provider setup, context fields, theme resolution, and data hook patterns for @functionspace/react."
---

# React

`@functionspace/react` provides React hooks, a Provider component, and a theme system that wraps `@functionspace/core` into an idiomatic React API. Requires `@functionspace/core` as a peer dependency.

All hooks must be called within a `FunctionSpaceProvider`. Primary data-fetching hooks share a common return shape (`loading`, `isFetching`, `error`, `refetch`). Composite hooks (`useBucketDistribution`, `useDistributionState`) omit `isFetching` since they delegate to inner hooks. All data-fetching hooks automatically re-fetch when `ctx.invalidate(marketId)` is called after trades. Data is served from a query cache -- `loading` is true only on the first fetch (no cached data), while `isFetching` indicates background refetches.

#### Provider & Context

**`FunctionSpaceProvider`**

Root component that initializes the SDK for a React tree. Creates an `FSClient`, manages authentication state, resolves theme tokens, injects 30 CSS custom properties onto a wrapper ``, provides resolved `ChartColors` for Recharts rendering, and exposes shared context (preview state, invalidation, auth) to all descendant hooks and components.

All hooks in `@functionspace/react` require a `FunctionSpaceProvider` ancestor. Calling any hook outside this provider throws an error.

```tsx
<FunctionSpaceProvider
  config={{
    baseUrl: string;
    username?: string;
    password?: string;
    autoAuthenticate?: boolean;
  }}
  theme?: FSThemeInput
  cache?: CacheConfig
>
  {children}
</FunctionSpaceProvider>
```

**Props:**

| Prop                      | Type            | Description                                                                                                                                                                                              |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.baseUrl`          | `string`        | API base URL (e.g., `"https://api.example.com"`)                                                                                                                                                         |
| `config.username`         | `string?`       | Username for auto-authentication on mount                                                                                                                                                                |
| `config.password`         | `string?`       | Password for auto-authentication on mount                                                                                                                                                                |
| `config.autoAuthenticate` | `boolean?`      | Controls auto-login behavior. Auto-auth fires when this is not explicitly `false` AND both `username` and `password` are truthy. Set to `false` to suppress auto-auth even when credentials are present. |
| `theme`                   | `FSThemeInput?` | Preset name (`"fs-dark"`, `"fs-light"`, `"native-dark"`, `"native-light"`), partial theme object with optional `preset` base, or full `FSTheme`. Defaults to `"fs-dark"`. See Theme System.              |
| `cache`                   | `CacheConfig?`  | Cache configuration. Accepts `staleTime` (ms before data is considered stale), `gcTime` (ms before unused entries are garbage collected), `defaultPollInterval` (ms), `revalidateOnFocus` (default: true), `revalidateOnReconnect` (default: true). |
| `storedUsername`          | `string \| null?` | Previously authenticated username. When provided, the Provider attempts silent re-auth on mount via `silentReAuth`. If the account requires a password, sets `showAdminLogin: true` on context. |
| `children`                | `ReactNode`     | Child component tree                                                                                                                                                                                     |

**Auth modes:**

1. **Auto-auth mode** (`username` + `password` provided, `autoAuthenticate` not `false`): Calls `loginUser(client, username, password)` on mount. Renders an "Authenticating..." placeholder until the request completes. On success, sets the token on the client and stores the `UserProfile`. On failure, stores the error on `authError` but still renders children, allowing guest-mode browsing.
2. **Stored username mode** (`storedUsername` provided, no auto-auth credentials): Renders children immediately, then attempts `silentReAuth(client, storedUsername)` in the background. On success, sets the token and user. If the account requires a password (`PASSWORD_REQUIRED`), sets `showAdminLogin: true` and `pendingAdminUsername` on context so UI widgets can prompt the user. On other failures, clears the stored username.
3. **Interactive mode** (no credentials, or `autoAuthenticate: false`): Renders children immediately in guest mode (read-only market browsing). The application authenticates later by calling `login()`, `signup()`, or `passwordlessLogin()` from `useAuth()`.
4. **Guest mode** (no credentials, no intent to authenticate): Identical to interactive mode at the Provider level. All data hooks work (market data, consensus, distributions), but mutation operations require authentication.

The exact auto-auth condition: `config.autoAuthenticate !== false && !!config.username && !!config.password`.

**Context fields (`FSContext`):**

_Auth:_


| Field | Type | Description |
| --- | --- | --- |
| `client` | `FSClient` | Shared API client instance, pre-configured with `baseUrl`. Token is set automatically after successful auth. |
| `user` | `UserProfile \| null` | Authenticated user profile, or `null` in guest mode |
| `isAuthenticated` | `boolean` | `true` when `user` is not `null` |
| `authLoading` | `boolean` | `true` during in-progress `login` or `signup` calls |
| `authError` | `Error \| null` | Most recent auth error. Cleared at the start of each `login()`, `signup()`, or `logout()` call. |
| `login` | `(username: string, password: string) => Promise` | Authenticates, sets token on client, stores user, invalidates all cache entries. Throws on failure. |
| `signup` | `(username: string, password: string, options?: SignupOptions) => Promise` | Registers via `signupUser`, then calls `loginUser` (signup returns no token). Stores user, invalidates all cache entries. Throws on failure. |
| `logout` | `() => void` | Clears token, user, `authError`, all preview state, and `selectedPosition`. Invalidates all cache entries. |
| `refreshUser` | `() => Promise` | Re-fetches the current user profile (e.g., wallet balance after trades). No-ops silently if `client.isAuthenticated` is `false`. |
| `passwordlessLogin` | `(username: string) => Promise<PasswordlessLoginResult>` | Passwordless login or auto-signup. Sets token, stores user, invalidates all cache entries. Throws with `code: PASSWORD_REQUIRED` for password-protected accounts. |
| `showAdminLogin` | `boolean` | `true` when silent re-auth detected a password-protected stored username. Used by `PasswordlessAuthWidget` to auto-open an admin login prompt. |
| `pendingAdminUsername` | `string \| null` | The username that triggered `showAdminLogin`. Pre-fills the username field in admin login forms. |
| `clearAdminLogin` | `() => void` | Resets `showAdminLogin` and `pendingAdminUsername`. Called after successful admin login or dismissal. |


_Preview coordination:_


| Field | Type | Description |
| --- | --- | --- |
| `previewBelief` | `number[] \| null` | Trade preview belief vector, written by trading widgets, read by chart components |
| `setPreviewBelief` | `(belief: number[] \| null) => void` | Setter for `previewBelief` |
| `previewPayout` | `PayoutCurve \| null` | Trade payout preview, written by trading widgets |
| `setPreviewPayout` | `(payout: PayoutCurve \| null) => void` | Setter for `previewPayout` |
| `selectedPosition` | `Position \| null` | Currently selected position for chart overlay, typically set by a position table row click |
| `setSelectedPosition` | `(pos: Position \| null) => void` | Setter for `selectedPosition` |


_Invalidation:_


| Field | Type | Description |
| --- | --- | --- |
| `invalidate` | `(marketId: string \| number) => void` | Marks cache entries for the given market as stale, triggering subscribed hooks to refetch. Also refreshes the user profile via `fetchCurrentUser` when authenticated (best-effort, errors swallowed). |
| `invalidateAll` | `() => void` | Marks all cache entries as stale, triggering all mounted data hooks to refetch. Called automatically by `login()`, `signup()`, and `logout()`. |


_Theme:_


| Field | Type | Description |
| --- | --- | --- |
| `chartColors` | `ChartColors` | Resolved concrete hex/rgba color values for Recharts SVG rendering. Derived from the resolved theme, with preset-specific overrides for named presets. See `ChartColors` in Theme System. |


**Invalidation mechanism:**

After a trade, call `ctx.invalidate(marketId)`. This marks the cache entries keyed to that market as stale, causing all hooks subscribed to those entries to refetch. If the user is authenticated, `invalidate` also fires a background `fetchCurrentUser` call to refresh the wallet balance (failure is silently ignored). The `login()`, `signup()`, and `logout()` callbacks call `invalidateAll()`, which marks all cache entries as stale, so all data hooks automatically refresh after auth state changes.

**Examples:**

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';

// Auto-auth: logs in on mount, shows "Authenticating..." until ready
<FunctionSpaceProvider
  config={{
    baseUrl: 'https://api.example.com',
    username: 'trader1',
    password: 'secret',
  }}
  theme="fs-dark"
>
  <App />
</FunctionSpaceProvider>

// Interactive: starts as guest, user authenticates later via useAuth()
<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com' }}
  theme={{ preset: 'native-dark', primary: '#ff6600' }}
>
  <App />
</FunctionSpaceProvider>

// Guest-only: no credentials, read-only market browsing
<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com' }}
>
  <App />
</FunctionSpaceProvider>
```

**`FunctionSpaceContext`**

The raw React context object created via `createContext<FSContext | null>(null)`. All hooks call `useContext(FunctionSpaceContext)` internally and throw if the value is `null` (meaning the hook was used outside a `FunctionSpaceProvider`). Direct access is rarely needed; prefer the specialized hooks (`useAuth`, `useMarket`, etc.) which provide narrower, typed interfaces.



**`resolveTheme(input?)`**

```typescript
function resolveTheme(input?: FSThemeInput): ResolvedFSTheme
```

Pure function that normalizes an `FSThemeInput` into a `ResolvedFSTheme` with all 30 tokens guaranteed present. Called internally by the Provider on each render (memoized on the `theme` prop), but exported for use outside Provider contexts (e.g., build-time theme generation, testing).

**Resolution rules:**

* `undefined` / not provided: returns `FS_DARK`
* String preset ID (e.g., `"fs-light"`): returns the matching preset, or `FS_DARK` if unrecognized
* Object with `preset` key: starts from the named preset, spreads overrides, then calls `applyDefaults` to derive missing optional tokens
* Object without `preset`: treats the input as a raw `FSTheme` and calls `applyDefaults` to derive all 21 optional tokens from the 9 required core tokens

#### Data Hooks

All data-fetching hooks share a common pattern:

* Accept `marketId` as the first argument
* Return `{ data, loading, isFetching, error, refetch }` (where `data` is the hook-specific field name like `market`, `consensus`, etc.)
* `loading` is `true` only on the first fetch (no cached data). On background refetches, `loading` stays `false` and `isFetching` is `true`.
* Primary data-fetching hooks accept optional `QueryOptions` (`pollInterval`, `enabled`). Composite hooks do not accept `QueryOptions` directly -- they inherit polling behavior from their inner hooks.
* Automatically re-fetch when `ctx.invalidate(marketId)` is called or when the cache entry is otherwise invalidated
* Throw if called outside a `FunctionSpaceProvider`
* `refetch()` returns `Promise<void>` and triggers a background refetch
