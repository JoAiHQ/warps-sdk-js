---
"@joai/warps": minor
"@joai/warps-wallet-remote": minor
"@joai/warps-wallet-gaupa": minor
"@joai/warps-wallet-privy": minor
"@joai/warps-wallet-coinbase": minor
"@joai/warps-adapter-multiversx": minor
"@joai/warps-adapter-evm": minor
"@joai/warps-adapter-solana": minor
"@joai/warps-adapter-fastset": minor
"@joai/warps-adapter-near": minor
"@joai/warps-adapter-sui": minor
---

Add wallet `delete` method to `WalletProvider` and `AdapterWarpWallet` interfaces.

- `WalletProvider.delete(externalId)` — deletes a wallet by its external ID
- `AdapterWarpWallet.delete(provider, externalId)` — delegates to the correct provider
- `RemoteWalletProvider` sends a `POST` to the configured delete endpoint (default `/v1/wallets/delete`)
- Local providers (Mnemonic, PrivateKey, ReadOnly) remove the wallet from the client config
- Cloud providers (Gaupa, Privy, Coinbase) throw "not supported" as they manage wallets externally
- Added `removeWarpWalletFromConfig` helper to core
