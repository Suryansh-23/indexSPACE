---
title: "Transactions"
sidebar_position: 1
description: "State-mutating functions (buy and sell) that require an authenticated FSClient."
---

# Transactions

Transactions are the only functions in the SDK that mutate server state. Both require an authenticated `FSClient` (the client must have a valid token, which happens automatically when using `FunctionSpaceProvider` in the React layer, or manually via `loginUser` in core-only usage).
