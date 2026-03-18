import { WarpConstants } from './constants'
import { WarpActionInputPosition, WarpActionInputSource, WarpActionInputType, WarpChainEnv } from './types'

export const WarpProtocolVersions = {
  Warp: '3.0.0',
  Brand: '0.2.0',
  Abi: '0.1.0',
}

export const WarpConfig = {
  LatestWarpSchemaUrl: `https://raw.githubusercontent.com/JoAiHQ/warps-specs/refs/heads/main/schemas/v${WarpProtocolVersions.Warp}.schema.json`,
  LatestBrandSchemaUrl: `https://raw.githubusercontent.com/JoAiHQ/warps-specs/refs/heads/main/schemas/brand/v${WarpProtocolVersions.Brand}.schema.json`,

  DefaultClientUrl: (env: WarpChainEnv) => {
    if (env === 'devnet') return 'https://devnet.usewarp.to'
    if (env === 'testnet') return 'https://testnet.usewarp.to'
    return 'https://usewarp.to'
  },

  SuperClientUrls: ['https://usewarp.to', 'https://testnet.usewarp.to', 'https://devnet.usewarp.to'],

  AvailableActionInputSources: ['field', 'query', WarpConstants.Source.UserWallet, 'hidden'] as WarpActionInputSource[],

  AvailableActionInputTypes: ['string', 'uint8', 'uint16', 'uint32', 'uint64', 'biguint', 'boolean', 'address'] as WarpActionInputType[],

  AvailableActionInputPositions: [
    'receiver',
    'value',
    'transfer',
    'arg:1',
    'arg:2',
    'arg:3',
    'arg:4',
    'arg:5',
    'arg:6',
    'arg:7',
    'arg:8',
    'arg:9',
    'arg:10',
    'data',
    'ignore',
  ] as WarpActionInputPosition[],
}
