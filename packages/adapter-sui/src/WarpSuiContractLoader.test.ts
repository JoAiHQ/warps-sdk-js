import { WarpChainInfo, WarpChainName } from '@joai/warps'
import { WarpSuiContractLoader } from './WarpSuiContractLoader'

describe('WarpSuiContractLoader', () => {
  const config = { env: 'devnet' as const }
  const chain: WarpChainInfo = {
    name: WarpChainName.Sui,
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    logoUrl: 'https://example.com/sui-chain-logo.png',
    nativeToken: {
      chain: WarpChainName.Sui,
      identifier: 'SUI',
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9,
      logoUrl: 'https://example.com/sui-logo.png',
    },
  }
  const loader = new WarpSuiContractLoader(config, chain)

  it('should instantiate WarpSuiContractLoader', () => {
    expect(loader).toBeInstanceOf(WarpSuiContractLoader)
  })

  it('should have loadModuleAbi and loadFunctionAbi methods', () => {
    expect(typeof loader.loadModuleAbi).toBe('function')
    expect(typeof loader.loadFunctionAbi).toBe('function')
  })
})
