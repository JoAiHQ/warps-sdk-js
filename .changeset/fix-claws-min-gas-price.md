---
"@joai/warps": patch
"@joai/warps-adapter-multiversx": patch
---

Add optional `minGasPrice` to `WarpChainInfo` and apply it to transactions after creation. Fixes "insufficient gas price" error on Claws sovereign chain which requires a gas price of 20000000000000 vs the MultiversX default of 1000000000.
