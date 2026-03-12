# @joai/warps-resolver-github

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
