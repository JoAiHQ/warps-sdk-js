import { WarpChainInfo, WarpChainName } from '@joai/warps'
import { WarpSuiWallet } from './WarpSuiWallet'

describe('WarpSuiWallet', () => {
  const customProviderName = 'remoteSigner'
  let wallet: WarpSuiWallet
  let config: any
  let chain: WarpChainInfo

  beforeEach(() => {
    chain = {
      name: WarpChainName.Sui,
      displayName: 'Sui',
      chainId: 'testnet',
      blockTime: 3000,
      addressHrp: '0x',
      defaultApiUrl: 'https://fullnode.testnet.sui.io',
      logoUrl: '',
      nativeToken: { chain: WarpChainName.Sui, identifier: 'SUI', name: 'Sui', symbol: 'SUI', decimals: 9, logoUrl: '' },
    }
    // Use a valid 32-byte hex private key for Ed25519
    config = {
      env: 'testnet',
      user: {
        wallets: {
          [chain.name]: {
            provider: 'privateKey',
            privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          },
        },
      },
    }
    wallet = new WarpSuiWallet(config, chain)

    // Mock the client methods to avoid real network calls
    wallet['client'] = {
      signAndExecuteTransaction: jest.fn().mockResolvedValue({ digest: 'mock-digest' }),
      executeTransactionBlock: jest.fn().mockResolvedValue({ digest: 'mock-digest' }),
    } as any
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })
  })

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const tx = {
        kind: 'ProgrammableTransaction',
        inputs: [],
        transactions: [],
      }

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBeDefined()
      expect(typeof signedTx.signature).toBe('string')
      expect(signedTx.signature.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('sendTransaction', () => {
    it('should send a transaction successfully', async () => {
      const tx = {
        kind: 'ProgrammableTransaction',
        inputs: [],
        transactions: [],
        bytes: new Uint8Array([1, 2, 3]),
        signature: 'mock-signature',
      }

      const digest = await wallet.sendTransaction(tx)
      expect(digest).toBe('mock-digest')
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('getPublicKey', () => {
    it('should return public key as hex string when wallet is initialized', () => {
      const publicKey = wallet.getPublicKey()
      expect(publicKey).toBeDefined()
      expect(typeof publicKey).toBe('string')
      expect(publicKey).toMatch(/^[0-9a-f]+$/)
      expect(publicKey!.length).toBeGreaterThan(0)
    })

    it('should return null when wallet is not initialized', () => {
      const walletWithoutConfig = new WarpSuiWallet(
        {
          env: 'testnet' as const,
          user: {
            wallets: {},
          },
        },
        chain
      )
      const publicKey = walletWithoutConfig.getPublicKey()
      expect(publicKey).toBeNull()
    })
  })

  describe('generate', () => {
    it('should generate a new wallet with mnemonic', async () => {
      const result = await wallet.generate('mnemonic')
      expect(result).toBeDefined()
      expect(result.address).toBeDefined()
      expect(result.mnemonic).not.toBeNull()
      expect(result.provider).toBe('mnemonic')
    })

    it('should generate 24-word mnemonic', async () => {
      const result = await wallet.generate('mnemonic')
      expect(result.mnemonic).not.toBeNull()
      if (result.mnemonic) {
        const words = result.mnemonic.split(' ')
        expect(words.length).toBe(24)
      }
    })
  })

  describe('wallet object with null or undefined provider', () => {
    it('should use ReadOnlyWalletProvider when provider is null (no "Unsupported wallet provider" throw)', () => {
      const cfg = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [chain.name]: { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', provider: null },
          } as any,
        },
      }
      expect(() => new WarpSuiWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })

    it('should use ReadOnlyWalletProvider when provider is undefined', () => {
      const cfg = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [chain.name]: { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', provider: undefined },
          } as any,
        },
      }
      expect(() => new WarpSuiWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })
  })

  describe('custom wallet provider', () => {
    it('uses custom provider for transaction objects with sign method', async () => {
      const remoteSigner = {
        getAddress: jest.fn(async () => '0x123'),
        getPublicKey: jest.fn(async () => null),
        signTransaction: jest.fn(async (tx: any) => ({ ...tx, bytes: 'AQID', signature: 'remote-signature' })),
        signMessage: jest.fn(async () => 'signature'),
        importFromMnemonic: jest.fn(),
        importFromPrivateKey: jest.fn(),
        export: jest.fn(),
        generate: jest.fn(),
      }

      const remoteWallet = new WarpSuiWallet(
        {
          env: 'testnet',
          user: {
            wallets: {
              [chain.name]: {
                provider: customProviderName,
                address: '0x123',
                externalId: 'wallet-sui-1',
              },
            },
          },
          walletProviders: {
            [chain.name]: {
              [customProviderName]: () => remoteSigner as any,
            },
          },
        } as any,
        chain
      )
      remoteWallet['client'] = {
        signAndExecuteTransaction: jest.fn().mockResolvedValue({ digest: 'mock-digest' }),
        executeTransactionBlock: jest.fn().mockResolvedValue({ digest: 'mock-digest' }),
      } as any

      const txWithSignMethod = { sign: jest.fn() }
      const signed = await remoteWallet.signTransaction(txWithSignMethod as any)

      expect(remoteSigner.signTransaction).toHaveBeenCalledWith(txWithSignMethod)
      expect((signed as any).signature).toBe('remote-signature')
    })

    it('returns remote transactionHash directly', async () => {
      const remoteWallet = new WarpSuiWallet(
        {
          env: 'testnet',
          user: {
            wallets: {
              [chain.name]: {
                provider: customProviderName,
                address: '0x123',
                externalId: 'wallet-sui-1',
              },
            },
          },
          walletProviders: {
            [chain.name]: {
              [customProviderName]: () =>
                ({
                  getAddress: async () => '0x123',
                  getPublicKey: async () => null,
                  signTransaction: async (tx: any) => tx,
                  signMessage: async () => 'sig',
                  importFromMnemonic: async () => ({}),
                  importFromPrivateKey: async () => ({}),
                  export: async () => ({}),
                  generate: async () => ({}),
                }) as any,
            },
          },
        } as any,
        chain
      )

      await expect(remoteWallet.sendTransaction({ transactionHash: 'remote-digest' })).resolves.toBe('remote-digest')
    })

    it('executes bytes+signature payload from remote signer', async () => {
      const executeTransactionBlock = jest.fn().mockResolvedValue({ digest: 'remote-digest' })
      const remoteWallet = new WarpSuiWallet(
        {
          env: 'testnet',
          user: {
            wallets: {
              [chain.name]: {
                provider: customProviderName,
                address: '0x123',
                externalId: 'wallet-sui-1',
              },
            },
          },
          walletProviders: {
            [chain.name]: {
              [customProviderName]: () =>
                ({
                  getAddress: async () => '0x123',
                  getPublicKey: async () => null,
                  signTransaction: async (tx: any) => tx,
                  signMessage: async () => 'sig',
                  importFromMnemonic: async () => ({}),
                  importFromPrivateKey: async () => ({}),
                  export: async () => ({}),
                  generate: async () => ({}),
                }) as any,
            },
          },
        } as any,
        chain
      )
      remoteWallet['client'] = {
        signAndExecuteTransaction: jest.fn().mockResolvedValue({ digest: 'local-digest' }),
        executeTransactionBlock,
      } as any

      const digest = await remoteWallet.sendTransaction({ bytes: 'AQID', signature: 'remote-signature' })

      expect(digest).toBe('remote-digest')
      expect(executeTransactionBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionBlock: 'AQID',
          signature: ['remote-signature'],
        })
      )
    })

    it('rejects unsigned transaction payloads for remote providers', async () => {
      const remoteWallet = new WarpSuiWallet(
        {
          env: 'testnet',
          user: {
            wallets: {
              [chain.name]: {
                provider: customProviderName,
                address: '0x123',
                externalId: 'wallet-sui-1',
              },
            },
          },
          walletProviders: {
            [chain.name]: {
              [customProviderName]: () =>
                ({
                  getAddress: async () => '0x123',
                  getPublicKey: async () => null,
                  signTransaction: async (tx: any) => tx,
                  signMessage: async () => 'sig',
                  importFromMnemonic: async () => ({}),
                  importFromPrivateKey: async () => ({}),
                  export: async () => ({}),
                  generate: async () => ({}),
                }) as any,
            },
          },
        } as any,
        chain
      )

      await expect(remoteWallet.sendTransaction({ sign: jest.fn() })).rejects.toThrow(
        'Remote wallet provider must return signed payload (bytes + signature) or transactionHash for Sui transactions'
      )
    })
  })
})
