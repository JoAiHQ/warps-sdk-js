# @joai/warps-wallet-remote

## 1.2.0

### Minor Changes

- 1f9c145: Add wallet `delete` method to `WalletProvider` and `AdapterWarpWallet` interfaces.
  - `WalletProvider.delete(externalId)` — deletes a wallet by its external ID
  - `AdapterWarpWallet.delete(provider, externalId)` — delegates to the correct provider
  - `RemoteWalletProvider` sends a `POST` to the configured delete endpoint (default `/v1/wallets/delete`)
  - Local providers (Mnemonic, PrivateKey, ReadOnly) remove the wallet from the client config
  - Cloud providers (Gaupa, Privy, Coinbase) throw "not supported" as they manage wallets externally
  - Added `removeWarpWalletFromConfig` helper to core

### Patch Changes

- Updated dependencies [1f9c145]
  - @joai/warps@4.3.0

## 1.1.0

### Minor Changes

- 3bea31e: Generalize custom wallet-provider support in the SDK and centralize remote signer integration behind backend-agnostic APIs.
  - Open `WarpWalletProvider` typing to support custom provider keys in SDK consumers.
  - Keep `CLOUD_WALLET_PROVIDERS` limited to built-in cloud providers.
  - Add new `@joai/warps-wallet-remote` package with:
    - `RemoteWalletProvider`
    - `createRemoteWalletProvider`
    - hardened endpoint validation and token validation
    - safe transaction payload handling for remote signer APIs (including bigint serialization)
    - extensibility hooks: `headers`, `getHeaders`, and `transformPayload`
  - Update NEAR and Sui adapters to support remote custom provider signing/send flows without local private-key assumptions.
  - Add regression tests for `wallet-remote`, `adapter-near`, and `adapter-sui` remote provider paths.

### Patch Changes

- Updated dependencies [3bea31e]
  - @joai/warps@4.1.0

## 1.0.0

- Initial release.
