---
title: "Introduction"
sidebar_position: 1
slug: /
---

# Introduction

### Welcome

Welcome to the functionSPACE SDK documentation. This SDK provides developers with the tools to build applications on the functionSPACE probability protocol. Enabling trading of full probability density functions (PDFs) on continuous variables.

This documentation covers:

* **Core SDK functions** for trading, querying, and generating beliefs
* **Integration patterns** for wallets, gas abstraction, and monetization
* **UI components** for rapid development
* **Reference materials** for comprehensive lookup

### What is functionSPACE?

functionSPACE is a decentralized probability protocol that transforms how we express and trade beliefs about future outcomes. Unlike traditional prediction markets that offer discrete Yes/No choices, functionSPACE enables:

* **Continuous probability markets** — Express nuanced beliefs as full probability distributions
* **Bernstein polynomial encoding** — Beliefs are mathematically represented as coefficient vectors
* **Participant-funded liquidity** — No external market makers; all liquidity comes from traders
* **Claim-based payouts** — Rewards based on both contribution timing and final accuracy

### Package Structure

The SDK is distributed as separate packages for different use cases:


| Package | Description |
| --- | --- |
| `@functionspace/core` | Vanilla TypeScript. Framework-agnostic. Works in browsers, Node.js, React Native, serverless. |
| `@functionspace/react` | React hooks wrapping core functions with state management and automatic refetching. |
| `@functionspace/ui` | Pre-built visualisation and input components. Composes React hooks internally. |


**@functionspace/core** exports pure functions and is the foundation for all other packages.

**@functionspace/react** is optional for React developers who want managed state. Use `useMarket(marketId)` instead of manually calling `queryMarketState()` and managing loading/error states.

**@functionspace/ui** is optional for developers who want pre-built components. Consensus distribution charts, belief input interfaces, position cards. These compose the React hooks internally.

---
