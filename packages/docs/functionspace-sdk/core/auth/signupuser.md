# signupUser

**`signupUser(client, username, password, options?)`**

**Layer:** L1. Registers a new user. Returns the user profile but no token. You must call `loginUser` after signup to obtain a session.

```typescript
async function signupUser(
  client: FSClient,
  username: string,
  password: string,
  options?: SignupOptions,
): Promise<{ user: UserProfile }>
```

**Options:**

```typescript
interface SignupOptions {
  accessCode?: string;  // Invite/access code if the server requires one
}
```

Throws on failure with the server's error detail message, or `"Signup failed: no user in response"` if the response is malformed.

**Example:**

```typescript
const { user } = await signupUser(client, 'newtrader', 'password123', {
  accessCode: 'INVITE-CODE',
});
// No token yet, must login
const { token } = await loginUser(client, 'newtrader', 'password123');
client.setToken(token);
```
