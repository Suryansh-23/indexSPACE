# Gas Abstraction

**Purpose:** Enable users to transact without holding native chain tokens (ETH, MATIC, etc.).

**The Problem:** A user wants to trade. They have USDC but no ETH. In a normal flow, they must acquire ETH first—a massive friction point.

**Our Solution:** Multiple gas abstraction strategies that developers can configure.

**Strategy Options:**

| Strategy      | How It Works                                    | Who Pays              | User Experience                          |
| ------------- | ----------------------------------------------- | --------------------- | ---------------------------------------- |
| **Native**    | Standard transaction                            | User (in ETH/MATIC)   | User needs native token                  |
| **Sponsored** | Developer/protocol runs paymaster               | Developer or Protocol | User pays nothing extra                  |
| **USDC Gas**  | Gas converted to USDC, deducted from collateral | User (in USDC)        | User sees one currency                   |
| **FS Token**  | Gas converted to FS token                       | User (in FS token)    | Requires FS balance                      |
| **Relayer**   | User signs message, relayer submits transaction | Developer or Protocol | User never interacts with chain directly |

**Relayer Flow:**

```
User wants to buy position
    ↓
SDK constructs transaction
    ↓
User signs message (not transaction) - no gas needed
    ↓
SDK sends signed message to relayer
    ↓
Relayer validates, submits transaction, pays gas
    ↓
User's position is created
```

**Configuration:**

typescript

```typescript
const config = createConfig({
  gasStrategy: 'relayer',
  relayerUrl: 'https://relayer.functionspace.io',
  // or
  gasStrategy: 'sponsored',
  paymasterUrl: 'https://paymaster.example.com',
});
```

**What This Unlocks:**

* Users with only USDC can trade immediately
* No "you need ETH" error messages
* Simpler onboarding flow
* Web2-competitive UX
