---
title: "Client"
sidebar_position: 1
description: "Overview of FSClient, the HTTP client that manages auth tokens and API communication."
---

# Client

`FSClient` is the HTTP client that every query, transaction, and preview function accepts as its first argument. It manages authentication tokens, auto-retries on 401, and supports guest mode for read-only access.
