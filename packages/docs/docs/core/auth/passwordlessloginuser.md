---
title: "passwordlessLoginUser"
sidebar_position: 5
description: "Single-call passwordless auth that handles login, auto-signup, or password-required rejection."
---

# passwordlessLoginUser

**`passwordlessLoginUser(client, username)`**

**Layer:** L1. Passwordless authentication that handles three scenarios in a single call: login for existing passwordless accounts, auto-signup for new usernames, and rejection for password-protected accounts.

```typescript
async function passwordlessLoginUser(
  client: FSClient,
  username: string,
): Promise<PasswordlessLoginResult>
```

**Returns `PasswordlessLoginResult`:**

```typescript
interface PasswordlessLoginResult {
  action: 'login' | 'signup';
  user: UserProfile;
  token: string;
}
```

The `action` field indicates whether the user was logged into an existing account or a new account was created.

**Behavior:**

1. Attempts passwordless login with the given username
2. If the account exists and has no password, returns the token and user profile with `action: 'login'`
3. If the account does not exist, auto-creates it and returns with `action: 'signup'`
4. If the account requires a password, throws an error with `code: PASSWORD_REQUIRED`

**Error handling:**

```typescript
import { passwordlessLoginUser, PASSWORD_REQUIRED } from '@functionspace/core';

try {
  const result = await passwordlessLoginUser(client, username);
  client.setToken(result.token);
  console.log(`${result.action}: ${result.user.username}`);
} catch (err) {
  if (err.code === PASSWORD_REQUIRED) {
    // This account needs a password -- fall back to loginUser()
  } else {
    // Other error (network, server, etc.)
  }
}
```

**Example:**

```typescript
import { FSClient, passwordlessLoginUser } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
const result = await passwordlessLoginUser(client, 'trader1');
client.setToken(result.token);

console.log(`Authenticated as ${result.user.username} via ${result.action}`);
```
