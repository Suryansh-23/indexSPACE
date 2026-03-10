---
title: "Wallet Providers"
sidebar_position: 1
---

# Wallet Providers

The SDK accepts any standard EIP-1193 signer. We provide guides for popular wallet solutions.

**Pattern:** The SDK is wallet-agnostic. Your wallet provider returns a signer, you pass it to SDK functions.

```typescript
// From any wallet provider
const signer = await getSignerFromWalletProvider();

// Pass to SDK functions
await buy(marketId, belief, collateral, { signer });
```

**Available Guides:**

| Provider            | Use Case                                   | Description                  |
| ------------------- | ------------------------------------------ | ---------------------------- |
| **Privy**           | Embedded wallets, social login, email auth | Best for Web2 onboarding     |
| **RainbowKit**      | Multi-wallet modal, WalletConnect          | Best for crypto-native users |
| **Dynamic**         | Embedded wallets, enterprise features      | Best for B2B applications    |
| **MetaMask**        | Direct browser extension                   | Best for developers          |
| **Coinbase Wallet** | Coinbase ecosystem                         | Best for Coinbase users      |
| **Private Key**     | Bots, scripts, testing                     | Best for automated systems   |

**What This Unlocks:**

* Web2 users via email login (Privy/Dynamic)
* Mobile users via WalletConnect
* Institutional users via multi-sig
* Bot developers via private keys
* Future wallet solutions work automatically
