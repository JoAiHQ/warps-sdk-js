import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpMultiversxDataLoader } from './WarpMultiversxDataLoader'
import { getMultiversxEntrypoint } from './helpers/general'

jest.mock('./helpers/general', () => ({
  ...jest.requireActual('./helpers/general'),
  getMultiversxEntrypoint: jest.fn(),
}))

describe('WarpMultiversxDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'devnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    logoUrl: 'https://example.com/egld-logo.png',
    nativeToken: {
      chain: WarpChainName.Multiversx,
      identifier: 'EGLD',
      name: 'MultiversX',
      symbol: 'EGLD',
      decimals: 18,
      logoUrl: 'https://example.com/egld-logo.png',
    },
  }

  let dataLoader: WarpMultiversxDataLoader

  beforeEach(() => {
    dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpMultiversxDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should have getAccount method', () => {
      expect(typeof dataLoader.getAccount).toBe('function')
    })
  })

  describe('getAccountAssets', () => {
    it('should have getAccountAssets method', () => {
      expect(typeof dataLoader.getAccountAssets).toBe('function')
    })
  })

  describe('getAccountActions', () => {
    it('should fetch account actions without pagination', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([
          {
            txHash: 'tx1',
            receiver: 'receiver1',
            sender: 'sender1',
            value: '1000000000000000000',
            function: 'transfer',
            status: {
              isSuccessful: () => true,
              isFailed: () => false,
            },
            timestamp: 1640995200000,
          },
        ]),
      }

      ;(getMultiversxEntrypoint as jest.MockedFunction<typeof getMultiversxEntrypoint>).mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      const result = await dataLoader.getAccountActions('erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu')

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu/transactions')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        chain: 'multiversx',
        id: 'tx1',
        receiver: 'receiver1',
        sender: 'sender1',
        value: '1000000000000000000',
        function: 'transfer',
        status: 'success',
        createdAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should fetch account actions with pagination', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([
          {
            txHash: 'tx2',
            receiver: 'receiver2',
            sender: 'sender2',
            value: '2000000000000000000',
            function: 'transfer',
            status: {
              isSuccessful: () => true,
              isFailed: () => false,
            },
            timestamp: 1640995200000,
          },
        ]),
      }

      ;(getMultiversxEntrypoint as jest.MockedFunction<typeof getMultiversxEntrypoint>).mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      const result = await dataLoader.getAccountActions('erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu', { page: 1, size: 10 })

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu/transactions?from=10&size=10')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        chain: 'multiversx',
        id: 'tx2',
        receiver: 'receiver2',
        sender: 'sender2',
        value: '2000000000000000000',
        function: 'transfer',
        status: 'success',
        createdAt: '2022-01-01T00:00:00.000Z',
      })
    })

    it('should use default pagination values when not provided', async () => {
      const mockProvider = {
        doGetGeneric: jest.fn().mockResolvedValue([]),
      }

      ;(getMultiversxEntrypoint as jest.MockedFunction<typeof getMultiversxEntrypoint>).mockReturnValue({
        createNetworkProvider: () => mockProvider,
      } as any)

      const dataLoader = new WarpMultiversxDataLoader(mockConfig, mockChainInfo)
      await dataLoader.getAccountActions('erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu', {})

      expect(mockProvider.doGetGeneric).toHaveBeenCalledWith('accounts/erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu/transactions')
    })
  })
})
