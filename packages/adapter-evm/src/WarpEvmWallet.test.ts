jest.unmock('@scure/bip39')

import { WarpEvmWallet } from './WarpEvmWallet'

describe('WarpEvmWallet', () => {
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
  let wallet: WarpEvmWallet
  let config: any
  let chain: any

  beforeEach(() => {
    chain = {
      name: 'ethereum',
      defaultApiUrl: 'https://rpc.sepolia.org',
      addressHrp: '0x',
    }
    config = {
      env: 'testnet',
      user: {
        wallets: {
          [chain.name]: {
            provider: 'privateKey',
            privateKey,
          },
        },
      },
    }
    wallet = new WarpEvmWallet(config, chain)
  })

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const message = 'Hello World'
      const signature = await wallet.signMessage(message)
      expect(signature).toBeDefined()
      expect(typeof signature).toBe('string')
      expect(signature.length).toBeGreaterThan(0)
    })

    it('should sign different messages with different signatures', async () => {
      const message1 = 'Message 1'
      const message2 = 'Message 2'
      const signature1 = await wallet.signMessage(message1)
      const signature2 = await wallet.signMessage(message2)
      expect(signature1).not.toBe(signature2)
    })
  })

  describe('signTransaction', () => {
    it('should sign a transaction successfully', async () => {
      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
        value: 0,
        gasLimit: 21000,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
        nonce: 0,
        chainId: 11155111,
      }

      const signedTx = await wallet.signTransaction(tx)
      expect(signedTx).toBeDefined()
      expect(signedTx.signature).toBeDefined()
      expect(typeof signedTx.signature).toBe('string')
    })

    it('should throw error for invalid transaction', async () => {
      await expect(wallet.signTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.signTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })
  })

  describe('sendTransaction', () => {
    it('should throw error for invalid transaction', async () => {
      await expect(wallet.sendTransaction(null as any)).rejects.toThrow('Invalid transaction object')
      await expect(wallet.sendTransaction('invalid' as any)).rejects.toThrow('Invalid transaction object')
    })

    // Note: sendTransaction would require a real RPC connection for full testing
    // In a real test environment, you might want to mock the ethers provider
  })

  describe('getPublicKey', () => {
    it('should return public key as hex string when wallet is initialized', () => {
      const publicKey = wallet.getPublicKey()
      expect(publicKey).toBeDefined()
      expect(publicKey).not.toBeNull()
      if (publicKey) {
        expect(typeof publicKey).toBe('string')
        expect(publicKey).toMatch(/^[0-9a-f]+$/)
        expect(publicKey.length).toBeGreaterThan(0)
      }
    })

    it('should return null when wallet is not initialized', () => {
      const walletWithoutConfig = new WarpEvmWallet(
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

  describe('read-only wallet', () => {
    const readOnlyAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    let readOnlyWallet: WarpEvmWallet

    beforeEach(() => {
      const readOnlyConfig = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [chain.name]: readOnlyAddress,
          },
        },
      }
      readOnlyWallet = new WarpEvmWallet(readOnlyConfig, chain)
    })

    it('should initialize read-only wallet without errors', () => {
      expect(readOnlyWallet).toBeDefined()
    })

    it('should return address for read-only wallet', () => {
      const address = readOnlyWallet.getAddress()
      expect(address).toBe(readOnlyAddress)
    })

    it('should throw error when trying to sign transaction with read-only wallet', async () => {
      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
        value: 0,
        gasLimit: 21000,
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 1000000000n,
        nonce: 0,
        chainId: 11155111,
      }

      await expect(readOnlyWallet.signTransaction(tx)).rejects.toThrow(`Wallet (${chain.name}) is read-only`)
    })

    it('should throw error when trying to sign message with read-only wallet', async () => {
      await expect(readOnlyWallet.signMessage('Hello')).rejects.toThrow(`Wallet (${chain.name}) is read-only`)
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

  describe('fee normalization for Coinbase', () => {
    let coinbaseWallet: WarpEvmWallet
    let coinbaseConfig: any
    const validAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'

    beforeEach(() => {
      const mockProvider = {
        signTransaction: jest.fn(async (tx: any) => {
          if (tx.maxPriorityFeePerGas && tx.maxFeePerGas) {
            const priority = typeof tx.maxPriorityFeePerGas === 'string' ? BigInt(tx.maxPriorityFeePerGas) : BigInt(tx.maxPriorityFeePerGas)
            const maxFee = typeof tx.maxFeePerGas === 'string' ? BigInt(tx.maxFeePerGas) : BigInt(tx.maxFeePerGas)
            if (priority > maxFee) {
              throw new Error(
                `TipAboveFeeCapError: The provided tip (maxPriorityFeePerGas = ${priority}) cannot be higher than the fee cap (maxFeePerGas = ${maxFee})`
              )
            }
          }
          return { ...tx, signature: '0x123' }
        }),
        getAddress: jest.fn(() => Promise.resolve(validAddress)),
        getPublicKey: jest.fn(() => Promise.resolve(null)),
        signMessage: jest.fn(() => Promise.resolve('0x123')),
        constructor: { name: 'CoinbaseWalletProvider', PROVIDER_NAME: 'coinbase' },
      }

      coinbaseConfig = {
        env: 'testnet',
        user: {
          wallets: {
            [chain.name]: {
              provider: 'coinbase',
              address: validAddress,
            },
          },
        },
        walletProviders: {
          [chain.name]: {
            coinbase: jest.fn(() => mockProvider),
          },
        },
      }
      coinbaseWallet = new WarpEvmWallet(coinbaseConfig, chain)
      coinbaseWallet['provider'].getTransactionCount = jest.fn(() => Promise.resolve(0))
    })

    it('should normalize priority fee when it exceeds max fee', async () => {
      const tx = {
        to: validAddress,
        value: '0x0',
        maxFeePerGas: '0x155cc',
        maxPriorityFeePerGas: '0xf424',
        chainId: 1,
        nonce: 0,
      }

      const result = await coinbaseWallet.signTransaction(tx)
      expect(result).toBeDefined()
      expect(result.signature).toBe('0x123')
    })

    it('should handle very small max fee', async () => {
      const tx = {
        to: validAddress,
        value: '0x0',
        maxFeePerGas: '0x5',
        maxPriorityFeePerGas: '0x10',
        chainId: 1,
        nonce: 0,
      }

      const result = await coinbaseWallet.signTransaction(tx)
      expect(result).toBeDefined()
    })

    it('should preserve valid fee relationship', async () => {
      const tx = {
        to: validAddress,
        value: '0x0',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x5f5e100',
        chainId: 1,
        nonce: 0,
      }

      const result = await coinbaseWallet.signTransaction(tx)
      expect(result).toBeDefined()
    })

    it('should convert legacy gasPrice to EIP-1559 format', async () => {
      const tx = {
        to: validAddress,
        value: '0x0',
        gasPrice: '0x3b9aca00',
        chainId: 1,
        nonce: 0,
      }

      const result = await coinbaseWallet.signTransaction(tx)
      expect(result).toBeDefined()
    })

    it('should handle transactions with BigInt fee values', async () => {
      const tx = {
        to: validAddress,
        value: '0x0',
        maxFeePerGas: 1000000000n,
        maxPriorityFeePerGas: 2000000000n,
        chainId: 1,
        nonce: 0,
      }

      const result = await coinbaseWallet.signTransaction(tx)
      expect(result).toBeDefined()
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
      expect(() => new WarpEvmWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
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
      expect(() => new WarpEvmWallet(cfg, chain)).not.toThrow('Unsupported wallet provider')
    })
  })
})
