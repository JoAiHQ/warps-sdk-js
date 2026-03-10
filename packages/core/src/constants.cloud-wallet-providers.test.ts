import { CLOUD_WALLET_PROVIDERS } from './constants'
import { WarpWalletProvider } from './types/config'

describe('CLOUD_WALLET_PROVIDERS', () => {
  it('keeps the built-in cloud provider list limited to the built-in SDK providers', () => {
    const providers: WarpWalletProvider[] = CLOUD_WALLET_PROVIDERS

    expect(providers).toEqual(['coinbase', 'privy', 'gaupa'])
    expect(providers).not.toContain('remote')
    expect(providers).not.toContain('ee')
  })
})
