# Client

`FSClient` is the HTTP client that every query, transaction, and projection function accepts as its first argument. It manages authentication tokens, auto-retries on 401, and supports guest mode for read-only access.
