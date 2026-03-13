---
"@joai/warps": minor
---

Add `doesWarpRequireWallet` helper that returns `{ required: boolean, chain: WarpChainName | null }`.

Returns `required: true` for warps that need a wallet — either for signing (`transfer`/`contract` action types) or for resolving the user's address (`source: 'user:wallet'` inputs, or inputs with `{{USER_WALLET}}`/`{{USER_WALLET_PUBLICKEY}}` defaults).
