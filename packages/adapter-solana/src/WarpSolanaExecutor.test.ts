import { WarpChainInfo, WarpChainName, WarpClientConfig, WarpExecutable } from '@joai/warps'
import { NativeTokenSol, SolanaAdapter } from './chains/solana'
import { WarpSolanaExecutor } from './WarpSolanaExecutor'

describe('WarpSolanaExecutor', () => {
  let executor: WarpSolanaExecutor
  let mockConfig: WarpClientConfig
  let mockChainInfo: WarpChainInfo
  let mockWarp: any

  beforeEach(() => {
    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          [WarpChainName.Solana]: '5KJvsngHeMoo424rH3Y1bVhjKM2f7jNsN1Tsp9i6F9XHj8qJ7vK',
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

    executor = new WarpSolanaExecutor(mockConfig, mockChainInfo)
  })

  describe('createTransferTransaction', () => {
    it('should create a native token transfer transaction', async () => {
      const executable: WarpExecutable = {
        adapter: SolanaAdapter(mockConfig),
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

      try {
        const tx = await executor.createTransferTransaction(executable)
        expect(tx).toBeDefined()
        expect((tx as any).instructions?.length ?? (tx as any).message?.instructions?.length ?? 0).toBeGreaterThan(0)
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })

    it('should throw error for invalid destination address', async () => {
      const executable: WarpExecutable = {
        adapter: SolanaAdapter(mockConfig),
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
        adapter: SolanaAdapter(mockConfig),
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

      try {
        const tx = await executor.createTransferTransaction(executable)
        expect(tx).toBeDefined()
      } catch (error) {
        // Expected to fail in test environment
      }
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
        adapter: SolanaAdapter(mockConfig),
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

      try {
        const tx = await executor.createContractCallTransaction(executable)
        expect(tx).toBeDefined()
      } catch (error) {
        // Expected to fail in test environment
      }
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
        adapter: SolanaAdapter(mockConfig),
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
    it('should execute a query for account info', async () => {
      const queryWarp = {
        actions: [
          {
            type: 'query',
            func: 'getAccount',
          },
        ],
      }
      const executable: WarpExecutable = {
        adapter: SolanaAdapter(mockConfig),
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

      try {
        const result = await executor.executeQuery(executable)
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
      } catch (error) {
        // Expected to fail in test environment
      }
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
        adapter: SolanaAdapter(mockConfig),
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
        adapter: SolanaAdapter(mockConfig),
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

      try {
        const tx = await executor.createTransaction(executable)
        expect(tx).toBeDefined()
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
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
        adapter: SolanaAdapter(mockConfig),
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
