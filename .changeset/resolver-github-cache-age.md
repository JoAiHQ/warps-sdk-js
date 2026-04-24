---
"@joai/warps-resolver-github": patch
---

Fix stale-manifest bug in `WarpGitHubResolver` and add `invalidate()`.

- **Cache-age respected on hydrate.** When the resolver hydrates its in-memory manifest from a pre-existing `WarpCache` entry, it now uses that entry's original `fetchedAt` timestamp — not `Date.now()` — as the instance's `lastFetchedAt`. Previously a second resolver instance reading an almost-expired cache entry would reset its own TTL window to "now", serving that manifest for another full `refreshInterval`. Worst case: staleness up to ~2× the configured interval (e.g. 10 minutes instead of 5).
- **Independent freshness check.** The resolver additionally validates that `Date.now() - fetchedAt < refreshInterval` before using a cache entry. Cache adapters with TTL longer than `refreshInterval` (custom adapters, mis-matched configs) no longer bypass the resolver's own staleness logic.
- **New `invalidate()` method.** Clears instance indexes and removes the `WarpCache` entry, so the next call re-fetches from GitHub. Enables manual cache-busting after catalog deploys and cleaner test isolation.
