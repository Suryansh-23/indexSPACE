# Auth

Authentication functions for login, signup, and user profile retrieval. These use raw `fetch()` internally (bypassing the client's `ensureAuth`) because auth endpoints are the one case where you POST without a token.

In the React layer, `FunctionSpaceProvider` wraps these into `login()`, `signup()`, and `logout()` callbacks on the context, managing token lifecycle automatically. The core auth functions below are for standalone (non-React) usage.
