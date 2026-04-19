---
"@joai/warps": minor
---

Add `file` input type and `crypto:sha256:fieldName` modifier.

- `WarpInputTypes.File` (`"file"`) — new type for document/binary uploads, serializes as a plain URL string
- `modifier: "crypto:sha256:<field>"` — computes a SHA-256 hex digest of the file at the referenced field's URL at execution time, using the Web Crypto API (works in both Node.js and browser)
- Removed `media` type — `file` supersedes it for document inputs
