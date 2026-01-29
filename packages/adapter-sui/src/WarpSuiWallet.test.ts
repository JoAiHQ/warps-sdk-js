import { WarpSuiWallet } from './WarpSuiWallet'

describe('WarpSuiWallet', () => {
  let wallet: WarpSuiWallet
  let config: any
  let chain: any

  beforeEach(() => {
    chain = {
      name: 'sui',
      defaultApiUrl: 'https://fullnode.testnet.sui.io',
      addressHrp: '0x',
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
      expect(publicKey.length).toBeGreaterThan(0)
    })

    it('should return null when wallet is not initialized', () => {
      const walletWithoutConfig = new WarpSuiWallet(
        {
          env: 'testnet',
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
        env: 'testnet',
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
        env: 'testnet',
        user: {
          wallets: {
            [chain.name]: { address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', provider: undefined },
          } as any,
        },
      }
      expect(() => new WarpSuiWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })
  })
})
