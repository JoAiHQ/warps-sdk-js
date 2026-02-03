# @joai/warps-adapter-multiversx

MultiversX (formerly Elrond) blockchain adapter for the Warps SDK. Enables Warp execution on MultiversX mainnet and testnet.

## Installation

```bash
npm install @joai/warps-adapter-multiversx
```

## Usage

```typescript
import { WarpClient } from '@joai/warps'
import { getAllMultiversxAdapters } from '@joai/warps-adapter-multiversx'

// Use all MultiversX networks (includes MultiversX and Claws)
const client = new WarpClient(config, {
  chains: getAllMultiversxAdapters(),
})
```

## Individual Chain Adapters

You can also import individual chain adapters:

```typescript
import { MultiversxAdapter, ClawsAdapter } from '@joai/warps-adapter-multiversx'

const client = new WarpClient(config, {
  chains: [MultiversxAdapter],
})
```

## Supported Networks

- **MultiversX Mainnet**
- **MultiversX Testnet**

## Features

- Transaction creation and execution
- Smart contract interaction
- EGLD and ESDT token transfers
- Query contract state
- Transaction signing and broadcasting
- Explorer integration
- ABI and brand builders

## Wallet Providers

Supports multiple wallet providers:
- Private key
- Mnemonic
- Read-only (for queries)
