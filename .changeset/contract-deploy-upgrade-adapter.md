---
"@joai/warps": minor
"@joai/warps-adapter-multiversx": minor
---

Add contract deploy and upgrade support to executor interface and MultiversX adapter

Introduces `ContractFlags`, `ContractDeployParams`, `ContractUpgradeParams` to the core `AdapterWarpExecutor` interface, and implements `createDeployTransaction` / `createUpgradeTransaction` in `WarpMultiversxExecutor` with automatic nonce fetching.
