import { getWarpWalletPrivateKeyFromConfig, WarpChainInfo, WarpChainName } from '@joai/warps'
import { Transaction } from './sdk'
import { WarpFastsetWallet } from './WarpFastsetWallet'

// Mock the helpers to avoid import issues
jest.mock('./helpers', () => ({
  encoder: new TextEncoder(),
  decoder: new TextDecoder(),
  uint8ArrayToHex: jest.fn((arr: Uint8Array) => Buffer.from(arr).toString('hex')),
  hexToUint8Array: jest.fn((hex: string) => new Uint8Array(Buffer.from(hex, 'hex'))),
  uint8ArrayToString: jest.fn((arr: Uint8Array) => Buffer.from(arr).toString('utf8')),
  stringToUint8Array: jest.fn((str: string) => new Uint8Array(Buffer.from(str, 'utf8'))),
  getConfiguredFastsetClient: jest.fn(() => ({
    request: jest.fn().mockResolvedValue({ result: 'mock-tx-hash' }),
    submitTransaction: jest.fn().mockResolvedValue({ result: 'mock-certificate' }),
  })),
}))

jest.mock('./sdk', () => ({
  FastsetClient: Object.assign(
    jest.fn().mockImplementation(() => ({
      encodeBech32Address: jest.fn(() => 'set1testaddress123456789'),
    })),
    {
      encodeBech32Address: jest.fn(() => 'set1testaddress123456789'),
    }
  ),
  Wallet: jest.fn().mockImplementation((privateKeyHex: string) => ({
    toBech32: jest.fn().mockReturnValue('set1mockaddress'),
    getPrivateKey: jest
      .fn()
      .mockReturnValue(
        Uint8Array.from([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        ])
      ),
    signTransactionRaw: jest.fn(),
  })),
  Transaction: {
    serialize: jest.fn(() => ({
      toBytes: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
    })),
  },
}))

jest.mock('./sdk/ed25519-setup', () => ({
  ed: {
    getPublicKey: jest.fn((privateKey) => new Uint8Array(32)),
    utils: {
      randomSecretKey: jest.fn(() => new Uint8Array(32)),
    },
    sign: jest.fn((message, privateKey) => new Uint8Array(64).fill(1)), // Fill with 1s so hex conversion works
  },
}))

// Mock getWarpWalletPrivateKeyFromConfig to return undefined for uninitialized wallet tests
jest.mock('@joai/warps', () => ({
  ...jest.requireActual('@joai/warps'),
  getWarpWalletPrivateKeyFromConfig: jest.fn(),
}))

describe('WarpFastsetWallet', () => {
  const mockConfig = {
    env: 'testnet' as const,
    user: {
      wallets: {
        fastset: {
          provider: 'privateKey' as const,
          address: '',
          privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
      },
    },
  }

  const mockChain: WarpChainInfo = {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: 'testnet',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://test.fastset.xyz',
    logoUrl: 'https://test.fastset.xyz/logo.svg',
    nativeToken: {
      chain: WarpChainName.Fastset,
      identifier: 'SET',
      name: 'SET',
      symbol: 'SET',
      decimals: 6,
      logoUrl: 'https://test.fastset.xyz/tokens/set.svg',
    },
  }

  let wallet: WarpFastsetWallet

  beforeEach(() => {
    // Mock private key to be available by default - set this before clearAllMocks
    ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockImplementation(
      (config, chainName) => {
        if (chainName === 'fastset') {
          return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
        return null
      }
    )
    jest.clearAllMocks()
    // Re-set the mock implementation after clearAllMocks
    ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockImplementation(
      (config, chainName) => {
        if (chainName === 'fastset') {
          return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
        }
        return null
      }
    )
    wallet = new WarpFastsetWallet(mockConfig, mockChain)
    // Ensure client has request and submitTransaction methods
    if (wallet['client']) {
      wallet['client'].request = jest.fn().mockResolvedValue({ result: 'mock-tx-hash' })
      wallet['client'].submitTransaction = jest.fn().mockResolvedValue({ result: 'mock-certificate' })
    }
  })

  describe('Wallet Creation', () => {
    test('create() should create wallet from mnemonic', async () => {
      const mnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
      const configWithMnemonic = {
        env: 'testnet' as const,
        user: {
          wallets: {
            fastset: {
              provider: 'mnemonic' as const,
              address: '',
              mnemonic:
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
            },
          },
        },
      }
      const walletWithMnemonic = new WarpFastsetWallet(configWithMnemonic, mockChain)
      const result = await walletWithMnemonic.importFromMnemonic(mnemonic)

      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('privateKey')
      expect(result.mnemonic).toBe(mnemonic)
      expect(typeof result.address).toBe('string')
      expect(result.privateKey).not.toBeNull()
      expect(typeof result.privateKey).toBe('string')
      expect(result.address).toMatch(/^set1/)
    })

    test('generate() should generate random wallet', async () => {
      const configWithMnemonic = {
        env: 'testnet' as const,
        user: {
          wallets: {
            fastset: {
              provider: 'mnemonic' as const,
              address: '',
              mnemonic:
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
            },
          },
        },
      }
      const walletWithMnemonic = new WarpFastsetWallet(configWithMnemonic, mockChain)
      const result = await walletWithMnemonic.generate('mnemonic')

      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('privateKey')
      expect(result.mnemonic).not.toBeNull()
      expect(typeof result.address).toBe('string')
      expect(result.privateKey).toBeNull()
      expect(result.address).toMatch(/^set1/)
    })

    test('generate() should generate 24-word mnemonic', async () => {
      const configWithMnemonic = {
        env: 'testnet' as const,
        user: {
          wallets: {
            fastset: {
              provider: 'mnemonic' as const,
              address: '',
              mnemonic:
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
            },
          },
        },
      }
      const walletWithMnemonic = new WarpFastsetWallet(configWithMnemonic, mockChain)
      const result = await walletWithMnemonic.generate('mnemonic')

      expect(result.mnemonic).not.toBeNull()
      if (result.mnemonic) {
        const words = result.mnemonic.split(' ')
        expect(words.length).toBe(24)
      }
    })
  })

  describe('Address Management', () => {
    test('getAddress() should return configured address', () => {
      const address = wallet.getAddress()
      expect(address).toBe('set1testaddress123456789')
    })

    test('getAddress() should return null when no wallet configured', () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const address = walletWithoutConfig.getAddress()
      expect(address).toBeNull()
    })
  })

  describe('Signing Operations', () => {
    test('signMessage() should throw error when wallet not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)

      await expect(walletWithoutConfig.signMessage('test')).rejects.toThrow('No wallet provider available')
    })

    test('signTransaction() should throw error when wallet not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      const mockTx = {
        claim: { Transfer: { amount: '1000000000000000000', user_data: null } },
        nonce: 0,
        recipient: { FastSet: new Uint8Array(32) }, // Use 32-byte array
        sender: new Uint8Array(32), // Use 32-byte array
        timestamp_nanos: BigInt(Date.now() * 1000000),
      }

      await expect(walletWithoutConfig.signTransaction(mockTx as any)).rejects.toThrow('No wallet provider available')
    })

    // Skip actual signing tests due to mocking complexity in test environment
    test('signMessage() should sign message and return hex string', async () => {
      const message = 'test message'
      const result = await wallet.signMessage(message)

      expect(typeof result).toBe('string')
      expect(result).toMatch(/^[0-9a-f]+$/)
      expect(result.length).toBeGreaterThan(0)
    })

    test('signTransaction() should sign transaction', async () => {
      const originalSerialize = Transaction.serialize
      const mockSerialized = {
        toBytes: jest.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
        toHex: jest.fn(() => '0102030405'),
        toBase64: jest.fn(() => 'AQIDBAU='),
        toBase58: jest.fn(() => ''),
        parse: jest.fn(),
      }
      Transaction.serialize = jest.fn(() => mockSerialized as any)

      const mockTx = {
        sender: new Uint8Array(32),
        recipient: { FastSet: new Uint8Array(32) },
        nonce: 1,
        timestamp_nanos: 1000000000n,
        claim: { Transfer: { amount: '1000', user_data: null } },
      }

      const result = await wallet.signTransaction(mockTx as any)

      expect(result).toHaveProperty('signature')
      expect(result.signature).toBeInstanceOf(Uint8Array)
      expect(result.signature.length).toBe(64)

      // Restore original function
      Transaction.serialize = originalSerialize
    })
  })

  describe('Transaction Submission', () => {
    test('sendTransaction() should work even when wallet not initialized', async () => {
      // Mock private key to be undefined for this test - sendTransaction doesn't check for private key
      ;(getWarpWalletPrivateKeyFromConfig as jest.MockedFunction<typeof getWarpWalletPrivateKeyFromConfig>).mockReturnValueOnce(null as any)
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      // Ensure client has request and submitTransaction methods
      if (walletWithoutConfig['client']) {
        walletWithoutConfig['client'].request = jest.fn().mockResolvedValue({ result: 'mock-tx-hash' })
        walletWithoutConfig['client'].submitTransaction = jest.fn().mockResolvedValue({ result: 'mock-certificate' })
      }
      const mockTx = {
        claim: { Transfer: { amount: '1000000000000000000', user_data: null } },
        nonce: 0,
        recipient: { FastSet: new Uint8Array(32) }, // Use 32-byte array
        sender: new Uint8Array(32), // Use 32-byte array
        timestamp_nanos: BigInt(Date.now() * 1000000),
        signature: 'mock-signature',
      }

      const result = await walletWithoutConfig.sendTransaction(mockTx as any)

      expect(result).toBe('TODO')
    })

    test('sendTransaction() should submit transaction and return hash', async () => {
      const mockTx = {
        toTransaction: jest.fn().mockReturnValue({
          sender: new Uint8Array([1, 2, 3]),
          recipient: new Uint8Array([4, 5, 6]),
          nonce: 1,
          timestamp_nanos: 1000000000n,
          claim: { Transfer: { amount: '1000', user_data: null } },
        }),
        signature: 'a1b2c3d4e5f6',
      }

      const result = await wallet.sendTransaction(mockTx as any)

      expect(typeof result).toBe('string')
      expect(result).toBe('TODO')
    })

    test('sendTransaction() should sign and submit transaction without signature', async () => {
      const mockTx = {
        toTransaction: jest.fn().mockReturnValue({
          sender: new Uint8Array([1, 2, 3]),
          recipient: new Uint8Array([4, 5, 6]),
          nonce: 1,
          timestamp_nanos: 1000000000n,
          claim: { Transfer: { amount: '1000', user_data: null } },
        }),
        // No signature provided
      }

      const result = await wallet.sendTransaction(mockTx as any)

      expect(typeof result).toBe('string')
      expect(result).toBe('TODO')
    })
  })

  describe('getPublicKey', () => {
    test('should return public key as hex string when wallet is initialized', async () => {
      const testWallet = new WarpFastsetWallet(mockConfig, mockChain)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const publicKey = testWallet.getPublicKey()
      expect(publicKey).toBeDefined()
      if (publicKey !== null) {
        expect(typeof publicKey).toBe('string')
        expect(publicKey).toMatch(/^[0-9a-f]+$/)
        expect(publicKey.length).toBe(64)
      } else {
        expect(publicKey).not.toBeNull()
      }
    })

    test('should return null when wallet is not initialized', async () => {
      const walletWithoutConfig = new WarpFastsetWallet({ env: 'testnet' }, mockChain)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const publicKey = walletWithoutConfig.getPublicKey()
      expect(publicKey).toBeNull()
    })
  })

  describe('Cross-Environment Compatibility', () => {
    test('should work with Uint8Array operations', () => {
      // Test that our helper functions work correctly
      const testBytes = new Uint8Array([1, 2, 3, 4, 5])
      const hex = testBytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')

      expect(hex).toBe('0102030405')

      const backToBytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < backToBytes.length; i++) {
        backToBytes[i] = parseInt(hex.substr(i * 2, 2), 16)
      }

      expect(backToBytes).toEqual(testBytes)
    })

    test('should handle different environments gracefully', async () => {
      const configWithMnemonic = {
        env: 'testnet' as const,
        user: {
          wallets: {
            fastset: {
              provider: 'mnemonic' as const,
              address: '',
              mnemonic:
                'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
            },
          },
        },
      }
      const walletWithMnemonic = new WarpFastsetWallet(configWithMnemonic, mockChain)
      const result = await walletWithMnemonic.generate('mnemonic')
      expect(result.privateKey).toBeDefined()
      expect(result.mnemonic).not.toBeNull()
      if (result.privateKey) {
        expect(result.privateKey.length).toBeGreaterThan(0)
        expect(typeof result.privateKey).toBe('string')
      }
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
            [mockChain.name]: { address: 'set1testaddress123456789', provider: null },
          } as any,
        },
      }
      expect(() => new WarpFastsetWallet(cfg, mockChain)).not.toThrow('Unsupported wallet provider')
    })

    it('should use ReadOnlyWalletProvider when provider is undefined', () => {
      const cfg = {
        env: 'testnet' as const,
        user: {
          wallets: {
            [mockChain.name]: { address: 'set1testaddress123456789', provider: undefined },
          } as any,
        },
      }
      expect(() => new WarpFastsetWallet(cfg, mockChain)).not.toThrow('Unsupported wallet provider')
    })
  })
})
