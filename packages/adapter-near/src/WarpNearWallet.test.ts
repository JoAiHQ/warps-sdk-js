import { WarpChainName } from '@joai/warps'
import { WarpNearWallet } from './WarpNearWallet'

describe('WarpNearWallet', () => {
  const chain = {
    name: WarpChainName.Near,
    displayName: 'NEAR',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: 'https://example.com/near-logo.png',
    nativeToken: {
      chain: WarpChainName.Near,
      identifier: 'NEAR',
      symbol: 'NEAR',
      name: 'NEAR',
      decimals: 24,
      logoUrl: 'https://example.com/near-token.svg',
    },
  }

  describe('wallet object with null or undefined provider', () => {
    it('should use ReadOnlyWalletProvider when provider is null (no "Unsupported wallet provider" throw)', () => {
      const cfg = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [chain.name]: { address: 'test.near', provider: null },
          } as any,
        },
      }
      expect(() => new WarpNearWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })

    it('should use ReadOnlyWalletProvider when provider is undefined', () => {
      const cfg = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [chain.name]: { address: 'test.near', provider: undefined },
          } as any,
        },
      }
      expect(() => new WarpNearWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })
  })
})
