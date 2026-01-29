import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'

describe('WarpFastsetDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'devnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: 'fastset',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    logoUrl: 'https://example.com/fastset-logo.png',
    nativeToken: {
      chain: WarpChainName.Fastset,
      identifier: 'SET',
      name: 'SET',
      symbol: 'SET',
      decimals: 6,
      logoUrl: 'https://example.com/set-logo.png',
    },
  }

  let dataLoader: WarpFastsetDataLoader

  beforeEach(() => {
    dataLoader = new WarpFastsetDataLoader(mockConfig, mockChainInfo)
    // Mock the client methods to prevent actual network calls
    dataLoader['client'] = {
      getAccountInfo: jest.fn().mockResolvedValue({
        address: 'set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489',
        balance: '0x123456789abcdef',
        balanceDecimal: 81985529216486896,
        nextNonce: 1,
        sequenceNumber: 1,
        token_balance: [],
      }),
      getTokenInfo: jest.fn().mockResolvedValue({
        requested_token_metadata: [
          [
            null,
            {
              token_name: 'Test Token',
              decimals: 6,
              total_supply: '0x1000000',
            },
          ],
        ],
      }),
    } as any
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpFastsetDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should have getAccount method', () => {
      expect(typeof dataLoader.getAccount).toBe('function')
    })

    it('should return WarpChainAccount type', async () => {
      const result = await dataLoader.getAccount('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(result).toHaveProperty('chain')
      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('balance')
      expect(typeof result.balance).toBe('bigint')
      expect(result.chain).toBe('fastset')
    })
  })

  describe('getAccountAssets', () => {
    it('should have getAccountAssets method', () => {
      expect(typeof dataLoader.getAccountAssets).toBe('function')
    })

    it('should return WarpChainAsset[] type', async () => {
      const result = await dataLoader.getAccountAssets('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        const asset = result[0]
        expect(asset).toHaveProperty('chain')
        expect(asset).toHaveProperty('identifier')
        expect(asset).toHaveProperty('name')
        expect(asset).toHaveProperty('amount')
        expect(asset).toHaveProperty('decimals')
        expect(typeof asset.amount).toBe('bigint')
        expect(asset.chain).toBe('fastset')
      }
    })
  })

  describe('getAccountActions', () => {
    it('should have getAccountActions method', () => {
      expect(typeof dataLoader.getAccountActions).toBe('function')
    })

    it('should return WarpChainAction[] type', async () => {
      const result = await dataLoader.getAccountActions('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        const action = result[0]
        expect(action).toHaveProperty('chain')
        expect(action).toHaveProperty('id')
        expect(action).toHaveProperty('sender')
        expect(action.chain).toBe('fastset')
      }
    })
  })
})
