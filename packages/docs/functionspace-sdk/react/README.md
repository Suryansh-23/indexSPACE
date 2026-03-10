# React

`@functionspace/react` provides React hooks, a Provider component, and a theme system that wraps `@functionspace/core` into an idiomatic React API. Requires `@functionspace/core` as a peer dependency.

All hooks must be called within a `FunctionSpaceProvider`. Every data-fetching hook shares a common return shape (`loading`, `error`, `refetch`) and automatically re-fetches when `ctx.invalidate(marketId)` is called after trades.

#### Provider & Context

**`FunctionSpaceProvider`**

Root component that initializes the SDK for a React tree. Creates an `FSClient`, manages authentication state, resolves theme tokens, injects 30 CSS custom properties onto a wrapper `<div>`, provides resolved `ChartColors` for Recharts rendering, and exposes shared context (preview state, invalidation, auth) to all descendant hooks and components.

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
| `children`                | `ReactNode`     | Child component tree                                                                                                                                                                                     |

**Auth modes:**

1. **Auto-auth mode** (`username` + `password` provided, `autoAuthenticate` not `false`): Calls `loginUser(client, username, password)` on mount. Renders an "Authenticating..." placeholder until the request completes. On success, sets the token on the client and stores the `UserProfile`. On failure, stores the error on `authError` but still renders children, allowing guest-mode browsing. Does not increment `invalidationCount`.
2. **Interactive mode** (no credentials, or `autoAuthenticate: false`): Renders children immediately in guest mode (read-only market browsing). The application authenticates later by calling `login()` or `signup()` from `useAuth()`.
3. **Guest mode** (no credentials, no intent to authenticate): Identical to interactive mode at the Provider level. All data hooks work (market data, consensus, distributions), but mutation operations require authentication.

The exact auto-auth condition: `config.autoAuthenticate !== false && !!config.username && !!config.password`.

**Context fields (`FSContext`):**

_Auth:_

<table><thead><tr><th width="173.84375">Field</th><th width="233.0859375">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>client</code></td><td><code>FSClient</code></td><td>Shared API client instance, pre-configured with <code>baseUrl</code>. Token is set automatically after successful auth.</td></tr><tr><td><code>user</code></td><td><code>UserProfile | null</code></td><td>Authenticated user profile, or <code>null</code> in guest mode</td></tr><tr><td><code>isAuthenticated</code></td><td><code>boolean</code></td><td><code>true</code> when <code>user</code> is not <code>null</code></td></tr><tr><td><code>authLoading</code></td><td><code>boolean</code></td><td><code>true</code> during in-progress <code>login</code> or <code>signup</code> calls</td></tr><tr><td><code>authError</code></td><td><code>Error | null</code></td><td>Most recent auth error. Cleared at the start of each <code>login()</code>, <code>signup()</code>, or <code>logout()</code> call.</td></tr><tr><td><code>login</code></td><td><code>(username: string, password: string) => Promise&#x3C;UserProfile></code></td><td>Authenticates, sets token on client, stores user, increments <code>invalidationCount</code>. Throws on failure.</td></tr><tr><td><code>signup</code></td><td><code>(username: string, password: string, options?: SignupOptions) => Promise&#x3C;UserProfile></code></td><td>Registers via <code>signupUser</code>, then calls <code>loginUser</code> (signup returns no token). Stores user, increments <code>invalidationCount</code>. Throws on failure.</td></tr><tr><td><code>logout</code></td><td><code>() => void</code></td><td>Clears token, user, <code>authError</code>, all preview state, and <code>selectedPosition</code>. Increments <code>invalidationCount</code>.</td></tr><tr><td><code>refreshUser</code></td><td><code>() => Promise&#x3C;void></code></td><td>Re-fetches the current user profile (e.g., wallet balance after trades). No-ops silently if <code>client.isAuthenticated</code> is <code>false</code>.</td></tr></tbody></table>

_Preview coordination:_

<table><thead><tr><th width="193.51953125">Field</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td><code>previewBelief</code></td><td><code>number[] | null</code></td><td>Trade preview belief vector, written by trading widgets, read by chart components</td></tr><tr><td><code>setPreviewBelief</code></td><td><code>(belief: number[] | null) => void</code></td><td>Setter for <code>previewBelief</code></td></tr><tr><td><code>previewPayout</code></td><td><code>PayoutCurve | null</code></td><td>Trade payout projection, written by trading widgets</td></tr><tr><td><code>setPreviewPayout</code></td><td><code>(payout: PayoutCurve | null) => void</code></td><td>Setter for <code>previewPayout</code></td></tr><tr><td><code>selectedPosition</code></td><td><code>Position | null</code></td><td>Currently selected position for chart overlay, typically set by a position table row click</td></tr><tr><td><code>setSelectedPosition</code></td><td><code>(pos: Position | null) => void</code></td><td>Setter for <code>selectedPosition</code></td></tr></tbody></table>

_Invalidation:_

<table><thead><tr><th width="173.875">Field</th><th width="208.078125">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>invalidate</code></td><td><code>(marketId: string | number) => void</code></td><td>Increments <code>invalidationCount</code> (triggering all data hooks to re-fetch) and, if authenticated, refreshes the user profile via <code>fetchCurrentUser</code> (best-effort, errors swallowed). The <code>marketId</code> parameter is accepted for future per-market invalidation but currently unused.</td></tr><tr><td><code>invalidationCount</code></td><td><code>number</code></td><td>Counter watched by all data hooks. Increments on calls to <code>invalidate()</code>, <code>login()</code>, <code>signup()</code>, and <code>logout()</code>. Does not increment on auto-auth at mount.</td></tr></tbody></table>

_Theme:_

<table><thead><tr><th width="171.46875">Field</th><th width="153.1171875">Type</th><th>Description</th></tr></thead><tbody><tr><td><code>chartColors</code></td><td><code>ChartColors</code></td><td>Resolved concrete hex/rgba color values for Recharts SVG rendering. Derived from the resolved theme, with preset-specific overrides for named presets. See <code>ChartColors</code> in Theme System.</td></tr></tbody></table>

**Invalidation mechanism:**

After a trade, call `ctx.invalidate(marketId)`. This increments the internal `invalidationCount`, which every data hook includes in its `useEffect` dependency array. All hooks re-fetch in parallel on the next render. If the user is authenticated, `invalidate` also fires a background `fetchCurrentUser` call to refresh the wallet balance (failure is silently ignored). The `login()`, `signup()`, and `logout()` callbacks also increment `invalidationCount`, so all data hooks automatically refresh after auth state changes.

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
* Return `{ data, loading, error, refetch }` (where `data` is the hook-specific field name like `market`, `consensus`, etc.)
* Start with `loading: true`, set to `false` after the first fetch completes
* Automatically re-fetch when `ctx.invalidationCount` changes (triggered by `invalidate()`, `login()`, `signup()`, or `logout()`)
* Throw if called outside a `FunctionSpaceProvider`
* `refetch()` can be called imperatively to force a re-fetch at any time
