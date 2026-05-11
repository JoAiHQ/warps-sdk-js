---
"@joai/warps": patch
---

fix: prevent double-JSON-stringify of array values in nativeToString — when a string[] input receives a JSON-encoded array string from query params, parse it before re-encoding so the request body gets a proper array instead of a doubly-escaped string
