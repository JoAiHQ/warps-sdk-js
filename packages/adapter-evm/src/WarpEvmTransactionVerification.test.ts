import { WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { ethers } from 'ethers'
import { WarpEvmDataLoader } from './WarpEvmDataLoader'
import { WarpEvmExplorer } from './WarpEvmExplorer'
import { WarpEvmOutput } from './WarpEvmOutput'
import { NativeTokenBase } from './chains/base'
import { NativeTokenEth } from './chains/ethereum'

jest.unmock('@scure/bip39')

describe('WarpEvmTransactionVerification', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
  const testTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  const receiverAddress = '0x1234567890abcdef1234567890abcdef12345678'

  let mockProvider: any
  let mockConfig: WarpClientConfig

  const createMockProvider = () => ({
    getTransaction: jest.fn(),
    getTransactionReceipt: jest.fn(),
    getBlock: jest.fn(),
    getBalance: jest.fn().mockResolvedValue(BigInt(0)),
  })

  beforeEach(() => {
    mockProvider = createMockProvider()
    jest.spyOn(ethers, 'JsonRpcProvider').mockImplementation(() => mockProvider as any)
    jest.spyOn(ethers, 'getAddress').mockImplementation((addr: unknown) => {
      if (typeof addr === 'string') {
        try {
          return ethers.getAddress(addr)
        } catch {
          return addr.toLowerCase() as any
        }
      }
      return addr as any
    })

    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          ethereum: {
            provider: 'privateKey',
            address: testAddress,
            privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
          },
          base: {
            provider: 'privateKey',
            address: testAddress,
            privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
          },
        },
      },
    } as WarpClientConfig
  })

  describe('Transaction Status Verification - Sepolia', () => {
    let chainInfo: WarpChainInfo
    let dataLoader: WarpEvmDataLoader
    let output: WarpEvmOutput
    let explorer: WarpEvmExplorer

    beforeEach(() => {
      chainInfo = {
        name: WarpChainName.Ethereum,
        displayName: 'Ethereum Sepolia',
        chainId: '11155111',
        blockTime: 12000,
        addressHrp: '0x',
        defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
        },
        nativeToken: NativeTokenEth,
      }
      dataLoader = new WarpEvmDataLoader(mockConfig, chainInfo)
      output = new WarpEvmOutput(mockConfig, chainInfo)
      explorer = new WarpEvmExplorer(chainInfo, mockConfig)
    })

    it('should verify successful native ETH transfer transaction', async () => {
      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: receiverAddress,
        value: ethers.parseEther('1.0'),
        data: '0x',
        gasLimit: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.id).toBe(testTxHash)
      expect(action?.receiver).toBe(receiverAddress)
      expect(action?.sender).toBe(testAddress)
      expect(action?.value).toBe(ethers.parseEther('1.0'))
      expect(action?.error).toBeNull()
    })

    it('should verify failed transaction', async () => {
      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: receiverAddress,
        value: ethers.parseEther('1.0'),
        data: '0x',
        gasLimit: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 0,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('failed')
      expect(action?.error).toBe('Transaction failed')
    })

    it('should verify pending transaction', async () => {
      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: receiverAddress,
        value: ethers.parseEther('1.0'),
        data: '0x',
        gasLimit: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: null,
        blockHash: null,
        index: 0,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(null)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('pending')
      expect(action?.error).toBeNull()
    })

    it('should verify successful ERC-20 token transfer transaction', async () => {
      const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const transferData =
        '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: tokenAddress,
        value: 0n,
        data: transferData,
        gasLimit: 65000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 65000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.function).toBe('contract_call')
      expect(action?.receiver).toBe(tokenAddress)
    })

    it('should verify successful contract call transaction', async () => {
      const contractAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      const contractData =
        '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: contractAddress,
        value: 0n,
        data: contractData,
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 100000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.function).toBe('contract_call')
    })

    it('should verify transaction status via getTransactionStatus', async () => {
      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)

      const status = await output.getTransactionStatus(testTxHash)

      expect(status.status).toBe('confirmed')
      expect(status.blockNumber).toBe(12345)
      expect(status.gasUsed).toBe(21000n)
    })

    it('should verify failed transaction status via getTransactionStatus', async () => {
      const mockReceipt = {
        status: 0,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)

      const status = await output.getTransactionStatus(testTxHash)

      expect(status.status).toBe('failed')
      expect(status.blockNumber).toBe(12345)
    })

    it('should verify pending transaction status via getTransactionStatus', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null)

      const status = await output.getTransactionStatus(testTxHash)

      expect(status.status).toBe('pending')
      expect(status.blockNumber).toBeUndefined()
    })

    it('should generate correct explorer URLs for successful transaction', () => {
      const urls = explorer.getTransactionUrls(testTxHash)

      expect(urls).toBeDefined()
      expect(Object.keys(urls).length).toBeGreaterThan(0)
      Object.values(urls).forEach((url) => {
        expect(url).toContain('/tx/')
        expect(url).toContain(testTxHash)
      })
    })

    it('should generate correct explorer URL for transaction', () => {
      const url = explorer.getTransactionUrl(testTxHash)

      expect(url).toContain('/tx/')
      expect(url).toContain(testTxHash)
      expect(url).toContain('sepolia.etherscan.io')
    })
  })

  describe('Transaction Status Verification - Base Sepolia (Devnet)', () => {
    let chainInfo: WarpChainInfo
    let dataLoader: WarpEvmDataLoader
    let output: WarpEvmOutput
    let explorer: WarpEvmExplorer

    beforeEach(() => {
      chainInfo = {
        name: WarpChainName.Base,
        displayName: 'Base Sepolia',
        chainId: '84532',
        blockTime: 2000,
        addressHrp: '0x',
        defaultApiUrl: 'https://sepolia.base.org',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-black.svg',
        },
        nativeToken: NativeTokenBase,
      }
      dataLoader = new WarpEvmDataLoader({ ...mockConfig, env: 'devnet' }, chainInfo)
      output = new WarpEvmOutput({ ...mockConfig, env: 'devnet' }, chainInfo)
      explorer = new WarpEvmExplorer(chainInfo, { ...mockConfig, env: 'devnet' })
    })

    it('should verify successful native ETH transfer transaction on Base', async () => {
      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: receiverAddress,
        value: ethers.parseEther('2.0'),
        data: '0x',
        gasLimit: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.chain).toBe('base')
      expect(action?.error).toBeNull()
    })

    it('should verify successful ERC-20 token transfer transaction on Base', async () => {
      const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const transferData =
        '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: tokenAddress,
        value: 0n,
        data: transferData,
        gasLimit: 65000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 65000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.chain).toBe('base')
      expect(action?.function).toBe('contract_call')
    })

    it('should verify successful contract call transaction on Base', async () => {
      const contractAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      const contractData =
        '0xa9059cbb0000000000000000000000001234567890abcdef1234567890abcdef123456780000000000000000000000000000000000000000000000000de0b6b3a7640000'

      const mockTx = {
        hash: testTxHash,
        from: testAddress,
        to: contractAddress,
        value: ethers.parseEther('1.0'),
        data: contractData,
        gasLimit: 100000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        blockNumber: 12345,
        blockHash: '0xblockhash',
        index: 0,
      }

      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 100000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      const mockBlock = {
        timestamp: Math.floor(Date.now() / 1000),
        number: 12345,
      }

      mockProvider.getTransaction.mockResolvedValue(mockTx)
      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)
      mockProvider.getBlock.mockResolvedValue(mockBlock)

      const action = await dataLoader.getAction(testTxHash)

      expect(action).toBeDefined()
      expect(action?.status).toBe('success')
      expect(action?.chain).toBe('base')
      expect(action?.function).toBe('contract_call')
    })

    it('should verify transaction status on Base via getTransactionStatus', async () => {
      const mockReceipt = {
        status: 1,
        transactionHash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      }

      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)

      const status = await output.getTransactionStatus(testTxHash)

      expect(status.status).toBe('confirmed')
      expect(status.blockNumber).toBe(12345)
    })

    it('should generate correct explorer URLs for Base transaction', () => {
      const urls = explorer.getTransactionUrls(testTxHash)

      expect(urls).toBeDefined()
      expect(Object.keys(urls).length).toBeGreaterThan(0)
      Object.values(urls).forEach((url) => {
        expect(url).toContain('/tx/')
        expect(url).toContain(testTxHash)
      })
    })

    it('should generate correct explorer URL for Base transaction', () => {
      const url = explorer.getTransactionUrl(testTxHash)

      expect(url).toContain('/tx/')
      expect(url).toContain(testTxHash)
      expect(url).toContain('sepolia.basescan.org')
    })
  })

  describe('Transaction Receipt Handling', () => {
    let chainInfo: WarpChainInfo
    let output: WarpEvmOutput

    beforeEach(() => {
      chainInfo = {
        name: WarpChainName.Ethereum,
        displayName: 'Ethereum Sepolia',
        chainId: '11155111',
        blockTime: 12000,
        addressHrp: '0x',
        defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
        },
        nativeToken: NativeTokenEth,
      }
      output = new WarpEvmOutput(mockConfig, chainInfo)
    })

    it('should handle successful transaction receipt', async () => {
      const mockReceipt = {
        status: 1,
        hash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      } as unknown as ethers.TransactionReceipt

      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)

      const receipt = await output.getTransactionReceipt(testTxHash)

      expect(receipt).toBeDefined()
      expect(receipt?.status).toBe(1)
      expect(receipt?.hash).toBe(testTxHash)
    })

    it('should handle failed transaction receipt', async () => {
      const mockReceipt = {
        status: 0,
        hash: testTxHash,
        blockNumber: 12345,
        gasUsed: 21000n,
        gasPrice: ethers.parseUnits('20', 'gwei'),
        logs: [],
      } as unknown as ethers.TransactionReceipt

      mockProvider.getTransactionReceipt.mockResolvedValue(mockReceipt)

      const receipt = await output.getTransactionReceipt(testTxHash)

      expect(receipt).toBeDefined()
      expect(receipt?.status).toBe(0)
    })

    it('should handle null receipt for pending transaction', async () => {
      mockProvider.getTransactionReceipt.mockResolvedValue(null)

      const receipt = await output.getTransactionReceipt(testTxHash)

      expect(receipt).toBeNull()
    })
  })
})
