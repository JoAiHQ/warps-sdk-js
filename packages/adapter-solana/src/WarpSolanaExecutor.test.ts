import { ChainAdapter, WarpChainInfo, WarpChainName, WarpClientConfig, WarpExecutable } from '@joai/warps'
import { Connection, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { NativeTokenSol, SolanaAdapter } from './chains/solana'
import { WarpSolanaExecutor } from './WarpSolanaExecutor'

const validBlockhash = bs58.encode(new Uint8Array(32).fill(1))
const testKeypair = Keypair.generate()
const testWalletAddress = testKeypair.publicKey.toBase58()

const mockFallbackAdapter = {
  chainInfo: {} as WarpChainInfo,
  builder: () => ({}) as any,
  executor: {} as any,
  output: {} as any,
  serializer: {} as any,
  registry: {} as any,
  explorer: {} as any,
  abiBuilder: () => ({}) as any,
  brandBuilder: () => ({}) as any,
  dataLoader: {} as any,
  wallet: {} as any,
} as ChainAdapter

describe('WarpSolanaExecutor', () => {
  let executor: WarpSolanaExecutor
  let mockConfig: WarpClientConfig
  let mockChainInfo: WarpChainInfo
  let mockWarp: any
  let solanaAdapter: ChainAdapter

  beforeEach(() => {
    jest.spyOn(Connection.prototype, 'getLatestBlockhash').mockResolvedValue({
      blockhash: validBlockhash,
      lastValidBlockHeight: 100,
    })
    jest.spyOn(Connection.prototype, 'getAccountInfo').mockResolvedValue(null)

    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          [WarpChainName.Solana]: testWalletAddress,
        },
      },
    } as WarpClientConfig

    mockChainInfo = {
      name: WarpChainName.Solana,
      displayName: 'Solana Testnet',
      chainId: '103',
      blockTime: 400,
      addressHrp: '',
      defaultApiUrl: 'https://api.testnet.solana.com',
      logoUrl: 'https://example.com/solana-logo.png',
      nativeToken: NativeTokenSol,
    }

    mockWarp = {
      actions: [
        {
          type: 'transfer',
        },
      ],
    }

    solanaAdapter = SolanaAdapter(mockConfig, mockFallbackAdapter)
    executor = new WarpSolanaExecutor(mockConfig, mockChainInfo)
  })

  describe('createTransferTransaction', () => {
    it('should create a native token transfer transaction', async () => {
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: mockWarp,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 1000000000n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx).toBeDefined()
      expect(tx.message).toBeDefined()
    })

    it('should throw error for invalid destination address', async () => {
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: mockWarp,
        action: 1,
        chain: mockChainInfo,
        destination: 'invalid-address',
        value: 1000000000n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createTransferTransaction(executable)).rejects.toThrow('WarpSolanaExecutor: Invalid destination address')
    })

    it('should create transaction with data when provided', async () => {
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: mockWarp,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: 'string:dGVzdA==',
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx).toBeDefined()
      expect(tx.message).toBeDefined()
    })
  })

  describe('createContractCallTransaction', () => {
    it('should create a contract call transaction', async () => {
      const contractWarp = {
        actions: [
          {
            type: 'contract',
            func: 'testFunction',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: contractWarp as any,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createContractCallTransaction(executable)
      expect(tx).toBeDefined()
      expect(tx.message).toBeDefined()
    })

    it('should throw error when function name is missing', async () => {
      const contractWarp = {
        actions: [
          {
            type: 'contract',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: contractWarp as any,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow(
        'WarpSolanaExecutor: Contract action must have a function name'
      )
    })
  })

  describe('executeQuery', () => {
    it('should execute a getBalance query', async () => {
      jest.spyOn(Connection.prototype, 'getBalance').mockResolvedValue(1000000000)

      const queryWarp = {
        actions: [
          {
            type: 'query',
            func: 'getBalance',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: queryWarp as any,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const result = await executor.executeQuery(executable)
      expect(result).toBeDefined()
      expect(result.status).toBe('success')
    })

    it('should throw error for invalid query action type', async () => {
      const transferWarp = {
        actions: [
          {
            type: 'transfer',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: transferWarp as any,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.executeQuery(executable)).rejects.toThrow('WarpSolanaExecutor: Invalid action type for executeQuery')
    })
  })

  describe('createTransaction', () => {
    it('should create a transfer transaction', async () => {
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: mockWarp,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 1000000000n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      const tx = await executor.createTransaction(executable)
      expect(tx).toBeDefined()
      expect(tx.message).toBeDefined()
    })

    it('should throw error for unsupported action type', async () => {
      const queryWarp = {
        actions: [
          {
            type: 'query',
            func: 'balanceOf',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: solanaAdapter,
        warp: queryWarp as any,
        action: 1,
        chain: mockChainInfo,
        destination: '11111111111111111111111111111111',
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
      }

      await expect(executor.createTransaction(executable)).rejects.toThrow('WarpSolanaExecutor: Invalid action type for createTransaction')
    })
  })
})
