# @joai/warps-wallet-remote

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
