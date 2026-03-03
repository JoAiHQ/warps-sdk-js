import { WarpChainName } from '@joai/warps'
import { CustomCloudWalletProvider, EeWalletProvider } from './EeWalletProvider'

describe('EeWalletProvider', () => {
  const chain = {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum',
    chainId: '1',
    blockTime: 12,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.ankr.com/eth',
    logoUrl: '',
    nativeToken: {
      chain: WarpChainName.Ethereum,
      identifier: 'ETH',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      logoUrl: '',
    },
  }

  const config = {
    env: 'devnet' as const,
    user: {
      id: 'agent-1',
      wallets: {
        [WarpChainName.Ethereum]: {
          provider: 'ee' as const,
          address: '0x1234567890123456789012345678901234567890',
          externalId: 'wallet-1',
        },
      },
    },
  }

  beforeEach(() => {
    ;(global as any).fetch = jest.fn()
  })

  it('generates wallet and updates config', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        provider: 'ee',
        walletId: 'wallet-2',
        address: '0x2222222222222222222222222222222222222222',
      }),
    })

    const provider = new EeWalletProvider(config as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      accessToken: 'token',
    })
    const wallet = await provider.generate()

    expect(wallet.provider).toBe('ee')
    expect(wallet.externalId).toBe('wallet-2')
    expect(config.user.wallets[WarpChainName.Ethereum]).toMatchObject({
      provider: 'ee',
      externalId: 'wallet-2',
      address: '0x2222222222222222222222222222222222222222',
    })
    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://ee.example.com/v1/wallets/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      })
    )
  })

  it('signs transaction with ee and maps signedTransaction to signature', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        signedTransaction: '0xdeadbeef',
      }),
    })

    const provider = new EeWalletProvider(config as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      getAccessToken: async () => 'dynamic-token',
    })
    const signed = await provider.signTransaction({ to: '0xabc' } as any)

    expect((signed as any).signature).toBe('0xdeadbeef')
    expect((global as any).fetch).toHaveBeenCalledWith(
      'https://ee.example.com/v1/sign/transaction',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer dynamic-token',
        }),
      })
    )
  })

  it('signs message through ee', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        signature: '0xsigned',
      }),
    })

    const provider = new EeWalletProvider(config as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      accessToken: 'token',
    })
    const signature = await provider.signMessage('hello')
    expect(signature).toBe('0xsigned')
  })

  it('maps multiversx signature to bytes', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        signature: 'aabbcc',
      }),
    })

    const mvxConfig = {
      env: 'devnet' as const,
      user: {
        id: 'agent-1',
        wallets: {
          [WarpChainName.Multiversx]: {
            provider: 'ee' as const,
            address: 'erd1qqqqqqqqqqqqqpgq6zqzqzqzqzqzqzqzqzqzqzqzqzqzqzqst5m8r',
            externalId: 'wallet-mvx',
          },
        },
      },
    }
    const mvxChain = {
      ...chain,
      name: WarpChainName.Multiversx,
      chainId: 'D',
      addressHrp: 'erd',
    }
    const provider = new EeWalletProvider(mvxConfig as any, mvxChain as any, {
      baseUrl: 'https://ee.example.com',
      accessToken: 'token',
    })

    const signed = await provider.signTransaction({ payload: 'tx' } as any)
    expect(Buffer.isBuffer((signed as any).signature)).toBe(true)
    expect((signed as any).signature.toString('hex')).toBe('aabbcc')
  })

  it('throws when wallet externalId is missing', async () => {
    const missingWalletConfig = {
      ...config,
      user: {
        ...config.user,
        wallets: {
          [WarpChainName.Ethereum]: {
            provider: 'ee' as const,
            address: '0x1234567890123456789012345678901234567890',
          },
        },
      },
    }

    const provider = new EeWalletProvider(missingWalletConfig as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      accessToken: 'token',
    })

    await expect(provider.signMessage('hello')).rejects.toThrow('externalId(walletId) is required')
  })

  it('throws when lifecycle service token is missing', async () => {
    const provider = new EeWalletProvider(config as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      getAccessToken: async () => 'dynamic-token',
    })

    await expect(provider.generate()).rejects.toThrow('No service token configured')
  })

  it('supports custom cloud provider names', async () => {
    ;(global as any).fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        walletId: 'wallet-custom',
        address: '0x3333333333333333333333333333333333333333',
      }),
    })

    const customConfig = {
      env: 'devnet' as const,
      user: {
        id: 'agent-1',
        wallets: {
          [WarpChainName.Ethereum]: {
            provider: 'cloudsign' as any,
            address: '0x1234567890123456789012345678901234567890',
            externalId: 'wallet-1',
          },
        },
      },
    }

    const provider = new CustomCloudWalletProvider(customConfig as any, chain as any, {
      baseUrl: 'https://ee.example.com',
      providerName: 'cloudsign' as any,
      serviceToken: 'svc-token',
      accessToken: 'access-token',
    })
    const wallet = await provider.generate()

    expect(wallet.provider).toBe('cloudsign')
  })
})
