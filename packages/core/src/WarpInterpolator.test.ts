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
  beforeEach(async () => {
    await new WarpCache('devnet', { type: 'memory' }).clear()
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

    it('preserves numeric zero query var from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          AMOUNT: 'query:amount',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{AMOUNT}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          amount: 0,
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0')
    })

    it('preserves string zero query var from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          AMOUNT: 'query:amount',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{AMOUNT}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          amount: '0',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0')
    })

    it('preserves numeric zero env var', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          COUNT: 'env:ITEM_COUNT',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{COUNT}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(warp, { envs: { ITEM_COUNT: 0 } })
      expect((result.actions[0] as WarpTransferAction).value).toBe('0')
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
  beforeEach(async () => {
    await new WarpCache('devnet', { type: 'memory' }).clear()
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

describe('WarpInterpolator applyInputs', () => {
  const serializer = {
    stringToNative: (value: string) => {
      const [type, val] = value.split(':')
      if (type === 'address') return [type, val]
      if (type === 'uint256') return [type, val]
      if (type === 'biguint') return [type, val]
      return [type, val]
    },
  } as any

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
})

describe('WarpInterpolator applyEnvs', () => {
  const interpolator = new WarpInterpolator(testConfig, createMockAdapter())

  const makeWarpWithWhen = (when: string) => ({
    ...createMockWarp(),
    actions: [
      {
        type: 'compute' as const,
        label: 'Test',
        when,
        inputs: [],
      },
    ],
  })

  const makeWarpWithModifier = (modifier: string) => ({
    ...createMockWarp(),
    actions: [
      {
        type: 'compute' as const,
        label: 'Test',
        inputs: [{ name: 'x', type: 'bool' as const, source: 'hidden' as const, modifier }],
      },
    ],
  })

  it('substitutes a simple env value into a when condition', () => {
    const warp = makeWarpWithWhen('{{state.active}} === true')
    const result = interpolator.applyEnvs(warp, { 'state.active': true })
    expect((result.actions[0] as any).when).toBe('true === true')
  })

  it('substitutes env values into input modifiers', () => {
    const warp = makeWarpWithModifier("transform:() => parseInt('{{JOAI_MESSAGE_TEXT}}') === {{state.secret}}")
    const result = interpolator.applyEnvs(warp, { JOAI_MESSAGE_TEXT: '3', 'state.secret': 3 })
    expect((result.actions[0] as any).inputs[0].modifier).toBe("transform:() => parseInt('3') === 3")
  })

  it('handles dotted keys without treating them as regex wildcards', () => {
    const warp = makeWarpWithWhen('{{state.active}} === true')
    const result = interpolator.applyEnvs(warp, { 'state.active': 'yes' })
    expect((result.actions[0] as any).when).toBe('yes === true')
  })

  it('JSON-safe escapes backslashes in values to prevent invalid JSON', () => {
    const warp = makeWarpWithModifier('transform:() => "{{PATH}}"')
    const result = interpolator.applyEnvs(warp, { PATH: 'C:\\Users\\file' })
    expect((result.actions[0] as any).inputs[0].modifier).toBe('transform:() => "C:\\Users\\file"')
  })

  it('leaves unknown placeholders intact', () => {
    const warp = makeWarpWithWhen('{{unknown}} === true')
    const result = interpolator.applyEnvs(warp, { other: 'value' })
    expect((result.actions[0] as any).when).toBe('{{unknown}} === true')
  })

  it('returns warp unchanged when envs is empty', () => {
    const warp = makeWarpWithWhen('{{state.active}} === true')
    const result = interpolator.applyEnvs(warp, {})
    expect(result).toBe(warp)
  })

  it('substitutes multiple env keys in a single string', () => {
    const warp = makeWarpWithModifier('transform:() => {{state.secret}} === parseInt("{{JOAI_MESSAGE_TEXT}}")')
    const result = interpolator.applyEnvs(warp, { 'state.secret': 4, JOAI_MESSAGE_TEXT: '4' })
    expect((result.actions[0] as any).inputs[0].modifier).toBe('transform:() => 4 === parseInt("4")')
  })

  it('skips null and undefined env values', () => {
    const warp = makeWarpWithWhen('{{KEY}} === true')
    const result = interpolator.applyEnvs(warp, { KEY: null as any, OTHER: undefined as any })
    expect((result.actions[0] as any).when).toBe('{{KEY}} === true')
  })

  it('apply() calls applyEnvs as final pass when meta.envs is provided', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'compute' as const,
          label: 'Test',
          when: '{{state.active}} === true',
          inputs: [],
        },
      ],
    }
    const result = await interpolator.apply(warp, { envs: { 'state.active': true } })
    expect((result.actions[0] as any).when).toBe('true === true')
  })
})

describe('WarpInterpolator chain-specific placeholders', () => {
  beforeEach(async () => {
    await new WarpCache('devnet', { type: 'memory' }).clear()
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
