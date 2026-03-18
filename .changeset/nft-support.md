---
"@joai/warps": minor
"@joai/warps-adapter-multiversx": minor
"@joai/warps-adapter-evm": minor
"@joai/warps-adapter-solana": minor
"@joai/warps-adapter-sui": minor
"@joai/warps-adapter-near": minor
---

Add NFT support via optional `getAccountNfts` on `AdapterWarpDataLoader`.

New types: `WarpChainAssetType` (`'fungible' | 'nft' | 'sft'`) and `WarpChainAssetNftMetadata` (collection, nonce, mediaUrl, thumbnailUrl, attributes, royalties, rank, creator). `WarpChainAsset` gains optional `type` and `nft` fields — fully backward compatible.

MultiversX fetches NFTs and SFTs from `accounts/{address}/nfts`, filters MetaESDT, and normalises IPFS URLs to HTTPS. `getAsset` now correctly resolves nonce-based identifiers via the `nfts/{identifier}` endpoint. EVM, Solana, Sui, and NEAR adapters implement the method; Solana detects NFTs from zero-decimal single-amount token accounts, Sui filters owned objects excluding coin types.
