---
title: "validateUsername"
sidebar_position: 4
---

# validateUsername

**`validateUsername(name)`**

**Layer:** L0. Client-side username validation. No network call. Use this to validate input before calling `signupUser` to avoid unnecessary API round-trips.

```typescript
function validateUsername(name: string): { valid: boolean; error?: string }
```

**Rules:**

* Minimum 3 characters
* Maximum 32 characters
* Only letters, numbers, dots (`.`), dashes (`-`), and underscores (`_`)
* Input is trimmed before validation

**Example:**

```typescript
const result = validateUsername('ab');
// { valid: false, error: "Username must be at least 3 characters" }

const result2 = validateUsername('trader_1');
// { valid: true }

// Use before signup
const check = validateUsername(usernameInput);
if (!check.valid) {
  setError(check.error);
  return;
}
await signupUser(client, usernameInput, password);
```
