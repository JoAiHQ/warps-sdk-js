---
"@joai/warps": patch
---

Fix chainless alias identifiers (e.g. `@alias`) in `next` warp chaining. `WarpLinkBuilder.buildFromPrefixedIdentifier` now handles identifiers with no chain prefix, building the URL directly from the client config without requiring a chain adapter.
