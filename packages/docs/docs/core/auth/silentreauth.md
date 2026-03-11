---
title: "silentReAuth"
sidebar_position: 6
---

# silentReAuth

**`silentReAuth(client, username)`**

**Layer:** L1. Attempts to re-authenticate a previously known user without credentials. Used by `FunctionSpaceProvider` on mount when a `storedUsername` prop is provided, enabling returning users to resume their session without re-entering credentials.

```typescript
async function silentReAuth(
  client: FSClient,
  username: string,
): Promise<{ user: UserProfile; token: string }>
```

**Returns `{ user: UserProfile, token: string }`** on success.

**Behavior:**

1. Sends a passwordless login request for the stored username
2. If the account exists and has no password, returns the token and user profile
3. If the account requires a password, throws an error with `code: PASSWORD_REQUIRED` -- the application should prompt the user for their password
4. On any other failure, throws an error -- the application should clear the stored username

**Error handling:**

```typescript
import { silentReAuth, PASSWORD_REQUIRED } from '@functionspace/core';

try {
  const { user, token } = await silentReAuth(client, storedUsername);
  client.setToken(token);
} catch (err) {
  if (err.code === PASSWORD_REQUIRED) {
    // Show password prompt for this account
  } else {
    // Clear stored username -- re-auth failed
  }
}
```

**Note:** In React apps, `FunctionSpaceProvider` handles silent re-auth automatically when `storedUsername` is passed. You typically only need this function for core-only (non-React) usage.
