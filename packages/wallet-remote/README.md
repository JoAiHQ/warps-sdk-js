# @joai/warps-wallet-remote

Generic remote wallet provider package for Warps SDK.

This package is intentionally backend-agnostic. It supports any remote signer service by configuration.

## Installation

```bash
npm install @joai/warps-wallet-remote
```

## Usage

```ts
import { WarpClient, WarpChainName } from '@joai/warps'
import { createRemoteWalletProvider } from '@joai/warps-wallet-remote'

const providerKey = 'myRemoteSigner'

const client = new WarpClient({
  env: 'devnet',
  user: {
    id: 'agent-1',
    wallets: {
      [WarpChainName.Ethereum]: {
        provider: providerKey,
        address: '0x...',
        externalId: 'wallet-1',
      },
    },
  },
  walletProviders: {
    [WarpChainName.Ethereum]: {
      [providerKey]: createRemoteWalletProvider(
        {
          baseUrl: 'https://signer.example',
          providerName: providerKey,
          serviceToken: process.env.SIGNER_SERVICE_TOKEN,
          getAccessToken: async ({ walletId, chain, nonce }) => {
            return await issueSignerToken({ walletId, chain, nonce })
          },
        },
        providerKey
      ),
    },
  },
})
```

Register the provider under the same key you store on the wallet config.
If you use a custom provider key, pass it as `providerName` or the helper fallback so generated/imported wallets persist the correct provider.

## Default Endpoints

- `POST /v1/wallets/generate`
- `POST /v1/wallets/import`
- `POST /v1/wallets/export`
- `POST /v1/sign/transaction`
- `POST /v1/sign/message`

Override with `endpoints` when your signer API differs.

## Advanced Customization

- `headers`: static request headers
- `getHeaders(context)`: per-operation dynamic headers
- `transformPayload(context, payload)`: mutate payloads before sending

These hooks allow integrating heterogeneous signer APIs without modifying SDK internals.

## Security Defaults

- HTTPS required by default (`allowInsecureHttp` only for explicit local/dev use)
- Relative endpoint paths only (prevents endpoint host override/SSRF)
- Strict token validation (non-empty service/access token)
- Request timeout (default `15000ms`)
