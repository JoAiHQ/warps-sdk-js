# 🧰 Warp Protocol SDK for Typescript

[![npm (scoped)](https://img.shields.io/npm/v/@joai/warps?style=for-the-badge)](https://www.npmjs.com/package/@joai/warps)
[![](https://img.shields.io/twitter/follow/JoAiAgents?color=%23555555&label=Follow%20JoAiHQ&logo=twitter&style=for-the-badge)](https://x.com/JoAiAgents)

Warps are executable actions that enable cross-chain transactions, smart contract interactions, blockchain operations, off-chain API calls, and AI tool integrations through a standardized JSON format. This SDK provides TypeScript tools to create, execute, and manage Warps across multiple blockchain networks.

## Documentation

For detailed documentation, including setup guides, API descriptions, and usage examples, please visit the [docs](https://docs.joai.ai).

## Installation

To integrate the Warps JavaScript SDK into your project, run the following command:

```bash
npm install @joai/warps
```

## Packages

This monorepo contains the following packages:

### Core

- [`core`](./packages/core) - Core Warps SDK functionality

### Adapters

- [`adapter-evm`](./packages/adapter-evm) - EVM chain adapter
- [`adapter-solana`](./packages/adapter-solana) - Solana adapter
- [`adapter-sui`](./packages/adapter-sui) - Sui adapter
- [`adapter-near`](./packages/adapter-near) - NEAR adapter
- [`adapter-multiversx`](./packages/adapter-multiversx) - MultiversX adapter
- [`adapter-fastset`](./packages/adapter-fastset) - Fastset adapter

### Wallets

- [`wallet-coinbase`](./packages/wallet-coinbase) - Coinbase wallet integration
- [`wallet-gaupa`](./packages/wallet-gaupa) - Gaupa wallet integration
- [`wallet-privy`](./packages/wallet-privy) - Privy wallet integration

### Utilities

- [`mcp`](./packages/mcp) - MCP (Model Context Protocol) integration
- [`vm-browser`](./packages/vm-browser) - Browser VM runtime for output transformations
- [`vm-node`](./packages/vm-node) - Node.js VM runtime for output transformations
- [`playground`](./packages/playground) - Development playground

## Warp Action Types

Warps support the following action types:

- **`transfer`** - Transfer tokens or native currency to an address
- **`contract`** - Execute a smart contract function with optional value and gas limit
- **`query`** - Query contract state (read-only, no transaction)
- **`collect`** - Collect data via HTTP requests to external endpoints
- **`link`** - Navigate to a URL
- **`mcp`** - Execute MCP (Model Context Protocol) tools
- **`prompt`** - Display a prompt to the user for input

## License

This project is released under the MIT License. See the [LICENSE](LICENSE) file for more details.
