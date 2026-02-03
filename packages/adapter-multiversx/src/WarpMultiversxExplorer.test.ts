import { WarpChainName, WarpClientConfig } from '@joai/warps'
import { ClawsExplorers, MultiversxExplorers } from './constants'
import { WarpMultiversxExplorer } from './WarpMultiversxExplorer'

describe('WarpMultiversxExplorer', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet',
    preferences: {
      explorers: {
        multiversx: 'multiversx_explorer',
      },
    },
  }

  let explorer: WarpMultiversxExplorer

  beforeEach(() => {
    explorer = new WarpMultiversxExplorer(WarpChainName.Multiversx, mockConfig)
  })

  describe('getAccountUrl', () => {
    it('should return correct account URL with default explorer', () => {
      const address = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getAccountUrl(address)
      expect(url).toBe('https://explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })

    it('should return correct account URL with specific explorer', () => {
      const address = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getAccountUrl(address, MultiversxExplorers.MultiversxExplorerDevnet)
      expect(url).toBe('https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })
  })

  describe('getTransactionUrl', () => {
    it('should return correct transaction URL with default explorer', () => {
      const hash = 'abc123def456'
      const url = explorer.getTransactionUrl(hash)
      expect(url).toBe('https://explorer.multiversx.com/transactions/abc123def456')
    })

    it('should return correct transaction URL with specific explorer', () => {
      const hash = 'abc123def456'
      const url = explorer.getTransactionUrl(hash, MultiversxExplorers.MultiversxExplorerTestnet)
      expect(url).toBe('https://testnet-explorer.multiversx.com/transactions/abc123def456')
    })
  })

  describe('getBlockUrl', () => {
    it('should return correct block URL with default explorer', () => {
      const blockNumber = '12345'
      const url = explorer.getBlockUrl(blockNumber)
      expect(url).toBe('https://explorer.multiversx.com/blocks/12345')
    })

    it('should return correct block URL with specific explorer', () => {
      const blockNumber = 12345
      const url = explorer.getBlockUrl(blockNumber, MultiversxExplorers.MultiversxExplorerDevnet)
      expect(url).toBe('https://devnet-explorer.multiversx.com/blocks/12345')
    })
  })

  describe('getAssetUrl', () => {
    it('should return correct asset URL with default explorer', () => {
      const identifier = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getAssetUrl(identifier)
      expect(url).toBe('https://explorer.multiversx.com/tokens/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })

    it('should return correct asset URL with specific explorer', () => {
      const identifier = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getAssetUrl(identifier, MultiversxExplorers.MultiversxExplorerTestnet)
      expect(url).toBe('https://testnet-explorer.multiversx.com/tokens/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })
  })

  describe('getContractUrl', () => {
    it('should return correct contract URL with default explorer', () => {
      const contractAddress = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getContractUrl(contractAddress)
      expect(url).toBe('https://explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })

    it('should return correct contract URL with specific explorer', () => {
      const contractAddress = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = explorer.getContractUrl(contractAddress, MultiversxExplorers.MultiversxExplorerDevnet)
      expect(url).toBe('https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })
  })

  describe('getAllExplorers', () => {
    it('should return all available explorers for multiversx chain', () => {
      const explorers = explorer.getAllExplorers()
      expect(explorers).toContain(MultiversxExplorers.MultiversxExplorer)
    })

    it('should return fallback explorer when chain is not supported', () => {
      const unsupportedExplorer = new WarpMultiversxExplorer('unsupported-chain' as WarpChainName, mockConfig)
      const explorers = unsupportedExplorer.getAllExplorers()
      expect(explorers).toEqual(['multiversx_explorer'])
    })
  })

  describe('getExplorerByName', () => {
    it('should return explorer by name', () => {
      const explorerName = explorer.getExplorerByName('multiversx_explorer')
      expect(explorerName).toBe(MultiversxExplorers.MultiversxExplorer)
    })

    it('should return undefined for non-existent explorer', () => {
      const explorerName = explorer.getExplorerByName('non_existent_explorer')
      expect(explorerName).toBeUndefined()
    })
  })

  describe('getAccountUrls', () => {
    it('should return URLs for all explorers', () => {
      const address = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const urls = explorer.getAccountUrls(address)

      expect(urls[MultiversxExplorers.MultiversxExplorer]).toBe(
        'https://explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      )
    })
  })

  describe('getTransactionUrls', () => {
    it('should return URLs for all explorers', () => {
      const hash = 'abc123def456'
      const urls = explorer.getTransactionUrls(hash)

      expect(urls[MultiversxExplorers.MultiversxExplorer]).toBe('https://explorer.multiversx.com/transactions/abc123def456')
    })
  })

  describe('with testnet environment', () => {
    const testnetConfig: WarpClientConfig = {
      env: 'testnet',
      preferences: {
        explorers: {
          multiversx: 'multiversx_explorer_testnet',
        },
      },
    }

    let testnetExplorer: WarpMultiversxExplorer

    beforeEach(() => {
      testnetExplorer = new WarpMultiversxExplorer(WarpChainName.Multiversx, testnetConfig)
    })

    it('should return correct testnet explorer URLs', () => {
      const address = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = testnetExplorer.getAccountUrl(address, MultiversxExplorers.MultiversxExplorerTestnet)
      expect(url).toBe('https://testnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })

    it('should return all testnet explorers', () => {
      const explorers = testnetExplorer.getAllExplorers()
      expect(explorers).toContain(MultiversxExplorers.MultiversxExplorerTestnet)
    })
  })

  describe('with claws', () => {
    const clawsConfig: WarpClientConfig = {
      env: 'mainnet',
      preferences: {
        explorers: {
          claws: 'claws_explorer',
        },
      },
    }

    let clawsExplorer: WarpMultiversxExplorer

    beforeEach(() => {
      clawsExplorer = new WarpMultiversxExplorer(WarpChainName.Claws, clawsConfig)
    })

    it('should return correct claws explorer URLs', () => {
      const address = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      const url = clawsExplorer.getAccountUrl(address, ClawsExplorers.ClawsExplorer)
      expect(url).toBe('https://explorer.claws.network/accounts/erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36')
    })

    it('should return all claws explorers', () => {
      const explorers = clawsExplorer.getAllExplorers()
      expect(explorers).toContain(ClawsExplorers.ClawsExplorer)
    })
  })
})
