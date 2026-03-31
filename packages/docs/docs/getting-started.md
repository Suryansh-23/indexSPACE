---
title: "Getting Started"
sidebar_position: 3
description: "Installation, quick start examples, provider configuration, and authentication setup."
---

# Getting Started

### Installation

```bash
# Core SDK (required)
npm install @functionspace/core

# React hooks (optional, for React apps)
npm install @functionspace/react

# UI components (optional, recharts is a required peer dependency)
npm install @functionspace/ui recharts
```

Each package depends only on its lower layer (`@functionspace/ui` depends on `@functionspace/react`, which depends on `@functionspace/core`). The UI package requires `recharts` as a peer dependency for chart components.

### Quick Start

**Query a market (no wallet required):**

```typescript
import { FSClient, queryMarketState, queryConsensusSummary } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });

// Get complete market state
const market = await queryMarketState(client, 42);

// Get statistical summary
const stats = await queryConsensusSummary(client, 42);
console.log(`Market expects: ${stats.mean} ± ${stats.stdDev}`);
```

**Generate a belief shape:**

```typescript
import { generateGaussian } from '@functionspace/core';

const { numBuckets, lowerBound, upperBound } = market.config;

// Create a bell curve belief centered at 50 with spread of 10
const belief = generateGaussian(50, 10, numBuckets, lowerBound, upperBound);
```

### Configuration

**React apps** -- wrap your component tree with `FunctionSpaceProvider` and pass a config object with your API base URL:

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';

<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com' }}
  theme="fs-dark"
>
  <App />
</FunctionSpaceProvider>
```

The provider config accepts:

| Property           | Type      | Description                                      |
| ------------------ | --------- | ------------------------------------------------ |
| `baseUrl`          | `string`  | API base URL (required)                          |
| `username`         | `string?` | Username for auto-authentication on mount        |
| `password`         | `string?` | Password for auto-authentication on mount        |
| `autoAuthenticate` | `boolean?`| Set to `false` to suppress auto-auth even when credentials are present |

The provider also accepts a top-level `storedUsername` prop (outside `config`) to enable silent re-authentication for passwordless flows. When provided, the provider attempts `silentReAuth` on mount.

**Core-only (no React)** -- create an `FSClient` directly:

```typescript
import { FSClient } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
```

### Authentication

The SDK provides built-in authentication. In React apps, the Provider manages token lifecycle automatically. For core-only usage, call the auth functions directly:

```typescript
import { FSClient, loginUser } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
const { user, token } = await loginUser(client, 'trader1', 'password');
client.setToken(token);

// Now authenticated -- transaction functions will include the token
const { numBuckets } = market.config;
await buy(client, marketId, belief, collateral, numBuckets);
```

For passwordless authentication, use `passwordlessLoginUser` which handles login or auto-signup with just a username. See the [Auth](/core/auth) docs for details.
