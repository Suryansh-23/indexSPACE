---
title: "fetchCurrentUser"
sidebar_position: 3
---

# fetchCurrentUser

**`fetchCurrentUser(client)`**

**Layer:** L1. Fetches the profile of the currently authenticated user. Routes through `client.get()` which includes the Bearer token. Requires the client to be authenticated (will trigger auto-auth if credentials are configured).

```typescript
async function fetchCurrentUser(client: FSClient): Promise<UserProfile>
```

Returns the same `UserProfile` type documented above. Handles both nested (`{ user: {...} }`) and flat (`{ user_id, ... }`) API response shapes.

**Example:**

```typescript
import { fetchCurrentUser } from '@functionspace/core';

const profile = await fetchCurrentUser(client);
console.log(`Wallet balance: $${profile.walletValue}`);
```
