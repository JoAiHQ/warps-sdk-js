# @joai/warps

## 4.1.0

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

## 4.0.0

### Major Changes

- 9ed23b2: Add pluggable WarpResolver system for warp resolution from any source
  - Add `WarpResolver` interface with `getByAlias` and `getByHash` methods
  - Add `WarpChainResolver` (wraps existing chain adapters into WarpResolver)
  - Add `WarpCompositeResolver` (chains multiple resolvers, returns first match)
  - Add `@joai/warps-resolver-github` package for resolving warps from the GitHub catalog
  - `WarpClient` accepts optional `resolver` in options, defaults to chain-based resolution
  - `WarpRegistryInfo` fields `owner`, `createdAt`, `upgradedAt` are now nullable

## 3.5.0

### Minor Changes

- 9251911: Add platform support for cross-platform CLI warps
  - Add `WarpPlatformName` enum (`macos`, `linux`, `windows`) and `WarpPlatforms` array to core constants
  - Add `WarpPlatformValue<T>` generic type for platform-keyed values
  - Add `platform?: WarpPlatformName` to `WarpClientConfig`
  - Add `resolvePlatformValue()` and `isPlatformValue()` helpers
  - Update `WarpPromptAction.prompt` type to `WarpPlatformValue<string>` (backwards compatible — plain strings still work)
  - `WarpExecutor` resolves platform-specific prompt values before interpolation
  - Update JSON schema to support platform-keyed prompt definitions

## 3.4.1

### Patch Changes

- 1fb5758: Share transform input context construction in core helpers and expose resolved inputs (`inputs`) to output transform context.

## 3.4.0

### Minor Changes

- f7aabdf: Add `getWarpIdentifierWithQuery` helper that reconstructs a full identifier string (with query parameters) from a Warp's meta fields.

## 3.3.2

### Patch Changes

- eb9a009: fix: preserve falsy values (0, false, empty string) in placeholder interpolation

## 3.3.1

### Patch Changes

- 1a08d01: feat: add CLOUD_WALLET_PROVIDERS constant

## 3.3.0

### Minor Changes

- Add source identifier utilities for warps generated from external sources (ABI, OpenAPI).
