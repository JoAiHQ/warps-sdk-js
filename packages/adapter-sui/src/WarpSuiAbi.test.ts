import { WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'

describe('WarpSuiAbiBuilder', () => {
  const config: WarpClientConfig = { env: 'devnet', currentUrl: 'https://fullnode.devnet.sui.io:443' }
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
  const abi = new WarpSuiAbiBuilder(config, chain)

  it('should instantiate WarpSuiAbiBuilder', () => {
    expect(abi).toBeInstanceOf(WarpSuiAbiBuilder)
  })
})
