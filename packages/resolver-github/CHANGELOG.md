# @joai/warps-resolver-github

## 2.0.3

### Patch Changes

- 8cb465d: Fix stale-manifest bug in `WarpGitHubResolver` and add `invalidate()`.
  - **Cache-age respected on hydrate.** When the resolver hydrates its in-memory manifest from a pre-existing `WarpCache` entry, it now uses that entry's original `fetchedAt` timestamp — not `Date.now()` — as the instance's `lastFetchedAt`. Previously a second resolver instance reading an almost-expired cache entry would reset its own TTL window to "now", serving that manifest for another full `refreshInterval`. Worst case: staleness up to ~2× the configured interval (e.g. 10 minutes instead of 5).
  - **Independent freshness check.** The resolver additionally validates that `Date.now() - fetchedAt < refreshInterval` before using a cache entry. Cache adapters with TTL longer than `refreshInterval` (custom adapters, mis-matched configs) no longer bypass the resolver's own staleness logic.
  - **New `invalidate()` method.** Clears instance indexes and removes the `WarpCache` entry, so the next call re-fetches from GitHub. Enables manual cache-busting after catalog deploys and cleaner test isolation.

- Updated dependencies [3da6760]
  - @joai/warps@4.24.0

## 2.0.2

### Patch Changes

- 5dd8e77: Resolve manifest from the correct branch based on env: devnet → dev, testnet → test, mainnet → main

## 2.0.1

### Patch Changes

- e481582: Allow resolving aliases with a @ prefix in WarpGitHubResolver.

## 2.0.0

### Major Changes

- 9ed23b2: Add pluggable WarpResolver system for warp resolution from any source
  - Add `WarpResolver` interface with `getByAlias` and `getByHash` methods
  - Add `WarpChainResolver` (wraps existing chain adapters into WarpResolver)
  - Add `WarpCompositeResolver` (chains multiple resolvers, returns first match)
  - Add `@joai/warps-resolver-github` package for resolving warps from the GitHub catalog
  - `WarpClient` accepts optional `resolver` in options, defaults to chain-based resolution
  - `WarpRegistryInfo` fields `owner`, `createdAt`, `upgradedAt` are now nullable

### Patch Changes

- Updated dependencies [9ed23b2]
  - @joai/warps@4.0.0
