---
'@joai/warps-adapter-sui': minor
---

Remove on-chain registry from Sui adapter. Sui has no deployed on-chain registry, so the adapter now uses the fallback registry (e.g. GitHub resolver) like Solana and Near adapters. This eliminates noisy errors on devnet/mainnet and simplifies the codebase.
