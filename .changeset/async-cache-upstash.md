---
'@joai/warps': minor
'@joai/warps-cache-upstash': minor
---

Unify `WarpCache` on an async interface and add an optional Upstash cache adapter in a separate package.

- make all `WarpCache` operations async and replace `forget` with `delete`
- allow custom async cache adapters through `ClientCacheConfig.adapter`
- add `@joai/warps-cache-upstash` with an optional Upstash adapter
- update internal SDK cache usage and linked PWA consumers to await cache access
