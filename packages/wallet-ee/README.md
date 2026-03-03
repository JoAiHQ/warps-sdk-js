# @joai/warps-wallet-ee

Execution Environment wallet provider for Warps SDK.

## Usage

```ts
import { createEeWalletProvider } from '@joai/warps-wallet-ee'

const eeProvider = createEeWalletProvider({
  baseUrl: process.env.EE_BASE_URL!,
  getAccessToken: async ({ walletId, chain, nonce }) => {
    // return short-lived signer JWT
    return '...'
  },
})
```
