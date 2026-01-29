import { WarpChainName, WarpConstants } from './constants'
import { getNextInfo } from './helpers'
import { createMockAdapter, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { TransformRunner, WarpAction, WarpChainInfo, WarpClientConfig, WarpContractAction, WarpMcpAction } from './types'
import { WarpFactory } from './WarpFactory'
import { WarpInterpolator } from './WarpInterpolator'

const testConfig: WarpClientConfig = {
  env: 'devnet',
  user: { wallets: { multiversx: 'erd1...' } },
  clientUrl: 'https://devnet.usewarp.to',
  currentUrl: 'https://devnet.usewarp.to',
}

describe('getNextInfo', () => {
  it('returns info for a basic warp', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Amywarp')
  })

  it('returns info for a warp with next', () => {
    const warp = {
      ...createMockWarp(),
      next: 'next-warp',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Anext-warp')
  })

  it('returns info for a warp with hash', () => {
    const warp = {
      ...createMockWarp(),
      next: 'hash:123',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Ahash%3A123')
  })

  it('returns info for a warp with query params', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Amywarp?param1=value1&param2=value2')
  })

  it('returns info for multiple results', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?address={{address[]}}',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, { address: ['ABC', 'DEF'] })
    expect(result).toEqual([
      { identifier: 'mywarp?address=ABC', url: 'https://devnet.usewarp.to/multiversx%3Amywarp?address=ABC' },
      { identifier: 'mywarp?address=DEF', url: 'https://devnet.usewarp.to/multiversx%3Amywarp?address=DEF' },
    ])
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(config, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://usewarp.to/multiversx%3Amywarp?param1=value1&param2=value2')
  })
})

describe('WarpFactory', () => {
  const config = createMockConfig({
    user: { wallets: { multiversx: 'erd1testwallet' } },
    currentUrl: 'https://example.com?foo=bar',
  })
  const chain: WarpChainInfo = {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api',
    logoUrl: 'https://example.com/multiversx.png',
    nativeToken: {
      chain: WarpChainName.Multiversx,
      identifier: 'EGLD',
      name: 'MultiversX',
      symbol: 'EGLD',
      decimals: 18,
      logoUrl: 'https://example.com/egld-logo.png',
    },
  }

  beforeEach(() => {
    // No mocking needed for these tests
  })
  afterEach(() => {
    // No cleanup needed
  })

  it('createExecutable returns expected structure', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test',
          address: 'erd1dest',
          value: '42',
          inputs: [
            { name: 'receiver', type: 'address', position: 'arg:1', source: 'field' },
            { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1dest', 'biguint:123'])
    expect(result.destination).toBe('erd1dest')
    expect(result.value).toBe(BigInt(123))
    expect(result.args.length).toBeGreaterThan(0)
  })

  it('interpolates input variables in contract action address', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'contract',
          label: 'Test Contract',
          address: '{{CONTRACT_ADDRESS}}',
          func: 'transfer',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'Contract Address', as: 'CONTRACT_ADDRESS', type: 'address', source: 'field' }],
        } as WarpContractAction,
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1contract123'])
    expect(result.destination).toBe('erd1contract123')
  })

  it('interpolates input variables in transfer action address', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: '{{RECIPIENT}}',
          value: '0',
          inputs: [{ name: 'Recipient', as: 'RECIPIENT', type: 'address', source: 'field' }],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1recipient456')
  })

  it('interpolates input variables by name when as field is not present', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: '{{Recipient}}',
          value: '0',
          inputs: [{ name: 'Recipient', type: 'address', source: 'field' }],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1recipient456')
  })

  it('interpolates input variables with lowercase as field', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: '{{recipient}}',
          value: '0',
          inputs: [{ name: 'Recipient', as: 'recipient', type: 'address', source: 'field' }],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1recipient456')
  })

  it('getResolvedInputs resolves query and user wallet', async () => {
    const adapter = createMockAdapter()
    const factory = new WarpFactory(config, [adapter])
    const interpolator = new WarpInterpolator(config, adapter, [adapter])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [
        { name: 'foo', type: 'string', source: 'query' } as any,
        { name: 'wallet', type: 'address', source: WarpConstants.Source.UserWallet } as any,
      ],
    }
    const result = await factory.getResolvedInputs(WarpChainName.Multiversx, action, ['string:ignored', 'address:ignored'], interpolator)
    expect(result[0].value).toBe('string:ignored')
    expect(result[1].value).toBe('address:erd1testwallet')
  })

  it('getResolvedInputs falls back to query params when no input args provided', async () => {
    const configWithQuery = createMockConfig({
      user: { wallets: { multiversx: 'erd1testwallet' } },
      currentUrl: 'https://example.com?RECIPIENT=erd1recipient&amount=100',
    })
    const adapter = createMockAdapter()
    const factory = new WarpFactory(configWithQuery, [adapter])
    const interpolator = new WarpInterpolator(configWithQuery, adapter, [adapter])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [
        { name: 'Recipient', as: 'RECIPIENT', type: 'address', source: 'field' } as any,
        { name: 'amount', type: 'string', source: 'field' } as any,
      ],
    }
    const result = await factory.getResolvedInputs(WarpChainName.Multiversx, action, [], interpolator)
    expect(result[0].value).toBe('address:erd1recipient')
    expect(result[1].value).toBe('string:100')
  })

  it('getResolvedInputs uses input args over query params when provided', async () => {
    const configWithQuery = createMockConfig({
      user: { wallets: { multiversx: 'erd1testwallet' } },
      currentUrl: 'https://example.com?RECIPIENT=erd1fromquery',
    })
    const adapter = createMockAdapter()
    const factory = new WarpFactory(configWithQuery, [adapter])
    const interpolator = new WarpInterpolator(configWithQuery, adapter, [adapter])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [{ name: 'Recipient', as: 'RECIPIENT', type: 'address', source: 'field' } as any],
    }
    const result = await factory.getResolvedInputs(WarpChainName.Multiversx, action, ['address:erd1fromargs'], interpolator)
    expect(result[0].value).toBe('address:erd1fromargs')
  })

  it('getResolvedInputs interpolates globals in input values', async () => {
    const config = createMockConfig()
    const adapter = createMockAdapter()
    const factory = new WarpFactory(config, [adapter])
    const interpolator = new WarpInterpolator(config, adapter, [adapter])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [{ name: 'wallet', type: 'address', source: 'field' } as any],
    }

    const result = await factory.getResolvedInputs(WarpChainName.Multiversx, action, ['address:{{USER_WALLET}}'], interpolator)
    expect(result[0].value).toBe('address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
  })

  it('getResolvedInputs interpolates USER_WALLET from wallet details', async () => {
    const config = createMockConfig({
      user: {
        wallets: {
          multiversx: {
            provider: 'gaupa',
            address: 'erd1walletdetails',
          },
        },
      },
    })
    const adapter = createMockAdapter()
    const factory = new WarpFactory(config, [adapter])
    const interpolator = new WarpInterpolator(config, adapter, [adapter])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [{ name: 'wallet', type: 'address', source: 'field' } as any],
    }

    const result = await factory.getResolvedInputs(WarpChainName.Multiversx, action, ['address:{{USER_WALLET}}'], interpolator)
    expect(result[0].value).toBe('address:erd1walletdetails')
  })

  it('getModifiedInputs applies scale modifier', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const inputs = [{ input: { name: 'amount', type: 'biguint', modifier: 'scale:2' }, value: 'biguint:5' }]
    const result = await factory.getModifiedInputs(inputs as any)
    expect(result[0].value).toBe('biguint:500')
  })

  describe('getModifiedInputs with transform modifier', () => {
    const createMockTransformRunner = (): TransformRunner => ({
      run: async (code: string, context: any) => {
        const fn = eval(code)
        return typeof fn === 'function' ? fn(context) : fn
      },
    })

    it('applies transform modifier for simple math multiplication', async () => {
      const transformRunner = createMockTransformRunner()
      const configWithTransform = createMockConfig({ transform: { runner: transformRunner } })
      const factory = new WarpFactory(configWithTransform, [createMockAdapter()])

      const inputs = [
        {
          input: { name: 'Value', type: 'uint256', modifier: 'transform:(inputs) => inputs.Value ? inputs.Value * 3n : 0n' },
          value: 'uint256:10',
        },
      ]

      const result = await factory.getModifiedInputs(inputs as any)
      expect(result[0].value).toBe('uint256:30')
    })

    it('applies transform modifier to asset input', async () => {
      const transformRunner = createMockTransformRunner()
      const configWithTransform = createMockConfig({ transform: { runner: transformRunner } })
      const factory = new WarpFactory(configWithTransform, [createMockAdapter()])

      const inputs = [
        {
          input: {
            name: 'Asset',
            as: 'asset',
            type: 'asset',
            modifier:
              'transform:(inputs) => inputs.asset?.identifier === "ETH" ? {identifier: "0x0000000000000000000000000000000000000000", amount: inputs.asset.amount} : inputs.asset',
          },
          value: 'asset:ETH|1000000000000000000',
        },
      ]

      const result = await factory.getModifiedInputs(inputs as any)
      expect(result[0].value).toBe('asset:0x0000000000000000000000000000000000000000|1000000000000000000')
    })

    it('applies transform modifier accessing previous inputs', async () => {
      const transformRunner = createMockTransformRunner()
      const configWithTransform = createMockConfig({ transform: { runner: transformRunner } })
      const factory = new WarpFactory(configWithTransform, [createMockAdapter()])

      const inputs = [
        {
          input: { name: 'Amount', type: 'uint256' },
          value: 'uint256:100',
        },
        {
          input: { name: 'Multiplier', type: 'uint256', modifier: 'transform:(inputs) => inputs.Amount ? inputs.Amount * 2n : 1n' },
          value: 'uint256:5',
        },
      ]

      const result = await factory.getModifiedInputs(inputs as any)
      expect(result[1].value).toBe('uint256:200')
    })

    it('applies transform modifier to non-ETH asset without modification', async () => {
      const transformRunner = createMockTransformRunner()
      const configWithTransform = createMockConfig({ transform: { runner: transformRunner } })
      const factory = new WarpFactory(configWithTransform, [createMockAdapter()])

      const inputs = [
        {
          input: {
            name: 'Asset',
            as: 'asset',
            type: 'asset',
            modifier:
              'transform:(inputs) => inputs.asset?.identifier === "ETH" ? {identifier: "0x0000000000000000000000000000000000000000", amount: inputs.asset.amount} : inputs.asset',
          },
          value: 'asset:USDC-123|1000000',
        },
      ]

      const result = await factory.getModifiedInputs(inputs as any)
      expect(result[0].value).toBe('asset:USDC-123|1000000')
    })

    it('throws error when transform modifier is used without transform runner', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const inputs = [
        {
          input: { name: 'Asset', type: 'asset', modifier: 'transform:(inputs) => inputs.asset' },
          value: 'asset:ETH|1000000000000000000',
        },
      ]

      await expect(factory.getModifiedInputs(inputs as any)).rejects.toThrow(
        'Transform modifier is defined but no transform runner is configured'
      )
    })

    it('applies transform modifier accessing asset token property', async () => {
      const transformRunner = createMockTransformRunner()
      const configWithTransform = createMockConfig({ transform: { runner: transformRunner } })
      const factory = new WarpFactory(configWithTransform, [createMockAdapter()])

      const inputs = [
        {
          input: { name: 'Asset', as: 'asset', type: 'asset' },
          value: 'asset:ETH|1000000000000000000',
        },
        {
          input: {
            name: 'TokenAddress',
            type: 'address',
            modifier:
              'transform:(inputs) => inputs["asset.token"] === "ETH" ? "0x0000000000000000000000000000000000000000" : inputs["asset.token"]',
          },
          value: 'address:0x123',
        },
      ]

      const result = await factory.getModifiedInputs(inputs as any)
      expect(result[1].value).toBe('address:0x0000000000000000000000000000000000000000')
    })
  })

  it('preprocessInput returns input as-is for non-asset', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const result = await factory.preprocessInput(WarpChainName.Multiversx, 'biguint:123')
    expect(result).toBe('biguint:123')
  })

  describe('preprocessInput for assets', () => {
    it('should return input as-is when existing decimals are provided', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const input = 'asset:TOKEN-123|100|18'
      const result = await factory.preprocessInput(WarpChainName.Multiversx, input)
      expect(result).toBe(input)
    })

    it('should fetch asset decimals and scale amount when no existing decimals', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: WarpChainName.Multiversx,
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 6, // USDC-like token with 6 decimals
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput(WarpChainName.Multiversx, 'asset:TOKEN-123|100')
      expect(result).toBe('asset:TOKEN-123|100000000|6')
    })

    it('should handle zero amount correctly', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: WarpChainName.Multiversx,
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 18,
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput(WarpChainName.Multiversx, 'asset:TOKEN-123|0')
      expect(result).toBe('asset:TOKEN-123|0|18')
    })

    it('should handle decimal amounts correctly', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: WarpChainName.Multiversx,
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 2,
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput(WarpChainName.Multiversx, 'asset:TOKEN-123|1.50')
      expect(result).toBe('asset:TOKEN-123|150|2')
    })
  })

  describe('getStringTypedInputs', () => {
    it('types inputs based on action input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [
          { name: 'receiver', type: 'address', position: 'arg:1', source: 'field' },
          { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          { name: 'message', type: 'string', position: 'arg:2', source: 'field' },
        ],
      }

      const inputs = ['erd1receiver', '1000000000000000000', 'Hello World']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver', 'biguint:1000000000000000000', 'string:Hello World'])
    })

    it('returns inputs as-is when already typed', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [{ name: 'receiver', type: 'address', position: 'arg:1', source: 'field' }],
      }

      const inputs = ['address:erd1receiver']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver'])
    })

    it('handles inputs without corresponding action input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [{ name: 'receiver', type: 'address', position: 'arg:1', source: 'field' }],
      }

      const inputs = ['erd1receiver', 'extra-input']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver', 'extra-input'])
    })

    it('handles actions with no input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
      }

      const inputs = ['some-input', 'another-input']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['some-input', 'another-input'])
    })
  })

  describe('primary input references', () => {
    it('interpolates primary input references in non-primary action args', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:{{BRIDGE}}', '{{primary.AMOUNT}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              { name: 'Token', as: 'TOKEN', type: 'address', position: 'arg:1', source: 'field' },
              { name: 'Amount', as: 'AMOUNT', type: 'uint256', position: 'arg:2', source: 'field' },
              { name: 'Receiver', as: 'RECEIVER', type: 'string', position: 'arg:3', source: 'field' },
            ],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['address:erd1token', 'uint256:1000', 'string:erd1receiver'])
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('1000')
    })

    it('interpolates primary input references in non-primary action address', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: '{{primary.TOKEN}}',
            func: 'approve',
            args: ['address:{{BRIDGE}}', '{{primary.AMOUNT}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              { name: 'Token', as: 'TOKEN', type: 'address', position: 'arg:1', source: 'field' },
              { name: 'Amount', as: 'AMOUNT', type: 'uint256', position: 'arg:2', source: 'field' },
            ],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['address:erd1token', 'uint256:1000'])
      expect(result.destination).toBe('erd1token')
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('1000')
    })

    it('interpolates primary input references in non-primary action value', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Pre-transfer',
            address: 'erd1dest',
            value: '{{primary.AMOUNT}}',
            primary: false,
          },
          {
            type: 'transfer',
            label: 'Main Transfer',
            address: 'erd1dest',
            value: '0',
            primary: true,
            inputs: [{ name: 'Amount', as: 'AMOUNT', type: 'biguint', position: 'value', source: 'field' }],
          },
        ],
      }
      const result = await factory.createExecutable(warp, 1, ['biguint:500'])
      expect(result.value).toBe(BigInt(500))
    })

    it('primary action resolves its own inputs', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [{ name: 'Amount', as: 'AMOUNT', type: 'uint256', position: 'arg:1', source: 'field' }],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['uint256:1000'])
      expect(result.args[0]).toBe('uint256:1000')
      expect(result.destination).toBe('erd1bridge')
    })

    it('handles multiple primary input references in same arg', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:{{BRIDGE}}', '{{primary.AMOUNT}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              { name: 'Token', as: 'TOKEN', type: 'address', position: 'arg:1', source: 'field' },
              { name: 'Amount', as: 'AMOUNT', type: 'uint256', position: 'arg:2', source: 'field' },
              { name: 'Receiver', as: 'RECEIVER', type: 'string', position: 'arg:3', source: 'field' },
            ],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['address:erd1token', 'uint256:1000', 'string:erd1receiver'])
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('1000')
    })

    it('handles primary input references when primary action has no inputs', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:{{BRIDGE}}', '{{primary.AMOUNT}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, [])
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('')
    })

    it('interpolates primary input references by name when as is not present', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:{{BRIDGE}}', '{{primary.AMOUNT}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [{ name: 'AMOUNT', type: 'uint256', position: 'arg:1', source: 'field' }],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['uint256:1000'])
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('1000')
    })

    it('interpolates nested asset properties in non-primary action', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Approve',
            address: '{{primary.asset.token}}',
            func: 'approve',
            args: ['address:{{BRIDGE}}', 'uint256:{{primary.asset.amount}}'],
            gasLimit: 200000,
            primary: false,
          } as WarpContractAction,
          {
            type: 'contract',
            label: 'Deposit',
            address: '{{BRIDGE}}',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              {
                name: 'Asset',
                as: 'asset',
                type: 'asset',
                position: { token: 'arg:1', amount: 'arg:2' },
                source: 'field',
              },
            ],
          } as WarpContractAction,
        ],
        vars: {
          BRIDGE: 'erd1bridge',
        },
      }
      const result = await factory.createExecutable(warp, 1, ['asset:EGLD|1'])
      expect(result.destination).toBe('EGLD')
      expect(result.args[0]).toBe('address:erd1bridge')
      expect(result.args[1]).toBe('uint256:1000000000000000000')
    })
  })

  describe('mcp actions', () => {
    it('resolves inputs for mcp actions', async () => {
      const factory = new WarpFactory(testConfig, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Transfer',
            address: 'erd1dest',
            value: '0',
            primary: true,
          },
          {
            type: 'mcp',
            label: 'MCP Tool',
            destination: {
              url: 'https://mcp.example.com',
              tool: 'test_tool',
            },
            inputs: [
              { name: 'Name', type: 'string', position: 'payload:name', source: 'field' },
              { name: 'Quantity', type: 'uint256', position: 'payload:quantity', source: 'field' },
            ],
            primary: false,
          } as WarpMcpAction,
        ],
      }
      const result = await factory.createExecutable(warp, 2, ['string:Product', 'uint256:5'])

      expect(result.resolvedInputs).toHaveLength(2)
      expect(result.resolvedInputs[0].input.name).toBe('Name')
      expect(result.resolvedInputs[0].input.position).toBe('payload:name')
      expect(result.resolvedInputs[0].value).toBe('string:Product')
      expect(result.resolvedInputs[1].input.name).toBe('Quantity')
      expect(result.resolvedInputs[1].input.position).toBe('payload:quantity')
      expect(result.resolvedInputs[1].value).toBe('uint256:5')
    })

    it('allows mcp actions without destination requirement', async () => {
      const factory = new WarpFactory(testConfig, [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'mcp',
            label: 'MCP Tool',
            destination: {
              url: 'https://mcp.example.com',
              tool: 'test_tool',
            },
            inputs: [],
            primary: true,
          } as WarpMcpAction,
        ],
      }
      const result = await factory.createExecutable(warp, 1, [])

      expect(result.destination).toBe('https://mcp.example.com')
      expect(result.resolvedInputs).toEqual([])
    })
  })
})

describe('getChainInfoForAction', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses chain from input when chain position is specified', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      name: 'mainnet',
      displayName: 'Mainnet',
      chainId: '1',
      blockTime: 6000,
      addressHrp: 'erd',
      defaultApiUrl: 'https://api.multiversx.com',
      explorerUrl: 'https://explorer.multiversx.com',
      nativeToken: {
        chain: WarpChainName.Multiversx,
        identifier: 'EGLD',
        name: 'MultiversX',
        symbol: 'EGLD',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    })
    const adapter = createMockAdapter()
    adapter.chain = 'mainnet' as any
    adapter.chainInfo = {
      name: 'mainnet' as any,
      displayName: 'Mainnet',
      chainId: '1',
      blockTime: 6000,
      addressHrp: 'erd',
      defaultApiUrl: 'https://api.multiversx.com',
      logoUrl: 'https://example.com/multiversx.png',
      nativeToken: {
        chain: WarpChainName.Multiversx,
        identifier: 'EGLD',
        name: 'MultiversX',
        symbol: 'EGLD',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    }
    adapter.registry.getChainInfo = mockGetChainInfo
    const factory = new WarpFactory(testConfig, [adapter])
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [
            { name: 'targetChain', type: 'string', position: 'chain', source: 'field' },
            { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          ],
        } as WarpContractAction,
      ],
    }
    const chainInfo = await factory.getChainInfoForWarp(warp, ['string:mainnet', 'biguint:1000000000000000000'])
    expect(chainInfo.name).toBe('mainnet')
  })

  it('uses default chain when no chain position is specified', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    const chainInfo = await factory.getChainInfoForWarp(warp, ['biguint:1000000000000000000'])

    expect(chainInfo.displayName).toBe('MultiversX') // Default chain name from config
  })

  it('handles chain position at index 0 correctly (critical bug test)', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      defaultApiUrl: 'https://testnet-api.multiversx.com',
      nativeToken: {
        chain: WarpChainName.Multiversx,
        identifier: 'EGLD',
        name: 'MultiversX',
        symbol: 'EGLD',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    })
    const adapter = createMockAdapter()
    adapter.chain = 'testnet' as any
    adapter.chainInfo = {
      name: 'testnet' as any,
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      defaultApiUrl: 'https://testnet-api.multiversx.com',
      logoUrl: 'https://example.com/multiversx.png',
      nativeToken: {
        chain: WarpChainName.Multiversx,
        identifier: 'EGLD',
        name: 'MultiversX',
        symbol: 'EGLD',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    }
    adapter.registry.getChainInfo = mockGetChainInfo
    const factory = new WarpFactory(testConfig, [adapter])
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [
            { name: 'targetChain', type: 'string', position: 'chain', source: 'field' }, // At index 0
            { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          ],
        } as WarpContractAction,
      ],
    }
    const chainInfo = await factory.getChainInfoForWarp(warp, ['string:testnet', 'biguint:500'])
    expect(chainInfo.displayName).toBe('Testnet')
  })

  it('throws error when chain input is not found at specified position', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    await expect(factory.getChainInfoForWarp(warp, [])).rejects.toThrow('Chain input not found')
  })

  it('uses default chain when no inputs are provided', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    const chainInfo = await factory.getChainInfoForWarp(warp)

    expect(chainInfo.displayName).toBe('MultiversX') // Default chain name from config
  })

  describe('asset object position notation', () => {
    it('maps asset token and amount to separate argument positions', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            inputs: [
              {
                name: 'Asset',
                type: 'asset',
                position: { token: 'arg:1', amount: 'arg:2' },
                source: 'field',
              },
              { name: 'Receiver', type: 'string', position: 'arg:3', source: 'field' },
            ],
          } as WarpContractAction,
        ],
      }
      const result = await factory.createExecutable(warp, 1, ['asset:EGLD|1', 'string:erd1receiver'])
      expect(result.args[0]).toBe('address:EGLD')
      expect(result.args[1]).toBe('uint256:1000000000000000000')
      expect(result.args[2]).toBe('string:erd1receiver')
    })

    it('maintains backward compatibility with string positions', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Test',
            address: 'erd1contract',
            func: 'test',
            args: [],
            gasLimit: 200000,
            inputs: [
              { name: 'Token', type: 'address', position: 'arg:1', source: 'field' },
              { name: 'Amount', type: 'uint256', position: 'arg:2', source: 'field' },
            ],
          } as WarpContractAction,
        ],
      }
      const result = await factory.createExecutable(warp, 1, ['address:erd1token', 'uint256:1000'])
      expect(result.args[0]).toBe('address:erd1token')
      expect(result.args[1]).toBe('uint256:1000')
    })

    it('throws error when object position is used with non-asset type', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Test',
            address: 'erd1contract',
            func: 'test',
            args: [],
            gasLimit: 200000,
            inputs: [
              {
                name: 'Token',
                type: 'address',
                position: { token: 'arg:1', amount: 'arg:2' },
                source: 'field',
              },
            ],
          } as WarpContractAction,
        ],
      }
      await expect(factory.createExecutable(warp, 1, ['address:erd1token'])).rejects.toThrow(
        'Object position is only supported for asset type'
      )
    })

    it('throws error when object position has invalid token or amount', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Test',
            address: 'erd1contract',
            func: 'test',
            args: [],
            gasLimit: 200000,
            inputs: [
              {
                name: 'Asset',
                type: 'asset',
                position: { token: 'invalid', amount: 'arg:2' },
                source: 'field',
              },
            ],
          } as unknown as WarpContractAction,
        ],
      }
      await expect(factory.createExecutable(warp, 1, ['asset:EGLD|1000'])).rejects.toThrow(
        'Object position must have token and amount as arg:N'
      )
    })

    it('throws error when object position is missing token or amount', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Test',
            address: 'erd1contract',
            func: 'test',
            args: [],
            gasLimit: 200000,
            inputs: [
              {
                name: 'Asset',
                type: 'asset',
                position: { token: 'arg:1' } as any,
                source: 'field',
              },
            ],
          } as WarpContractAction,
        ],
      }
      await expect(factory.createExecutable(warp, 1, ['asset:EGLD|1000'])).rejects.toThrow(
        'Object position must have token and amount as arg:N'
      )
    })

    it('handles asset with object position in different order', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            inputs: [
              { name: 'Receiver', type: 'string', position: 'arg:1', source: 'field' },
              {
                name: 'Asset',
                type: 'asset',
                position: { token: 'arg:2', amount: 'arg:3' },
                source: 'field',
              },
            ],
          } as WarpContractAction,
        ],
      }
      const result = await factory.createExecutable(warp, 1, ['string:erd1receiver', 'asset:EGLD|1'])
      expect(result.args[0]).toBe('string:erd1receiver')
      expect(result.args[1]).toBe('address:EGLD')
      expect(result.args[2]).toBe('uint256:1000000000000000000')
    })

    it('supports higher argument positions beyond 10', async () => {
      const factory = new WarpFactory(createMockConfig(), [createMockAdapter()])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            inputs: [
              {
                name: 'Asset',
                type: 'asset',
                position: { token: 'arg:3', amount: 'arg:5' },
                source: 'field',
              },
            ],
          } as WarpContractAction,
        ],
      }
      const result = await factory.createExecutable(warp, 1, ['asset:EGLD|1'])
      expect(result.args).toContain('address:EGLD')
      expect(result.args).toContain('uint256:1000000000000000000')
      expect(result.args.length).toBe(2)
    })
  })

  describe('destination/receiver with globals', () => {
    it('resolves destination from hidden input with global placeholder for transfer and contract actions', async () => {
      const mockAdapter = createMockAdapter()
      const mockWallet = {
        getPublicKey: () => 'erd1testwallet123',
      }
      mockAdapter.wallet = mockWallet as any

      const config = createMockConfig()
      config.user = {
        wallets: {
          multiversx: 'erd1testwallet123',
        },
      }

      const factory = new WarpFactory(config, [mockAdapter])

      // Test transfer action
      const transferWarp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Test Transfer',
            value: '0',
            inputs: [
              {
                name: 'Receiver',
                type: 'string',
                position: 'receiver',
                source: 'hidden',
                default: '{{USER_WALLET_PUBLICKEY}}',
              },
            ],
          },
        ],
      }
      const transferResult = await factory.createExecutable(transferWarp, 1, [])
      expect(transferResult.destination).toBe('erd1testwallet123')

      // Test contract action
      const contractWarp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'contract',
            label: 'Test Contract',
            func: 'transfer',
            args: [],
            gasLimit: 1000000,
            inputs: [
              {
                name: 'Contract Address',
                type: 'address',
                position: 'destination',
                source: 'hidden',
                default: '{{USER_WALLET_PUBLICKEY}}',
              },
            ],
          } as WarpContractAction,
        ],
      }
      const contractResult = await factory.createExecutable(contractWarp, 1, [])
      expect(contractResult.destination).toBe('erd1testwallet123')
    })

    it('resolves destination from action address and input value with global placeholder', async () => {
      const mockAdapter = createMockAdapter()
      const mockWallet = {
        getPublicKey: () => 'erd1testwallet456',
      }
      mockAdapter.wallet = mockWallet as any

      const config = createMockConfig()
      config.user = {
        wallets: {
          multiversx: 'erd1testwallet456',
        },
      }

      const factory = new WarpFactory(config, [mockAdapter])

      // Test action address
      const addressWarp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Test Transfer',
            address: '{{USER_WALLET_PUBLICKEY}}',
            value: '0',
          },
        ],
      }
      const addressResult = await factory.createExecutable(addressWarp, 1, [])
      expect(addressResult.destination).toBe('erd1testwallet456')

      // Test input value
      const inputWarp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Test Transfer',
            value: '0',
            inputs: [
              {
                name: 'Receiver',
                type: 'string',
                position: 'receiver',
                source: 'field',
              },
            ],
          },
        ],
      }
      const inputResult = await factory.createExecutable(inputWarp, 1, ['string:{{USER_WALLET_PUBLICKEY}}'])
      expect(inputResult.destination).toBe('erd1testwallet456')
    })

    it('throws error when destination with global placeholder cannot be resolved', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.wallet = null as any

      const config = createMockConfig()
      const factory = new WarpFactory(config, [mockAdapter])
      const warp: any = {
        meta: { hash: 'abc' },
        actions: [
          {
            type: 'transfer',
            label: 'Test Transfer',
            address: '{{USER_WALLET_PUBLICKEY}}',
            value: '0',
          },
        ],
      }
      await expect(factory.createExecutable(warp, 1, [])).rejects.toThrow('WarpActionExecutor: Destination/Receiver not provided')
    })
  })
})
