---
'@joai/warps': minor
'@joai/warps-wallet-ee': minor
'@joai/warps-adapter-near': patch
'@joai/warps-adapter-sui': patch
'@joai/warps-adapter-evm': patch
'@joai/warps-adapter-multiversx': patch
'@joai/warps-adapter-solana': patch
'@joai/warps-mcp': patch
'@joai/warps-openapi': patch
'@joai/warps-react': patch
'@warps/playground': patch
---

Add first-class `ee` cloud wallet provider support across the SDK:

- Extend core wallet provider types and cloud provider constants with `ee`.
- Introduce new `@joai/warps-wallet-ee` package with a generic `CustomCloudWalletProvider` abstraction plus `ee` preset, with generate/import/export/sign support against remote signer APIs.
- Update NEAR and Sui adapters to support non-local custom providers for remote-signing flows.
- Allow adapters to short-circuit send when a provider already returns a transaction hash.
