import { CdpClient } from '@coinbase/cdp-sdk'
import type { WarpChainInfo } from '@joai/warps'
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider'
import { CoinbaseProviderConfig } from './types'

jest.mock('@coinbase/cdp-sdk')

describe('CoinbaseWalletProvider', () => {
  const mockWalletSecret = 'test-wallet-secret'
  const mockAccountId = 'test-account-id'
  const mockAddress = '0x1234567890123456789012345678901234567890'
  const mockPublicKey = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

  let config: any
  let chain: WarpChainInfo
  let coinbaseConfig: CoinbaseProviderConfig
  let provider: CoinbaseWalletProvider
  let mockClient: any

  const baseChain = (name: string, defaultApiUrl: string, addressHrp: string): WarpChainInfo =>
    ({
      name,
      displayName: name,
      chainId: '1',
      blockTime: 12,
      addressHrp,
      defaultApiUrl,
      logoUrl: '',
      nativeToken: { chain: name, identifier: '', name: '', symbol: '', decimals: 18, logoUrl: '' },
    }) as WarpChainInfo

  beforeEach(() => {
    chain = baseChain('ethereum', 'https://rpc.sepolia.org', '0x')
    config = {
      env: 'testnet',
      user: {
        id: 'test-user-id',
        wallets: {
          [chain.name]: {
            provider: 'coinbase',
            address: mockAddress,
            externalId: null,
          },
        },
      },
    }
    coinbaseConfig = {
      apiKeyId: 'test-api-key-id',
      apiKeySecret: 'test-api-key-secret',
      walletSecret: mockWalletSecret,
    }

    mockClient = {
      evm: {
        getAccount: jest.fn(),
        signTransaction: jest.fn(),
        signMessage: jest.fn(),
        createAccount: jest.fn(),
        exportAccount: jest.fn(),
        sendTransaction: jest.fn(),
        listAccounts: jest.fn(),
        importAccount: jest.fn(),
      },
      solana: {
        getAccount: jest.fn(),
        signTransaction: jest.fn(),
        signMessage: jest.fn(),
        createAccount: jest.fn(),
        exportAccount: jest.fn(),
        sendTransaction: jest.fn(),
        listAccounts: jest.fn(),
        importAccount: jest.fn(),
      },
    } as any
    ;(CdpClient as any).mockReturnValue(mockClient)

    provider = new CoinbaseWalletProvider(config, chain, coinbaseConfig)
  })

  describe('getAddress', () => {
    it('should return address from Coinbase account', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
        publicKey: mockPublicKey,
      })

      const address = await provider.getAddress()
      expect(address).toBe(mockAddress)
      expect(mockClient.evm.getAccount).toHaveBeenCalledWith({ address: mockAddress })
    })

    it('should return null on error', async () => {
      mockClient.evm.getAccount.mockRejectedValue(new Error('API error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const address = await provider.getAddress()
      expect(address).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('getPublicKey', () => {
    it('should return public key from Coinbase account', async () => {
      const mockAccount = {
        address: mockAddress,
        publicKey: mockPublicKey,
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccount)

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBe(mockPublicKey)

      const publicKey2 = await provider.getPublicKey()
      expect(publicKey2).toBe(mockPublicKey)
    })

    it('should return null if public key is not available', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBeNull()
    })

    it('should return null on error', async () => {
      mockClient.evm.getAccount.mockRejectedValue(new Error('API error'))
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const publicKey = await provider.getPublicKey()
      expect(publicKey).toBeNull()

      consoleSpy.mockRestore()
    })
  })

  describe('signTransaction', () => {
    it('should sign transaction using Coinbase API', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000',
        data: '0x',
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      const result = await provider.signTransaction(mockTx)
      expect(result).toEqual({
        ...mockTx,
        signature: mockSignedTx,
      })
      expect(mockClient.evm.getAccount).toHaveBeenCalledWith({ address: mockAddress })
      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0x9876543210987654321098765432109876543210',
        })
      )
    })

    it('should throw error if API does not return signed transaction', async () => {
      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(null),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      const result = await provider.signTransaction({})
      expect(result).toEqual({
        signature: null,
      })
    })

    it('should throw error on API failure', async () => {
      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockRejectedValue(new Error('API error')),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      await expect(provider.signTransaction({})).rejects.toThrow('CoinbaseWalletProvider: Failed to sign transaction')
    })

    it('should fix invalid fee relationship where maxPriorityFeePerGas > maxFeePerGas', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000',
        data: '0x',
        maxFeePerGas: '0x155cc',
        maxPriorityFeePerGas: '0xf424',
        chainId: 84532,
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      const result = await provider.signTransaction(mockTx)
      expect(result).toEqual({
        ...mockTx,
        signature: mockSignedTx,
      })

      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalled()
    })

    it('should handle priority fee equal to max fee', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        chainId: 1,
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      await provider.signTransaction(mockTx)

      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalled()
      const callArgs = mockAccountWithSignMethod.signTransaction.mock.calls[0][0]
      expect(callArgs.maxFeePerGas).toBe(mockTx.maxFeePerGas)
      const maxFee = BigInt(callArgs.maxFeePerGas)
      const maxPriorityFee = BigInt(callArgs.maxPriorityFeePerGas)
      expect(maxPriorityFee <= maxFee).toBe(true)
    })

    it('should pass through transaction values', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        maxFeePerGas: '0x5',
        maxPriorityFeePerGas: '0xa',
        chainId: 1,
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      await provider.signTransaction(mockTx)

      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalled()
      const callArgs = mockAccountWithSignMethod.signTransaction.mock.calls[0][0]
      expect(callArgs.to).toBe(mockTx.to)
      expect(callArgs.chainId).toBe(mockTx.chainId)
    })

    it('should handle bigint values', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        maxFeePerGas: 20000000000n,
        maxPriorityFeePerGas: 30000000000n,
        chainId: 1,
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      await provider.signTransaction(mockTx)

      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalled()
    })

    it('should handle numeric values', async () => {
      const mockTx = {
        to: '0x9876543210987654321098765432109876543210',
        maxFeePerGas: 20000000000,
        maxPriorityFeePerGas: 30000000000,
        chainId: 1,
      }
      const mockSignedTx = '0xabcdef1234567890...'

      const mockAccountWithSignMethod = {
        address: mockAddress,
        signTransaction: jest.fn().mockResolvedValue(mockSignedTx),
      }
      mockClient.evm.getAccount.mockResolvedValue(mockAccountWithSignMethod)

      await provider.signTransaction(mockTx)

      expect(mockAccountWithSignMethod.signTransaction).toHaveBeenCalled()
    })
  })

  describe('signMessage', () => {
    it('should sign message using Coinbase API', async () => {
      const message = 'Hello World'
      const mockSignedMessage = '0xsignedmessage123...'

      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
        id: mockAddress,
      })
      mockClient.evm.signMessage.mockResolvedValue({
        signedMessage: mockSignedMessage,
      })

      const result = await provider.signMessage(message)
      expect(result).toBe(mockSignedMessage)
      expect(mockClient.evm.signMessage).toHaveBeenCalledWith({
        address: mockAddress,
        message,
      })
    })

    it('should throw error if API does not return signed message', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signMessage.mockResolvedValue({})

      await expect(provider.signMessage('test')).rejects.toThrow('Coinbase API did not return signed message')
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.getAccount.mockResolvedValue({
        address: mockAddress,
      })
      mockClient.evm.signMessage.mockRejectedValue(new Error('API error'))

      await expect(provider.signMessage('test')).rejects.toThrow('CoinbaseWalletProvider: Failed to sign message')
    })
  })

  describe('importFromMnemonic', () => {
    it('should throw error indicating mnemonic is not supported', async () => {
      await expect(provider.importFromMnemonic('test mnemonic')).rejects.toThrow(
        'CoinbaseWalletProvider: importFromMnemonic() is not supported'
      )
    })
  })

  describe('importFromPrivateKey', () => {
    it('should import EVM account from private key', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      const mockImportedAccount = {
        address: '0x9876543210fedcba9876543210fedcba98765432',
      }

      mockClient.evm.importAccount = jest.fn().mockResolvedValue(mockImportedAccount)

      const result = await provider.importFromPrivateKey(mockPrivateKey)

      expect(result).toEqual({
        provider: 'coinbase',
        address: mockImportedAccount.address,
        privateKey: mockPrivateKey,
      })
      expect(mockClient.evm.importAccount).toHaveBeenCalledWith({
        privateKey: mockPrivateKey,
        name: 'test-user-id-ethereum',
      })
      expect(config.user?.wallets?.[chain.name]).toEqual(result)
    })

    it('should import Solana account from private key', async () => {
      const solanaChain = baseChain('solana', 'https://api.mainnet-beta.solana.com', '')
      const solanaConfig = {
        ...config,
        user: {
          id: 'test-user-id',
          wallets: {
            solana: {
              provider: 'coinbase',
              address: 'SolanaAddress123',
            },
          },
        },
      }
      const solanaProvider = new CoinbaseWalletProvider(solanaConfig, solanaChain, coinbaseConfig)
      const mockPrivateKey = '4YFq9y5f5hi77Bq8kDCE6VgqoAq...'
      const mockImportedAccount = {
        address: 'SolanaImportedAddress123',
      }

      mockClient.solana.importAccount = jest.fn().mockResolvedValue(mockImportedAccount)

      const result = await solanaProvider.importFromPrivateKey(mockPrivateKey)

      expect(result).toEqual({
        provider: 'coinbase',
        address: mockImportedAccount.address,
        privateKey: mockPrivateKey,
      })
      expect(mockClient.solana.importAccount).toHaveBeenCalledWith({
        privateKey: mockPrivateKey,
        name: 'test-user-id-solana',
      })
      expect(solanaConfig.user?.wallets?.solana).toEqual(result)
    })

    it('should throw error on API failure', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      mockClient.evm.importAccount = jest.fn().mockRejectedValue(new Error('API error'))

      await expect(provider.importFromPrivateKey(mockPrivateKey)).rejects.toThrow(
        'CoinbaseWalletProvider: Failed to import account from private key'
      )
    })
  })

  describe('export', () => {
    it('should export EVM account private key', async () => {
      const mockPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      mockClient.evm.exportAccount = jest.fn().mockResolvedValue(mockPrivateKey)

      const result = await provider.export()
      expect(result).toEqual({
        provider: 'coinbase',
        address: mockAddress,
        privateKey: mockPrivateKey,
      })
      expect(mockClient.evm.exportAccount).toHaveBeenCalledWith({ address: mockAddress })
    })

    it('should export Solana account private key', async () => {
      const solanaChain = baseChain('solana', 'https://api.mainnet-beta.solana.com', '')
      const solanaConfig = {
        ...config,
        user: {
          wallets: {
            solana: {
              provider: 'coinbase',
              address: 'SolanaAddress123',
            },
          },
        },
      }
      const solanaProvider = new CoinbaseWalletProvider(solanaConfig, solanaChain, coinbaseConfig)
      const mockPrivateKey = 'solana-private-key-123'
      mockClient.solana = {
        getAccount: jest.fn().mockResolvedValue({ address: 'SolanaAddress123' }),
        exportAccount: jest.fn().mockResolvedValue(mockPrivateKey),
      } as any

      const result = await solanaProvider.export()
      expect(result).toEqual({
        provider: 'coinbase',
        address: 'SolanaAddress123',
        privateKey: mockPrivateKey,
      })
      expect(mockClient.solana.exportAccount).toHaveBeenCalledWith({ address: 'SolanaAddress123' })
    })

    it('should throw error when address is not found', async () => {
      const configWithoutAddress = {
        ...config,
        user: {
          wallets: {},
        },
      }
      const providerWithoutAddress = new CoinbaseWalletProvider(configWithoutAddress, chain, coinbaseConfig)

      await expect(providerWithoutAddress.export()).rejects.toThrow('CoinbaseWalletProvider: Wallet address not found in config')
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.exportAccount = jest.fn().mockRejectedValue(new Error('API error'))

      await expect(provider.export()).rejects.toThrow('CoinbaseWalletProvider: Failed to export account')
    })
  })

  describe('generate', () => {
    it('should create a new Coinbase account', async () => {
      mockClient.evm.createAccount.mockResolvedValue({
        address: '0xnewaddress',
      })

      const result = await provider.generate()
      expect(result).toEqual({
        provider: 'coinbase',
        address: '0xnewaddress',
      })
      expect(mockClient.evm.createAccount).toHaveBeenCalled()
      expect(config.user?.wallets?.[chain.name]).toEqual(result)
    })

    it('should throw error on API failure', async () => {
      mockClient.evm.createAccount.mockRejectedValue(new Error('API error'))

      await expect(provider.generate()).rejects.toThrow('CoinbaseWalletProvider: Failed to generate account')
    })
  })
})
