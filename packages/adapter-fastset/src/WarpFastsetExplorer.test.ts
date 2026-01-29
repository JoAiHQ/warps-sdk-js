import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpFastsetExplorer } from './WarpFastsetExplorer'

describe('WarpFastsetExplorer', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Fastset,
    displayName: 'FastSet',
    chainId: '1',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    logoUrl: 'https://example.com/set-logo.png',
    nativeToken: {
      chain: WarpChainName.Fastset,
      identifier: 'SET',
      name: 'SET',
      symbol: 'SET',
      decimals: 6,
      logoUrl: 'https://example.com/set-logo.png',
    },
  }

  let explorer: WarpFastsetExplorer

  beforeEach(() => {
    explorer = new WarpFastsetExplorer(mockChainInfo, mockConfig)
  })

  describe('constructor', () => {
    it('should create an explorer instance', () => {
      expect(explorer).toBeInstanceOf(WarpFastsetExplorer)
    })
  })

  describe('getAccountUrl', () => {
    it('should generate correct account URL', () => {
      const address = 'set1t8uukazqxau9x2pntg7x2xhjtwunuqnq67kud0g698ug3gn5lmfqmq0d8q'
      const url = explorer.getAccountUrl(address)
      expect(url).toBe('https://explorer.fastset.xyz/account/set1t8uukazqxau9x2pntg7x2xhjtwunuqnq67kud0g698ug3gn5lmfqmq0d8q')
    })

    it('should handle different address formats', () => {
      const address = 'set177rt9kr5z64tv4hecea8lqql5qwtfqfd6nxzrtcdqk33d0ccrq9snqekm6'
      const url = explorer.getAccountUrl(address)
      expect(url).toBe('https://explorer.fastset.xyz/account/set177rt9kr5z64tv4hecea8lqql5qwtfqfd6nxzrtcdqk33d0ccrq9snqekm6')
    })
  })

  describe('getTransactionUrl', () => {
    it('should generate correct transaction URL', () => {
      const hash = '0x1234567890abcdef'
      const url = explorer.getTransactionUrl(hash)
      expect(url).toBe('https://explorer.fastset.xyz/txs/0x0x1234567890abcdef')
    })

    it('should handle different hash formats', () => {
      const hash = 'abc123def456'
      const url = explorer.getTransactionUrl(hash)
      expect(url).toBe('https://explorer.fastset.xyz/txs/0xabc123def456')
    })
  })

  describe('getAssetUrl', () => {
    it('should generate correct asset URL', () => {
      const identifier = 'SET'
      const url = explorer.getAssetUrl(identifier)
      expect(url).toBe('https://explorer.fastset.xyz/asset/0xSET')
    })

    it('should handle different asset identifiers', () => {
      const identifier = 'USDC'
      const url = explorer.getAssetUrl(identifier)
      expect(url).toBe('https://explorer.fastset.xyz/asset/0xUSDC')
    })
  })

  describe('getContractUrl', () => {
    it('should generate correct contract URL', () => {
      const address = 'set1contractaddress123456789'
      const url = explorer.getContractUrl(address)
      expect(url).toBe('https://explorer.fastset.xyz/account/set1contractaddress123456789')
    })

    it('should handle different contract addresses', () => {
      const address = 'set1anothercontractaddress987654321'
      const url = explorer.getContractUrl(address)
      expect(url).toBe('https://explorer.fastset.xyz/account/set1anothercontractaddress987654321')
    })
  })
})
