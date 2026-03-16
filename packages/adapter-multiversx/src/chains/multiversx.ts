import { WarpChainAsset, WarpChainName } from '@joai/warps'
import { createMultiversxAdapter } from './common'

export const NativeTokenEgld: WarpChainAsset = {
  chain: WarpChainName.Multiversx,
  identifier: 'EGLD',
  name: 'eGold',
  symbol: 'EGLD',
  decimals: 18,
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/egld.svg',
}

export const MultiversxAdapter = createMultiversxAdapter(WarpChainName.Multiversx, {
  mainnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api.multiversx.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
  testnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api.battleofnodes.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
  devnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
})
