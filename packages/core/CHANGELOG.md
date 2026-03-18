# @joai/warps

## 4.9.0

### Minor Changes

- 3d28626: Add Tempo (Stripe L1) to WarpChainName enum and EvmWalletChainNames

### Patch Changes

- 0817308: Add WarpAssets helper for constructing JoAi asset URLs (chainLogo, tokenLogo, walletLogo)

## 4.8.4

### Patch Changes

- 537139c: Resolve destination from inputs in prompt actions, matching collect and mcp behavior

## 4.8.3

### Patch Changes

- e128375: Fix themed logo resolution falling back to first available URL when requested theme key is missing

## 4.8.2

### Patch Changes

- 28fbdf8: Fix detectWarp crashing on warps with no matching chain adapter (e.g. MCP warps with chain "none"). Skip interpolation instead of throwing.

## 4.8.1

### Patch Changes

- 00405f1: fix: when conditions now resolve meta.envs placeholders (e.g. state.active)

## 4.8.0

### Minor Changes

- eec1f92: Add `applyEnvs()` to `WarpInterpolator` for runtime env injection.

  `WarpInterpolator.apply()` now accepts `meta.envs` and applies them as a final JSON-safe substitution pass over the entire warp — replacing any `{{KEY}}` placeholders not handled by `applyVars`. This covers runtime-injected values such as `JOAI_MESSAGE_TEXT`, `state.KEY`, and other cortex-side injectables that were previously not reaching compute action modifiers and `when` conditions.

  Keys are regex-escaped so dotted keys like `state.secret` match literally. Values are JSON-safe encoded to prevent broken JSON during the round-trip.

## 4.7.0

### Minor Changes

- 1f0dcdd: Add `compute` action type for local-only transform execution.
  - New `WarpComputeAction` type and `'compute'` added to `WarpActionType`
  - `compute` is detectable as a primary action alongside `collect`, `query`, etc.
  - `WarpExecutor` executes `compute` like `collect` but always returns `success` — never `unhandled`, never calls a backend
  - `state`, `mount`, and `unmount` actions now skip gracefully in the SDK executor (host-managed types)
  - `WarpFactory` destination check updated to allow `compute`, `state`, `mount`, `unmount` without a receiver

## 4.6.0

### Minor Changes

- 86dc49d: Add `getRequiredAssetIds` and `checkWarpAssetBalance` helpers for pre-flight wallet balance checks.

  `getRequiredAssetIds(warp, chainInfo)` returns the asset identifiers a warp's primary action requires the wallet to hold. Gates on contract/transfer action types and inspects input positions (`value`, `transfer`) and the `asset` input type.

  `checkWarpAssetBalance(warp, address, chain, adapters)` verifies the wallet holds all required assets before execution. Returns false if any required asset has zero balance, true if no assets are needed or on network error (non-fatal).

- 23c79c0: Add warp mini-app primitives: `WarpStateAction`, `WarpMountAction`, `WarpUnmountAction`, and `WarpTrigger` types.

  These enable stateful mini-apps (games, polls, quizzes) to be expressed as warps:
  - `state` action: read/write/clear room-scoped key-value state
  - `mount`/`unmount` actions: activate/deactivate message trigger listeners per room
  - `trigger` field on `Warp`: declares the message pattern a warp listens for when mounted

## 4.5.1

### Patch Changes

- 3041233: Interpolate input values into success message templates for unhandled collect warps

## 4.5.0

### Minor Changes

- bfae938: Add `doesWarpRequireWallet` helper that returns `{ required: boolean, chain: WarpChainName | null }`.

  Returns `required: true` for warps that need a wallet — either for signing (`transfer`/`contract` action types) or for resolving the user's address (`source: 'user:wallet'` inputs, or inputs with `{{USER_WALLET}}`/`{{USER_WALLET_PUBLICKEY}}` defaults).

## 4.4.0

### Minor Changes

- 34dabea: Add `brandSlug`, `brandName`, and `brandLogo` fields to `WarpSearchHit` so consumers can display brand identity directly from search results without an extra fetch.

## 4.3.1

### Patch Changes

- 0887c7c: Stop rewriting alias identifiers into chain-qualified `@chain:alias` form when resolving registry warps.

  Alias identifiers now stay chainless, while hash identifiers continue to require an explicit chain.

## 4.3.0

### Minor Changes

- 1f9c145: Add wallet `delete` method to `WalletProvider` and `AdapterWarpWallet` interfaces.
  - `WalletProvider.delete(externalId)` — deletes a wallet by its external ID
  - `AdapterWarpWallet.delete(provider, externalId)` — delegates to the correct provider
  - `RemoteWalletProvider` sends a `POST` to the configured delete endpoint (default `/v1/wallets/delete`)
  - Local providers (Mnemonic, PrivateKey, ReadOnly) remove the wallet from the client config
  - Cloud providers (Gaupa, Privy, Coinbase) throw "not supported" as they manage wallets externally
  - Added `removeWarpWalletFromConfig` helper to core

## 4.2.0

### Minor Changes

- 2ec1a65: Unify `WarpCache` on an async interface and add an optional Upstash cache adapter in a separate package.
  - make all `WarpCache` operations async and replace `forget` with `delete`
  - allow custom async cache adapters through `ClientCacheConfig.adapter`
  - add `@joai/warps-cache-upstash` with an optional Upstash adapter
  - update internal SDK cache usage and linked PWA consumers to await cache access

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
