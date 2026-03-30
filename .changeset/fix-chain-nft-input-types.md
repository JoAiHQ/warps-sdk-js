---
"@joai/warps": patch
---

Handle `chain` and `nft` as UI-only input types in the serializer. These types are used in warp input definitions for rendering chain selectors and NFT pickers in clients, but serialize as plain strings when executed programmatically (e.g. via MCP tools).
