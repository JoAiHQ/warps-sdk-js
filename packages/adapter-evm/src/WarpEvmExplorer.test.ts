import { WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpEvmExplorer } from './WarpEvmExplorer'
import { ArbitrumExplorers, BaseExplorers, EthereumExplorers } from './constants'

describe('WarpEvmExplorer', () => {
  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Ethereum,
    chainId: '1',
    displayName: 'Ethereum',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://api.example.com',
    logoUrl: 'https://example.com/ethereum-logo.png',
    nativeToken: {
      chain: WarpChainName.Ethereum,
      identifier: 'ETH',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  }

  const arbitrumChainInfo: WarpChainInfo = {
    name: WarpChainName.Arbitrum,
    chainId: '42161',
    displayName: 'Arbitrum',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://api.arbitrum.com',
    logoUrl: 'https://example.com/arbitrum-logo.png',
    nativeToken: {
      chain: WarpChainName.Arbitrum,
      identifier: 'ARB',
      name: 'Arbitrum',
      symbol: 'ARB',
      decimals: 18,
    },
  }

  const baseChainInfo: WarpChainInfo = {
    name: WarpChainName.Base,
    chainId: '8453',
    displayName: 'Base',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://api.base.com',
    logoUrl: 'https://example.com/base-logo.png',
    nativeToken: {
      chain: WarpChainName.Ethereum,
      identifier: 'ETH',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      logoUrl: 'https://example.com/eth-logo.png',
    },
  }

  const mockConfig: WarpClientConfig = {
    env: 'mainnet',
  }

  describe('constructor', () => {
    it('should create explorer with default parameters', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      expect(explorer).toBeInstanceOf(WarpEvmExplorer)
    })
  })

  describe('getAccountUrl', () => {
    it('should return account URL with primary explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('etherscan.io')
    })

    it('should return account URL with specific explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', EthereumExplorers.Ethplorer)
      expect(url).toContain('/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('ethplorer.io')
    })

    it('should fallback to primary explorer when specific explorer not found', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 'NonExistentExplorer' as any)
      expect(url).toContain('/address/0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('etherscan.io')
    })

    it('should use user preference when available', () => {
      const customConfig: WarpClientConfig = {
        ...mockConfig,
        preferences: {
          explorers: {
            ethereum: EthereumExplorers.Ethplorer,
          },
        },
      }
      const explorer = new WarpEvmExplorer(mockChainInfo, customConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('ethplorer.io')
    })

    it('should override user preference when specific explorer is requested', () => {
      const customConfig: WarpClientConfig = {
        ...mockConfig,
        preferences: {
          explorers: {
            ethereum: EthereumExplorers.Ethplorer,
          },
        },
      }
      const explorer = new WarpEvmExplorer(mockChainInfo, customConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', EthereumExplorers.Blockscout)
      expect(url).toContain('blockscout.com')
    })
  })

  describe('getTransactionUrl', () => {
    it('should return transaction URL with primary explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getTransactionUrl('0x1234567890abcdef')
      expect(url).toContain('/tx/0x1234567890abcdef')
      expect(url).toContain('etherscan.io')
    })

    it('should return transaction URL with specific explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getTransactionUrl('0x1234567890abcdef', EthereumExplorers.Ethplorer)
      expect(url).toContain('/tx/0x1234567890abcdef')
      expect(url).toContain('ethplorer.io')
    })
  })

  describe('getBlockUrl', () => {
    it('should return block URL with primary explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getBlockUrl('12345')
      expect(url).toContain('/block/12345')
      expect(url).toContain('etherscan.io')
    })

    it('should return block URL with specific explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getBlockUrl('12345', EthereumExplorers.Ethplorer)
      expect(url).toContain('/block/12345')
      expect(url).toContain('ethplorer.io')
    })
  })

  describe('getAssetUrl', () => {
    it('should return asset URL with primary explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getAssetUrl('0x1234567890abcdef')
      expect(url).toContain('/token/0x1234567890abcdef')
      expect(url).toContain('etherscan.io')
    })

    it('should return asset URL with specific explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getAssetUrl('0x1234567890abcdef', EthereumExplorers.Ethplorer)
      expect(url).toContain('/token/0x1234567890abcdef')
      expect(url).toContain('ethplorer.io')
    })
  })

  describe('getContractUrl', () => {
    it('should return contract URL with primary explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getContractUrl('0x1234567890abcdef')
      expect(url).toContain('/address/0x1234567890abcdef')
      expect(url).toContain('etherscan.io')
    })

    it('should return contract URL with specific explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const url = explorer.getContractUrl('0x1234567890abcdef', EthereumExplorers.Ethplorer)
      expect(url).toContain('/address/0x1234567890abcdef')
      expect(url).toContain('ethplorer.io')
    })
  })

  describe('getAllExplorers', () => {
    it('should return all explorers for ethereum mainnet', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const explorers = explorer.getAllExplorers()
      expect(explorers).toContain(EthereumExplorers.Etherscan)
      expect(explorers).toContain(EthereumExplorers.Ethplorer)
      expect(explorers).toContain(EthereumExplorers.Blockscout)
    })

    it('should return all explorers for arbitrum mainnet', () => {
      const explorer = new WarpEvmExplorer(arbitrumChainInfo, mockConfig)
      const explorers = explorer.getAllExplorers()
      expect(explorers).toContain(ArbitrumExplorers.Arbiscan)
      expect(explorers).toContain(ArbitrumExplorers.BlockscoutArbitrum)
    })

    it('should return all explorers for base mainnet', () => {
      const explorer = new WarpEvmExplorer(baseChainInfo, mockConfig)
      const explorers = explorer.getAllExplorers()
      expect(explorers).toContain(BaseExplorers.Basescan)
      expect(explorers).toContain(BaseExplorers.BlockscoutBase)
    })
  })

  describe('getExplorerByName', () => {
    it('should return explorer by name', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const foundExplorer = explorer.getExplorerByName('Ethplorer')
      expect(foundExplorer).toBe(EthereumExplorers.Ethplorer)
    })

    it('should return undefined for non-existent explorer', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const foundExplorer = explorer.getExplorerByName('NonExistentExplorer')
      expect(foundExplorer).toBeUndefined()
    })

    it('should be case insensitive', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const foundExplorer = explorer.getExplorerByName('ethplorer')
      expect(foundExplorer).toBe(EthereumExplorers.Ethplorer)
    })
  })

  describe('getAccountUrls', () => {
    it('should return URLs for all explorers', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const urls = explorer.getAccountUrls('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(urls).toHaveProperty(EthereumExplorers.Etherscan)
      expect(urls).toHaveProperty(EthereumExplorers.Ethplorer)
      expect(urls).toHaveProperty(EthereumExplorers.Blockscout)
      expect(urls[EthereumExplorers.Etherscan]).toContain('etherscan.io/address/')
      expect(urls[EthereumExplorers.Ethplorer]).toContain('ethplorer.io/address/')
      expect(urls[EthereumExplorers.Blockscout]).toContain('blockscout.com/address/')
    })
  })

  describe('getTransactionUrls', () => {
    it('should return URLs for all explorers', () => {
      const explorer = new WarpEvmExplorer(mockChainInfo, mockConfig)
      const urls = explorer.getTransactionUrls('0x1234567890abcdef')
      expect(urls).toHaveProperty(EthereumExplorers.Etherscan)
      expect(urls).toHaveProperty(EthereumExplorers.Ethplorer)
      expect(urls).toHaveProperty(EthereumExplorers.Blockscout)
      expect(urls[EthereumExplorers.Etherscan]).toContain('etherscan.io/tx/')
      expect(urls[EthereumExplorers.Ethplorer]).toContain('ethplorer.io/tx/')
      expect(urls[EthereumExplorers.Blockscout]).toContain('blockscout.com/tx/')
    })
  })

  describe('different chains', () => {
    it('should work with arbitrum chain', () => {
      const explorer = new WarpEvmExplorer(arbitrumChainInfo, mockConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('arbiscan.io')
    })

    it('should work with base chain', () => {
      const explorer = new WarpEvmExplorer(baseChainInfo, mockConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('basescan.org')
    })
  })

  describe('different environments', () => {
    it('should work with testnet environment', () => {
      const testnetConfig = { ...mockConfig, env: 'testnet' as const }
      const explorer = new WarpEvmExplorer(mockChainInfo, testnetConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('sepolia.etherscan.io')
    })

    it('should work with devnet environment', () => {
      const devnetConfig = { ...mockConfig, env: 'devnet' as const }
      const explorer = new WarpEvmExplorer(mockChainInfo, devnetConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('sepolia.etherscan.io')
    })
  })

  describe('user preferences', () => {
    it('should use user preference for arbitrum', () => {
      const customConfig: WarpClientConfig = {
        ...mockConfig,
        preferences: {
          explorers: {
            arbitrum: ArbitrumExplorers.BlockscoutArbitrum,
          },
        },
      }
      const explorer = new WarpEvmExplorer(arbitrumChainInfo, customConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('arbitrum.blockscout.com')
    })

    it('should use user preference for base', () => {
      const customConfig: WarpClientConfig = {
        ...mockConfig,
        preferences: {
          explorers: {
            base: BaseExplorers.BlockscoutBase,
          },
        },
      }
      const explorer = new WarpEvmExplorer(baseChainInfo, customConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('base.blockscout.com')
    })

    it('should fallback to default when user preference is invalid', () => {
      const customConfig: WarpClientConfig = {
        ...mockConfig,
        preferences: {
          explorers: {
            ethereum: 'InvalidExplorer' as any,
          },
        },
      }
      const explorer = new WarpEvmExplorer(mockChainInfo, customConfig)
      const url = explorer.getAccountUrl('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
      expect(url).toContain('etherscan.io')
    })
  })
})
