---
title: "Auth"
sidebar_position: 1
---

# Auth

Authentication functions for login, signup, user profile retrieval, and passwordless flows. These use raw `fetch()` internally (bypassing the client's `ensureAuth`) because auth endpoints are the one case where you POST without a token.

In the React layer, `FunctionSpaceProvider` wraps these into `login()`, `signup()`, `passwordlessLogin()`, and `logout()` callbacks on the context, managing token lifecycle automatically. The core auth functions below are for standalone (non-React) usage.

**Exports:**

| Export | Type | Description |
| --- | --- | --- |
| `loginUser` | function | Authenticate with username and password |
| `signupUser` | function | Register a new user account |
| `fetchCurrentUser` | function | Fetch the authenticated user's profile |
| `validateUsername` | function | Client-side username validation (no network call) |
| `passwordlessLoginUser` | function | Login or auto-signup with just a username |
| `silentReAuth` | function | Re-authenticate a returning user from stored username |
| `PASSWORD_REQUIRED` | constant | Error code for password-protected accounts in passwordless flows |
