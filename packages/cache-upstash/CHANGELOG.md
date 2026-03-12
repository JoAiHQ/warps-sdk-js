# @joai/warps-cache-upstash

## 0.2.1

### Patch Changes

- 27bfe43: Disable Upstash automatic deserialization in the cache adapter so cached JSON values are always parsed consistently by the SDK.

## 0.2.0

### Minor Changes

- 2ec1a65: Unify `WarpCache` on an async interface and add an optional Upstash cache adapter in a separate package.
  - make all `WarpCache` operations async and replace `forget` with `delete`
  - allow custom async cache adapters through `ClientCacheConfig.adapter`
  - add `@joai/warps-cache-upstash` with an optional Upstash adapter
  - update internal SDK cache usage and linked PWA consumers to await cache access

### Patch Changes

- Updated dependencies [2ec1a65]
  - @joai/warps@4.2.0
