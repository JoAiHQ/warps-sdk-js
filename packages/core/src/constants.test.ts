import { CLOUD_WALLET_PROVIDERS, WarpChainName } from './constants'
import { setWarpWalletInConfig } from './helpers/wallet'
import { WarpClientConfig, WarpWalletProvider } from './types'

describe('cloud providers', () => {
  it('includes ee provider in cloud providers', () => {
    expect(CLOUD_WALLET_PROVIDERS).toContain('ee')
  })

  it('accepts ee in wallet provider type usage', () => {
    const provider: WarpWalletProvider = 'ee'
    const config: WarpClientConfig = {
      env: 'devnet',
      user: { wallets: {} },
    }

    setWarpWalletInConfig(config, WarpChainName.Ethereum, {
      provider,
      address: '0x1234567890123456789012345678901234567890',
      externalId: 'wallet-1',
    })

    expect(config.user?.wallets?.[WarpChainName.Ethereum]).toMatchObject({
      provider: 'ee',
      externalId: 'wallet-1',
    })
  })
})
