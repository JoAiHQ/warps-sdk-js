import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import { InterpolationBag, WarpIdentifierType } from './types'
import { WarpWalletProvider } from './types/config'

export enum WarpChainName {
  Multiversx = 'multiversx',
  Claws = 'claws',
  Sui = 'sui',
  Ethereum = 'ethereum',
  Base = 'base',
  Arbitrum = 'arbitrum',
  Polygon = 'polygon',
  Somnia = 'somnia',
  Fastset = 'fastset',
  Solana = 'solana',
  Near = 'near',
}

export const EvmWalletChainNames: WarpChainName[] = [
  WarpChainName.Ethereum,
  WarpChainName.Base,
  WarpChainName.Arbitrum,
  WarpChainName.Polygon,
  WarpChainName.Somnia,
]

export const CLOUD_WALLET_PROVIDERS: WarpWalletProvider[] = ['coinbase', 'privy', 'gaupa']

export const WarpConstants = {
  HttpProtocolPrefix: 'https://',

  IdentifierParamName: 'warp',

  IdentifierParamSeparator: ':',

  IdentifierChainDefault: WarpChainName.Multiversx,

  IdentifierType: {
    Alias: 'alias' as WarpIdentifierType,
    Hash: 'hash' as WarpIdentifierType,
  },

  IdentifierAliasMarker: '@',

  Globals: {
    UserWallet: {
      Placeholder: 'USER_WALLET',
      Accessor: (bag: InterpolationBag) => getWarpWalletAddressFromConfig(bag.config, bag.adapter.chainInfo.name),
    },
    UserWalletPublicKey: {
      Placeholder: 'USER_WALLET_PUBLICKEY',
      Accessor: (bag: InterpolationBag) => {
        if (!bag.adapter.wallet) return null
        try {
          return bag.adapter.wallet.getPublicKey() || null
        } catch {
          return null
        }
      },
    },
    ChainApiUrl: {
      Placeholder: 'CHAIN_API',
      Accessor: (bag: InterpolationBag) => bag.adapter.chainInfo.defaultApiUrl,
    },
    ChainAddressHrp: {
      Placeholder: 'CHAIN_ADDRESS_HRP',
      Accessor: (bag: InterpolationBag) => bag.adapter.chainInfo.addressHrp,
    },
  },

  Vars: {
    Query: 'query',
    Env: 'env',
  },

  ArgParamsSeparator: ':',
  ArgCompositeSeparator: '|',
  ArgListSeparator: ',',
  ArgStructSeparator: ';',

  Transform: {
    Prefix: 'transform:',
  },

  Source: {
    UserWallet: 'user:wallet',
  },

  Position: {
    Payload: 'payload:',
  },

  Alerts: {
    TriggerEventPrefix: 'event',
  },
}

export const WarpInputTypes = {
  Option: 'option',
  Vector: 'vector',
  Tuple: 'tuple',
  Struct: 'struct',
  String: 'string',
  Uint8: 'uint8',
  Uint16: 'uint16',
  Uint32: 'uint32',
  Uint64: 'uint64',
  Uint128: 'uint128',
  Uint256: 'uint256',
  Biguint: 'biguint',
  Bool: 'bool',
  Address: 'address',
  Asset: 'asset',
  Hex: 'hex',
}

export const safeWindow = typeof window !== 'undefined' ? window : ({ open: () => {} } as Window)
