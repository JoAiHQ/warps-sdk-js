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

  it('delegates signTransaction to custom non-local provider', async () => {
    const signTransaction = jest.fn().mockResolvedValue({ transactionHash: 'near-tx-hash' })
    const cfg = {
      env: 'testnet' as const,
      user: {
        wallets: {
          [chain.name]: {
            address: 'test.near',
            provider: 'ee',
            externalId: 'wallet-1',
          },
        },
      },
      walletProviders: {
        [chain.name]: {
          ee: () => ({
            getAddress: async () => 'test.near',
            getPublicKey: async () => null,
            signTransaction,
            signMessage: async () => 'sig',
            importFromMnemonic: async () => ({ provider: 'ee', address: 'test.near' }),
            importFromPrivateKey: async () => ({ provider: 'ee', address: 'test.near' }),
            export: async () => ({ provider: 'ee', address: 'test.near' }),
            generate: async () => ({ provider: 'ee', address: 'test.near' }),
          }),
        },
      },
    }

    const wallet = new WarpNearWallet(cfg as any, chain as any)
    ;(wallet as any).cachedAddress = 'test.near'
    const tx = { receiverId: 'receiver.near', actions: [] }
    const signed = await wallet.signTransaction(tx as any)

    expect(signTransaction).toHaveBeenCalledWith(tx)
    expect(signed).toEqual({ transactionHash: 'near-tx-hash' })
  })
})
