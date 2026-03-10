# FSClient

**`FSClient`**

**In React:** You don't create `FSClient` directly. `FunctionSpaceProvider` creates and manages it. Access it via `useContext(FunctionSpaceContext).client`, or use hooks and trading widgets that access the client internally.

```typescript
class FSClient {
  constructor(config: FSConfig)

  get base(): string               // The base URL
  get isAuthenticated(): boolean    // Whether a token is set

  setToken(token: string): void     // Manually set a Bearer token
  clearToken(): void                // Remove the current token
  authenticate(): Promise<void>     // Login using the credentials from config

  get<T>(path: string, params?: Record<string, string>): Promise<T>
  post<T>(path: string, body?: unknown, params?: Record<string, string>): Promise<T>
}
```

**Constructor config `FSConfig`:**

```typescript
interface FSConfig {
  baseUrl: string;            // API base URL (e.g., "https://api.example.com")
  username?: string;          // Credentials for auto-authentication
  password?: string;          // Credentials for auto-authentication
  autoAuthenticate?: boolean; // Reserved for future use
}
```

**Authentication behavior:**

* **With credentials** (`username` + `password` provided): The client auto-authenticates on the first API call that requires a token. If a 401 is received, it clears the token, re-authenticates, and retries the request once.
* **Guest mode** (no credentials): GET requests go through with an `X-Username: guest` header. POST/mutation requests throw `"Authentication required. Please sign in to perform this action."`.
* **Manual token**: Call `setToken(token)` if you obtain a token through your own auth flow (e.g., from `loginUser`).

**Example (standalone usage):**

```typescript
import { FSClient, loginUser, queryMarketState } from '@functionspace/core';

// Option 1: Auto-auth via credentials
const client = new FSClient({
  baseUrl: 'https://api.example.com',
  username: 'trader1',
  password: 'secret',
});
// First API call triggers automatic login
const market = await queryMarketState(client, 42);

// Option 2: Manual token management
const guest = new FSClient({ baseUrl: 'https://api.example.com' });
const { token } = await loginUser(guest, 'trader1', 'secret');
guest.setToken(token);
// Now guest is authenticated for mutations
```



<br>
