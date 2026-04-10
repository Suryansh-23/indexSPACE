---
title: "loginUser"
sidebar_position: 1
description: "Authenticate a user with username and password, returning a session token and profile."
---

# loginUser

**`loginUser(client, username, password)`**

**Layer:** L1. Authenticates a user against the API. Returns the user profile and a session token. The token is not automatically set on the client; you must call `client.setToken(token)` yourself (or use the React Provider which handles this).

```typescript
async function loginUser(
  client: FSClient,
  username: string,
  password: string,
): Promise<{ user: UserProfile; token: string }>
```

**Returns `{ user: UserProfile, token: string }`:**

```typescript
interface UserProfile {
  userId: number;
  username: string;
  walletValue: number;                     // Current wallet balance
  role: 'trader' | 'creator' | 'admin';
}
```

Throws on failure with the server's error detail message, or `"Login failed: invalid response"` if the response shape is unexpected.

**Example:**

```typescript
import { FSClient, loginUser } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
const { user, token } = await loginUser(client, 'trader1', 'secret');
client.setToken(token);

console.log(`Logged in as ${user.username} (${user.role}), wallet: $${user.walletValue}`);
```


