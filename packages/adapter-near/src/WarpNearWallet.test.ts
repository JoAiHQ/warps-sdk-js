import { WarpChainName } from '@joai/warps'
import { WarpNearWallet } from './WarpNearWallet'

describe('WarpNearWallet', () => {
  const customProviderName = 'remoteSigner'
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

  const createRemoteConfig = (remoteSigner: Record<string, unknown>) => ({
    env: 'testnet' as const,
    user: {
      wallets: {
        [chain.name]: { address: 'test.near', provider: customProviderName, externalId: 'wallet-near-1' },
      } as any,
    },
    walletProviders: {
      [chain.name]: {
        [customProviderName]: () => remoteSigner as any,
      },
    },
  })

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

  describe('custom wallet provider', () => {
    it('uses custom provider for remote signing and returns transaction hash', async () => {
      const remoteSigner = {
        getAddress: jest.fn(async () => 'test.near'),
        getPublicKey: jest.fn(async () => null),
        signTransaction: jest.fn(async (tx: any) => ({ ...tx, transactionHash: 'remote-hash' })),
        signMessage: jest.fn(async () => 'signature'),
        importFromMnemonic: jest.fn(),
        importFromPrivateKey: jest.fn(),
        export: jest.fn(),
        generate: jest.fn(),
      }

      const wallet = new WarpNearWallet(createRemoteConfig(remoteSigner) as any, chain)
      const signed = await wallet.signTransaction({ receiverId: 'alice.near', actions: [] })

      expect(remoteSigner.signTransaction).toHaveBeenCalledTimes(1)
      expect((signed as any).transactionHash).toBe('remote-hash')
      await expect(wallet.sendTransaction(signed)).resolves.toBe('remote-hash')
    })

    it('rejects sending unsigned near transactions for remote providers', async () => {
      const remoteSigner = {
        getAddress: jest.fn(async () => 'test.near'),
        getPublicKey: jest.fn(async () => null),
        signTransaction: jest.fn(async (tx: any) => tx),
        signMessage: jest.fn(async () => 'signature'),
        importFromMnemonic: jest.fn(),
        importFromPrivateKey: jest.fn(),
        export: jest.fn(),
        generate: jest.fn(),
      }

      const wallet = new WarpNearWallet(createRemoteConfig(remoteSigner) as any, chain)
      await expect(wallet.sendTransaction({ receiverId: 'alice.near', actions: [] })).rejects.toThrow(
        'Remote wallet provider must return transactionHash for NEAR transactions'
      )
    })

    it('delegates signMessage and signTransactions to the custom provider', async () => {
      const remoteSigner = {
        getAddress: jest.fn(async () => 'test.near'),
        getPublicKey: jest.fn(async () => null),
        signTransaction: jest.fn(async (tx: any) => ({ ...tx, transactionHash: `hash-${tx.receiverId}` })),
        signMessage: jest.fn(async () => 'signed-message'),
        importFromMnemonic: jest.fn(),
        importFromPrivateKey: jest.fn(),
        export: jest.fn(),
        generate: jest.fn(),
      }

      const wallet = new WarpNearWallet(createRemoteConfig(remoteSigner) as any, chain)

      await expect(wallet.signMessage('hello')).resolves.toBe('signed-message')
      await expect(
        wallet.signTransactions([
          { receiverId: 'alice.near', actions: [] },
          { receiverId: 'bob.near', actions: [] },
        ] as any)
      ).resolves.toMatchObject([{ transactionHash: 'hash-alice.near' }, { transactionHash: 'hash-bob.near' }])

      expect(remoteSigner.signMessage).toHaveBeenCalledWith('hello')
      expect(remoteSigner.signTransaction).toHaveBeenCalledTimes(2)
    })

    it('uses the custom provider for generate and export operations', async () => {
      const remoteSigner = {
        getAddress: jest.fn(async () => 'test.near'),
        getPublicKey: jest.fn(async () => null),
        signTransaction: jest.fn(),
        signMessage: jest.fn(),
        export: jest.fn(async () => ({ provider: customProviderName, address: 'test.near', privateKey: 'ed25519:secret' })),
        generate: jest.fn(async () => ({ provider: customProviderName, address: 'test.near', externalId: 'wallet-near-1' })),
      }

      const wallet = new WarpNearWallet(createRemoteConfig(remoteSigner) as any, chain)

      await expect(wallet.export(customProviderName)).resolves.toMatchObject({ privateKey: 'ed25519:secret' })
      await expect(wallet.generate(customProviderName)).resolves.toMatchObject({ externalId: 'wallet-near-1' })

      expect(remoteSigner.export).toHaveBeenCalledTimes(1)
      expect(remoteSigner.generate).toHaveBeenCalledTimes(1)
    })
  })
})
