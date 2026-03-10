# Getting Started

### Installation

bash

```bash
# Core SDK (required)
npm install @functionspace/core

# React hooks (optional, for React apps)
npm install @functionspace/react

# UI components (optional)
npm install @functionspace/ui
```

**Peer Dependencies:**

* `viem` ^2.0.0
* `@wagmi/core` ^2.0.0 (for React package)

### Quick Start

**Query a market (no wallet required):**

typescript

```javascript
import { queryMarketState, queryConsensusSummary } from '@functionspace/core';

// Get complete market state
const market = await queryMarketState('market-id-123');

// Get statistical summary
const stats = await queryConsensusSummary('market-id-123');
console.log(`Market expects: ${stats.mean} ± ${stats.std_dev}`);
```

**Generate a belief shape:**

typescript

```typescript
import { generateGaussian } from '@functionspace/core';

// Create a bell curve belief centered at 50 with spread of 10
const belief = generateGaussian(50, 10, { bounds: [0, 100] });
```

### Configuration

typescript

```typescript
import { createConfig } from '@functionspace/core';

const config = createConfig({
  chain: 'polygon',           // or 'arbitrum', 'base', etc.
  indexerUrl: 'https://indexer.functionspace.io/graphql',
  rpcUrl: 'https://polygon-rpc.com',  // optional: use your own RPC
});
```

### Authentication & Wallets

The SDK accepts any standard EIP-1193 signer. See Integration Guides for specific wallet provider setup.

typescript

```typescript
// Pass signer to transaction functions
await buy(marketId, belief, collateral, { signer });
```
