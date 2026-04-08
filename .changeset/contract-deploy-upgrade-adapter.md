---
"@joai/warps": minor
"@joai/warps-adapter-multiversx": minor
"@joai/warps-adapter-near": patch
"@joai/warps-adapter-solana": patch
"@joai/warps-adapter-sui": patch
"@joai/warps-adapter-evm": patch
"@joai/warps-adapter-fastset": patch
---

Add contract deploy/upgrade to executor interface

Introduces ContractFlags, ContractDeployParams, ContractUpgradeParams to
AdapterWarpExecutor. WarpMultiversxExecutor implements createDeployTransaction
and createUpgradeTransaction with nonce fetching and chain-agnostic flags.
All other adapters implement the interface with unsupported stubs.
