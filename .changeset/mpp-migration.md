---
"@joai/warps": minor
"@joai/warps-adapter-evm": minor
"@joai/warps-adapter-solana": patch
---

Replace x402 with MPP (Machine Payments Protocol) using the official mppx SDK.

- `@joai/warps`: HTTP collect actions now use `mppx/client` to auto-handle 402 Payment Required responses. The new `getMppFetch()` helper returns an mppx-powered fetch that transparently pays and retries on 402, replacing manual challenge/retry logic. Removed `x402` helpers.
- `@joai/warps-adapter-evm`: Replaced `registerX402Handlers` with `getMppAccount()` returning a viem Account for mppx client signing on the Tempo chain.
- `@joai/warps-adapter-solana`: Removed x402 Solana handlers (`registerX402SvmHandlers`) — MPP is EVM/Tempo only.
