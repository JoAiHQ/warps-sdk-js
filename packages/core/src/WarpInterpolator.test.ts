import { WarpChainName } from './constants'
import { createMockAdapter, createMockChainInfo, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { WarpTransferAction } from './types'
import { WarpCache } from './WarpCache'
import { WarpInterpolator } from './WarpInterpolator'

const testConfig = createMockConfig({
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: { wallets: { multiversx: 'erd1abc' } },
  schema: {
    warp: 'https://schema.warp.to/warp.json',
    brand: 'https://schema.warp.to/brand.json',
  },
})

const mockAdapter = {
  ...createMockAdapter(),
  chain: 'devnet',
  builder: {
    createInscriptionTransaction: jest.fn(),
    createFromTransaction: jest.fn(),
    createFromTransactionHash: jest.fn().mockResolvedValue(null),
  },
  registry: {
    createWarpRegisterTransaction: jest.fn(),
    createWarpUnregisterTransaction: jest.fn(),
    createWarpUpgradeTransaction: jest.fn(),
    createWarpAliasSetTransaction: jest.fn(),
    createWarpVerifyTransaction: jest.fn(),
    createWarpTransferOwnershipTransaction: jest.fn(),
    createBrandRegisterTransaction: jest.fn(),
    createWarpBrandingTransaction: jest.fn(),
    getInfoByAlias: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getInfoByHash: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getUserWarpRegistryInfos: jest.fn().mockResolvedValue([]),
    getUserBrands: jest.fn().mockResolvedValue([]),
    getChainInfos: jest.fn().mockResolvedValue([]),
    getChainInfo: jest.fn().mockResolvedValue(createMockChainInfo(WarpChainName.Multiversx)),
    setChain: jest.fn().mockResolvedValue({}),
    removeChain: jest.fn().mockResolvedValue({}),
    fetchBrand: jest.fn().mockResolvedValue(null),
  },
  executor: {
    createTransaction: jest.fn(),
    preprocessInput: jest.fn(),
  },
  output: {
    getTransactionExecutionResults: jest.fn(),
  },
  serializer: {
    typedToString: jest.fn(),
    typedToNative: jest.fn(),
    nativeToTyped: jest.fn(),
    nativeToType: jest.fn(),
    stringToTyped: jest.fn(),
  },
}

describe('WarpInterpolator', () => {
  beforeEach(() => {
    new WarpCache('devnet', { type: 'memory' }).clear()
  })

  describe('apply', () => {
    it('interpolates basic warp', async () => {
      const warp = createMockWarp()
      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect(result).toBeDefined()
    })

    it('interpolates warp with variables', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          USER_ADDRESS: 'erd1...',
          AMOUNT: '1000',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: '{{USER_ADDRESS}}',
            value: '{{AMOUNT}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }
      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).address).toBe('erd1...')
      expect((result.actions[0] as WarpTransferAction).value).toBe('1000')
    })

    it('interpolates actions with chain info', async () => {
      const warp = {
        ...createMockWarp(),
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer A',
            chain: 'A',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
          {
            type: 'transfer' as const,
            label: 'Transfer B',
            chain: 'B',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const chainA = createMockChainInfo('A' as WarpChainName)
      const chainB = createMockChainInfo('B' as WarpChainName)

      const mockRepository = {
        ...createMockAdapter(),
        registry: {
          ...createMockAdapter().registry,
          getChainInfo: jest.fn().mockImplementation((chain: string) => {
            if (chain === 'A') return Promise.resolve(chainA)
            if (chain === 'B') return Promise.resolve(chainB)
            return Promise.resolve(null)
          }),
        },
      }

      const interpolator = new WarpInterpolator(testConfig, mockRepository)
      const result = await interpolator.apply(warp)

      expect((result.actions[0] as WarpTransferAction).address).toBe('erd...')
      expect((result.actions[1] as WarpTransferAction).address).toBe('erd...')
    })

    it('handles missing chain info gracefully', async () => {
      const warp = {
        ...createMockWarp(),
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            chain: 'unknown',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect(result).toBeDefined()
    })

    it('interpolates env vars with descriptions', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from the xMoney Merchant Dashboard',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'secret-api-key-123',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('secret-api-key-123')
    })

    it('interpolates env vars with descriptions using secrets parameter', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from the xMoney Merchant Dashboard',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const secrets = {
        XMONEY_API_KEY: 'secret-api-key-from-secrets-456',
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, { envs: secrets })
      expect((result.actions[0] as WarpTransferAction).value).toBe('secret-api-key-from-secrets-456')
    })

    it('interpolates env vars without descriptions', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'simple-api-key-789',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('simple-api-key-789')
    })

    it('handles env vars with multiple pipe characters in description', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from xMoney|Additional info|More details',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'multi-pipe-api-key',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('multi-pipe-api-key')
    })

    it('handles env vars with empty description', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'empty-desc-api-key',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('empty-desc-api-key')
    })
  })

  describe('query params from meta', () => {
    it('interpolates query vars from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
          AMOUNT: 'query:amount',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: '0x1234567890abcdef',
          amount: '1000000',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0x1234567890abcdef')
    })

    it('prioritizes meta.queries over URL query params', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithUrl = {
        ...testConfig,
        currentUrl: 'https://example.com?token=url-token-value',
      }

      const meta = {
        queries: {
          token: 'meta-token-value',
        },
      }

      const interpolator = new WarpInterpolator(configWithUrl, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('meta-token-value')
    })

    it('falls back to URL query params when meta.queries is not provided', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithUrl = {
        ...testConfig,
        currentUrl: 'https://example.com?token=url-token-value',
      }

      const interpolator = new WarpInterpolator(configWithUrl, createMockAdapter())
      const result = await interpolator.apply(warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('url-token-value')
    })

    it('handles missing query params gracefully', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:nonexistent',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: 'existing-token',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('{{TOKEN_ADDRESS}}')
    })

    it('interpolates query vars with descriptions from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token|The contract address of the token to deposit.',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: '0x1234567890abcdef',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0x1234567890abcdef')
    })
  })
})

describe('WarpInterpolator per-action chain info', () => {
  beforeEach(() => {
    new WarpCache('devnet', { type: 'memory' }).clear()
  })

  it('interpolates actions with different chain info', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer A',
          chain: 'A',
          address: '{{CHAIN_ADDRESS_HRP}}...',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
        {
          type: 'transfer' as const,
          label: 'Transfer B',
          chain: 'B',
          address: '{{CHAIN_ADDRESS_HRP}}...',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const chainA = createMockChainInfo('A' as WarpChainName)
    const chainB = createMockChainInfo('B' as WarpChainName)

    const mockRepository = {
      ...createMockAdapter(),
      registry: {
        ...createMockAdapter().registry,
        getChainInfo: jest.fn().mockImplementation((chain: string) => {
          if (chain === 'A') return Promise.resolve(chainA)
          if (chain === 'B') return Promise.resolve(chainB)
          return Promise.resolve(null)
        }),
      },
    }

    const interpolator = new WarpInterpolator(testConfig, mockRepository)
    const result = await interpolator.apply(warp)

    expect((result.actions[0] as WarpTransferAction).address).toBe('erd...')
    expect((result.actions[1] as WarpTransferAction).address).toBe('erd...')
  })
})

describe('WarpInterpolator applyInputs with primary inputs', () => {
  const serializer = {
    stringToNative: (value: string) => {
      const [type, val] = value.split(':')
      if (type === 'address') return [type, val]
      if (type === 'uint256') return [type, val]
      if (type === 'biguint') return [type, val]
      return [type, val]
    },
  } as any

  it('interpolates primary input references', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
      {
        input: { name: 'Token', as: 'TOKEN', type: 'address' },
        value: 'address:erd1token',
      },
    ]

    const result = interpolator.applyInputs('{{primary.AMOUNT}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('1000')
  })

  it('interpolates multiple primary input references', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
      {
        input: { name: 'Token', as: 'TOKEN', type: 'address' },
        value: 'address:erd1token',
      },
    ]

    const result = interpolator.applyInputs(
      'address:{{BRIDGE}},amount:{{primary.AMOUNT}},token:{{primary.TOKEN}}',
      resolvedInputs,
      serializer,
      primaryInputs
    )
    expect(result).toBe('address:,amount:1000,token:erd1token')
  })

  it('interpolates both regular and primary input references', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = [
      {
        input: { name: 'Bridge', as: 'BRIDGE', type: 'address' },
        value: 'address:erd1bridge',
      },
    ]
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
    ]

    const result = interpolator.applyInputs('{{BRIDGE}},{{primary.AMOUNT}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('erd1bridge,1000')
  })

  it('handles primary input references when primary inputs are not provided', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []

    const result = interpolator.applyInputs('{{primary.AMOUNT}}', resolvedInputs, serializer)
    expect(result).toBe('')
  })

  it('interpolates primary input by name when as is not present', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', type: 'uint256' },
        value: 'uint256:1000',
      },
    ]

    const result = interpolator.applyInputs('{{primary.Amount}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('1000')
  })

  it('handles primary input with null value', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'AMOUNT', type: 'uint256' },
        value: null,
      },
    ]

    const result = interpolator.applyInputs('{{primary.AMOUNT}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('')
  })

  it('interpolates primary input by name when as is not present', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
    ]

    const result = interpolator.applyInputs('{{primary.AMOUNT}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('1000')
  })

  it('prefers as over name when both are present', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'TOKEN_AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
    ]

    const result = interpolator.applyInputs('{{primary.TOKEN_AMOUNT}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('1000')
  })

  it('interpolates regular input by name when as is not present', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = [
      {
        input: { name: 'AMOUNT', type: 'uint256' },
        value: 'uint256:500',
      },
    ]

    const result = interpolator.applyInputs('{{AMOUNT}}', resolvedInputs, serializer)
    expect(result).toBe('500')
  })

  it('interpolates regular input with lowercase as field', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = [
      {
        input: { name: 'Amount', as: 'amount', type: 'uint256' },
        value: 'uint256:500',
      },
    ]

    const result = interpolator.applyInputs('{{amount}}', resolvedInputs, serializer)
    expect(result).toBe('500')
  })

  it('interpolates with mixed case', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = [
      {
        input: { name: 'Amount', as: 'TokenAmount', type: 'uint256' },
        value: 'uint256:500',
      },
    ]

    const result = interpolator.applyInputs('{{TokenAmount}}', resolvedInputs, serializer)
    expect(result).toBe('500')
  })

  it('interpolates nested asset properties token and amount', () => {
    const assetSerializer = {
      stringToNative: (value: string) => {
        const [type, val] = value.split(':')
        if (type === 'asset') {
          const [identifier, amount] = val.split('|')
          return [type, { identifier, amount: BigInt(amount) }]
        }
        return [type, val]
      },
      nativeToString: (type: string, value: any) => {
        if (type === 'address') return `address:${value}`
        if (type === 'uint256') return `uint256:${String(value)}`
        return `${type}:${String(value)}`
      },
    } as any

    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: {
          name: 'Asset',
          as: 'asset',
          type: 'asset',
          position: { token: 'arg:1', amount: 'arg:2' },
        },
        value: 'asset:EGLD|1',
      },
    ]

    const result = interpolator.applyInputs(
      '{{primary.asset.token}},{{primary.asset.amount}}',
      resolvedInputs,
      assetSerializer,
      primaryInputs
    )
    expect(result).toBe('EGLD,1')
  })

  it('interpolates nested asset properties with different alias', () => {
    const assetSerializer = {
      stringToNative: (value: string) => {
        const [type, val] = value.split(':')
        if (type === 'asset') {
          const [identifier, amount] = val.split('|')
          return [type, { identifier, amount: BigInt(amount) }]
        }
        return [type, val]
      },
      nativeToString: (type: string, value: any) => {
        if (type === 'address') return `address:${value}`
        if (type === 'uint256') return `uint256:${String(value)}`
        return `${type}:${String(value)}`
      },
    } as any

    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: {
          name: 'Asset',
          as: 'ASSET',
          type: 'asset',
          position: { token: 'arg:1', amount: 'arg:2' },
        },
        value: 'asset:USDC|500000000',
      },
    ]

    const result = interpolator.applyInputs(
      '{{primary.ASSET.token}},{{primary.ASSET.amount}}',
      resolvedInputs,
      assetSerializer,
      primaryInputs
    )
    expect(result).toBe('USDC,500000000')
  })

  it('does not add nested properties for non-asset types', () => {
    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: { name: 'Amount', as: 'AMOUNT', type: 'uint256' },
        value: 'uint256:1000',
      },
    ]

    const result = interpolator.applyInputs('{{primary.AMOUNT.token}}', resolvedInputs, serializer, primaryInputs)
    expect(result).toBe('')
  })

  it('does not add nested properties for asset without object position', () => {
    const assetSerializer = {
      stringToNative: (value: string) => {
        const [type, val] = value.split(':')
        if (type === 'asset') {
          const [identifier, amount] = val.split('|')
          return [type, { identifier, amount: BigInt(amount) }]
        }
        return [type, val]
      },
    } as any

    const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
    const resolvedInputs: any[] = []
    const primaryInputs: any[] = [
      {
        input: {
          name: 'Asset',
          as: 'asset',
          type: 'asset',
          position: 'arg:1',
        },
        value: 'asset:EGLD|1',
      },
    ]

    const result = interpolator.applyInputs('{{primary.asset.token}}', resolvedInputs, assetSerializer, primaryInputs)
    expect(result).toBe('')
  })
})

describe('WarpInterpolator chain-specific placeholders', () => {
  beforeEach(() => {
    new WarpCache('devnet', { type: 'memory' }).clear()
  })

  const createMockAdapterForChain = (chainName: string, walletAddress?: string, publicKey?: string) => {
    const adapter = createMockAdapter()
    adapter.chainInfo = createMockChainInfo(chainName as WarpChainName)
    adapter.chainInfo.name = chainName as WarpChainName
    if (walletAddress) {
      adapter.wallet = {
        ...adapter.wallet,
        getAddress: () => walletAddress,
        getPublicKey: () => publicKey || walletAddress,
      } as any
    }
    return adapter
  }

  it('interpolates USER_WALLET without chain argument', async () => {
    const config = createMockConfig({
      user: {
        wallets: {
          multiversx: 'erd1multiversx',
        },
      },
    })
    const adapter = createMockAdapterForChain('multiversx')
    const adapters = [adapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET}}',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, adapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1multiversx')
  })

  it('interpolates USER_WALLET from wallet details', async () => {
    const config = createMockConfig({
      user: {
        wallets: {
          multiversx: {
            provider: 'gaupa',
            address: 'erd1multiversx',
          },
        },
      },
    })
    const adapter = createMockAdapterForChain('multiversx')
    const adapters = [adapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET}}',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, adapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1multiversx')
  })

  it('interpolates USER_WALLET with chain argument', async () => {
    const config = createMockConfig({
      user: {
        wallets: {
          multiversx: 'erd1multiversx',
          fastset: 'erd1fastset',
        },
      },
    })
    const multiversxAdapter = createMockAdapterForChain('multiversx')
    const fastsetAdapter = createMockAdapterForChain('fastset')
    const adapters = [multiversxAdapter, fastsetAdapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET:fastset}}',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, multiversxAdapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1fastset')
  })

  it('interpolates USER_WALLET_PUBLICKEY without chain argument', async () => {
    const config = createMockConfig()
    const adapter = createMockAdapterForChain('multiversx', 'erd1address', 'erd1publickey')
    const adapters = [adapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET_PUBLICKEY}}',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, adapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1publickey')
  })

  it('interpolates USER_WALLET_PUBLICKEY with chain argument', async () => {
    const config = createMockConfig()
    const multiversxAdapter = createMockAdapterForChain('multiversx', 'erd1multiversx', 'erd1multiversxkey')
    const fastsetAdapter = createMockAdapterForChain('fastset', 'erd1fastset', 'erd1fastsetkey')
    const adapters = [multiversxAdapter, fastsetAdapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET_PUBLICKEY:fastset}}',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, multiversxAdapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1fastsetkey')
  })

  it('interpolates multiple chain-specific placeholders in same action', async () => {
    const config = createMockConfig({
      user: {
        wallets: {
          multiversx: 'erd1multiversx',
          fastset: 'erd1fastset',
        },
      },
    })
    const multiversxAdapter = createMockAdapterForChain('multiversx', 'erd1multiversx', 'erd1multiversxkey')
    const fastsetAdapter = createMockAdapterForChain('fastset', 'erd1fastset', 'erd1fastsetkey')
    const adapters = [multiversxAdapter, fastsetAdapter]

    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer',
          address: '{{USER_WALLET:fastset}}',
          value: '{{USER_WALLET_PUBLICKEY:multiversx}}',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const interpolator = new WarpInterpolator(config, multiversxAdapter, adapters)
    const result = await interpolator.apply(warp)
    expect((result.actions[0] as WarpTransferAction).address).toBe('erd1fastset')
    expect((result.actions[0] as WarpTransferAction).value).toBe('erd1multiversxkey')
  })
})
