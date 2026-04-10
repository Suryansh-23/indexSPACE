---
title: "PASSWORD_REQUIRED"
sidebar_position: 7
description: "Exported constant for identifying password-protected accounts in passwordless auth flows."
---

# PASSWORD_REQUIRED

**`PASSWORD_REQUIRED`**

Exported constant used as an error code to identify password-protected accounts during passwordless authentication flows.

```typescript
import { PASSWORD_REQUIRED } from '@functionspace/core';
// Value: 'PASSWORD_REQUIRED'
```

When `passwordlessLoginUser` or `silentReAuth` encounters a password-protected account, the thrown error includes `code: PASSWORD_REQUIRED`. Use this constant to match against that error code:

```typescript
try {
  const result = await passwordlessLoginUser(client, username);
} catch (err) {
  if ((err as Error & { code: string }).code === PASSWORD_REQUIRED) {
    // Fall back to password-based login
    const result = await loginUser(client, username, password);
  }
}
```

**Related:** `passwordlessLoginUser`, `silentReAuth`, `loginUser`
