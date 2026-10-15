# @joai/warps

Core Warps SDK package providing the foundation for building and executing Warps across multiple blockchain networks.

## Installation

```bash
npm install @joai/warps
```

## Overview

The core package provides:

- **WarpClient** - Main client for interacting with Warps
- **WarpExecutor** - Executes Warp actions and transactions
- **WarpFactory** - Creates executable Warps from definitions
- **WarpBuilder** - Programmatic Warp creation
- **WarpSerializer** - Serializes/deserializes Warp data
- **Type definitions** - Complete TypeScript types for Warps

## Usage

```typescript
import { WarpClient } from '@joai/warps'
import { getAllEvmAdapters } from '@joai/warps-adapter-evm'
import { MultiversxAdapter } from '@joai/warps-adapter-multiversx'

const config = {
  env: 'mainnet',
  user: {
    wallets: {
      ethereum: {
        provider: 'privatekey',
        privateKey: '0x...',
      },
    },
  },
}

const client = new WarpClient(config, {
  chains: getAllEvmAdapters(MultiversxAdapter),
})

// Execute a Warp
const result = await client.execute(warp, inputs)
```

## Key Features

- Multi-chain support via adapters
- Type-safe Warp definitions
- Transaction execution and signing
- Output transformation and evaluation
- Caching and performance optimization
- Link detection and parsing

## Documentation

For detailed API documentation, visit [docs.vleap.at](https://docs.vleap.at).
