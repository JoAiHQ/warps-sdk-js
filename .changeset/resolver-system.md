---
"@joai/warps": major
"@joai/warps-resolver-github": major
---

Add pluggable WarpResolver system for warp resolution from any source

- Add `WarpResolver` interface with `getByAlias` and `getByHash` methods
- Add `WarpChainResolver` (wraps existing chain adapters into WarpResolver)
- Add `WarpCompositeResolver` (chains multiple resolvers, returns first match)
- Add `@joai/warps-resolver-github` package for resolving warps from the GitHub catalog
- `WarpClient` accepts optional `resolver` in options, defaults to chain-based resolution
- `WarpRegistryInfo` fields `owner`, `createdAt`, `upgradedAt` are now nullable
