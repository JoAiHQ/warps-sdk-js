import { WarpAdapterGenericTransaction, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { createRemoteWalletProvider } from './helpers'

const asResponse = (params: { ok: boolean; status: number; jsonData?: unknown; textData?: string }): Response =>
  ({
    ok: params.ok,
    status: params.status,
    json: async () => params.jsonData,
    text: async () => params.textData ?? '',
  }) as unknown as Response

const createConfig = (): WarpClientConfig =>
  ({
    env: 'devnet',
    currentUrl: 'https://joai.ai',
    user: {
      id: 'agent-1',
      wallets: {},
    },
  }) as unknown as WarpClientConfig

const createChain = (name: string): WarpChainInfo => ({ name }) as WarpChainInfo

const createProvider = (
  config: WarpClientConfig,
  chainName: string,
  providerConfig: Parameters<typeof createRemoteWalletProvider>[0]
) => {
  const provider = createRemoteWalletProvider(providerConfig, 'remoteSigner')(config, createChain(chainName))
  if (!provider) throw new Error(`provider not available for chain ${chainName}`)
  return provider
}

const getRequestBody = (call: [string, RequestInit]): Record<string, unknown> => {
  const [, init] = call
  return JSON.parse(String(init.body))
}

describe('RemoteWalletProvider', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('uses service token for wallet generation and persists wallet details in config', async () => {
    const config = createConfig()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          walletId: 'wallet-1',
          externalId: 'wallet-1',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      })
    )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      providerName: 'remoteSigner',
      serviceToken: 'service-token-123',
    })

    const wallet = await provider.generate()

    expect(wallet.provider).toBe('remoteSigner')
    expect(wallet.externalId).toBe('wallet-1')
    expect(wallet.address).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://signer.example/v1/wallets/generate')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer service-token-123')
    expect(JSON.parse(String(init.body))).toMatchObject({
      agentId: 'agent-1',
      chain: 'ethereum',
    })

    expect((config.user as any).wallets.ethereum).toMatchObject({
      provider: 'remoteSigner',
      externalId: 'wallet-1',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    })
  })

  it('uses access token callback for signMessage', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }

    const getAccessToken = jest.fn(async () => 'access-token-xyz')
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          signature: '0xdeadbeef',
        },
      })
    )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      getAccessToken,
    })

    const signature = await provider.signMessage('hello-remote')

    expect(signature).toBe('0xdeadbeef')
    expect(getAccessToken).toHaveBeenCalledTimes(1)
    expect(getAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'wallet-1',
        chain: 'ethereum',
      })
    )

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({
      walletId: 'wallet-1',
      chain: 'ethereum',
      message: 'hello-remote',
    })
    expect(typeof body.nonce).toBe('string')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token-xyz')
  })

  it('maps multiversx hex signature to Buffer in signTransaction', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.multiversx = {
      provider: 'remoteSigner',
      address: 'erd1qqqqqqqqqqqqqpgq9j8ay2fl4ph4jry98w0ac3w3qy3rtk92aq0s2w0g9m',
      externalId: 'wallet-mvx-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          signature: 'aabb',
        },
      })
    )

    const provider = createProvider(config, 'multiversx', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    const signed = await provider.signTransaction({} as WarpAdapterGenericTransaction)

    expect(Buffer.isBuffer((signed as any).signature)).toBe(true)
    expect(((signed as any).signature as Buffer).toString('hex')).toBe('aabb')
  })

  it('rejects invalid multiversx hex signatures from signer service', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.multiversx = {
      provider: 'remoteSigner',
      address: 'erd1qqqqqqqqqqqqqpgq9j8ay2fl4ph4jry98w0ac3w3qy3rtk92aq0s2w0g9m',
      externalId: 'wallet-mvx-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          signature: 'zz11',
        },
      })
    )

    const provider = createProvider(config, 'multiversx', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await expect(provider.signTransaction({} as WarpAdapterGenericTransaction)).rejects.toThrow(
      'Invalid hex signature for multiversx transaction'
    )
  })

  it('supports signedTransaction string response', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: true, status: 200, jsonData: { signedTransaction: '0xsigned' } }))

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    const tx = {
      toPlainObject: () => ({ to: '0xabc', value: '1' }),
    } as unknown as WarpAdapterGenericTransaction

    const signed = await provider.signTransaction(tx)
    expect((signed as any).signature).toBe('0xsigned')

    const body = getRequestBody((global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit])
    expect(body.transaction).toMatchObject({ to: '0xabc', value: '1' })
  })

  it('supports signedTransaction object response', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.sui = {
      provider: 'remoteSigner',
      address: '0x123',
      externalId: 'wallet-sui-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          signedTransaction: {
            bytes: 'AQID',
            signature: 'sui-signature',
          },
        },
      })
    )

    const provider = createProvider(config, 'sui', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    const signed = await provider.signTransaction({ intent: 'transfer' } as WarpAdapterGenericTransaction)
    expect((signed as any).bytes).toBe('AQID')
    expect((signed as any).signature).toBe('sui-signature')
  })

  it('supports transactionHash response', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.near = {
      provider: 'remoteSigner',
      address: 'test.near',
      externalId: 'wallet-near-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: true, status: 200, jsonData: { transactionHash: 'near-hash' } }))

    const provider = createProvider(config, 'near', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    const signed = await provider.signTransaction({ receiverId: 'alice.near' } as WarpAdapterGenericTransaction)
    expect((signed as any).transactionHash).toBe('near-hash')
  })

  it('stringifies bigint transaction values in request payload', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: true, status: 200, jsonData: { signature: '0xdeadbeef' } }))

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await provider.signTransaction({
      value: 1000000000000000000n,
      maxFeePerGas: 1000000000n,
    } as WarpAdapterGenericTransaction)

    const body = getRequestBody((global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit])
    expect((body.transaction as any).value).toBe('1000000000000000000')
    expect((body.transaction as any).maxFeePerGas).toBe('1000000000')
  })

  it('applies static and dynamic headers with context', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: true, status: 200, jsonData: { signature: '0xdeadbeef' } }))

    const getHeaders = jest.fn(async () => ({ 'X-Dynamic': 'yes' }))
    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      headers: { 'X-Static': 'true' },
      getHeaders,
      accessToken: 'access-token-xyz',
    })

    await provider.signMessage('hello')

    expect(getHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'signMessage',
        chain: 'ethereum',
        walletId: 'wallet-1',
      })
    )

    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['X-Static']).toBe('true')
    expect((init.headers as Record<string, string>)['X-Dynamic']).toBe('yes')
  })

  it('supports request payload transform hook', async () => {
    const config = createConfig()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          walletId: 'wallet-1',
          externalId: 'wallet-1',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      })
    )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      serviceToken: 'service-token-123',
      transformPayload: async (_context, payload) => ({
        ...payload,
        tenantId: 'tenant-1',
      }),
    })

    await provider.generate()

    const body = getRequestBody((global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit])
    expect(body.tenantId).toBe('tenant-1')
  })

  it('rejects signing when wallet externalId is missing', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    }

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await expect(provider.signMessage('hello')).rejects.toThrow('externalId(walletId) is required')
  })

  it('rejects signing when access token is not configured', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
    })

    await expect(provider.signMessage('hello')).rejects.toThrow('No access token provider configured')
  })

  it('rejects signMessage response without signature', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: true, status: 200, jsonData: {} }))

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await expect(provider.signMessage('hello')).rejects.toThrow('Missing signature in signMessage response')
  })

  it('propagates non-2xx responses with status and body', async () => {
    const config = createConfig()
    ;(config.user as any).wallets.ethereum = {
      provider: 'remoteSigner',
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      externalId: 'wallet-1',
    }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(asResponse({ ok: false, status: 403, textData: 'forbidden' }))

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await expect(provider.signMessage('hello')).rejects.toThrow('request failed (403): forbidden')
  })

  it('imports and exports wallet through lifecycle endpoints', async () => {
    const config = createConfig()
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          jsonData: {
            walletId: 'wallet-2',
            externalId: 'wallet-2',
            address: '0x1111111111111111111111111111111111111111',
          },
        })
      )
      .mockResolvedValueOnce(
        asResponse({
          ok: true,
          status: 200,
          jsonData: {
            address: '0x1111111111111111111111111111111111111111',
            privateKey: '0xprivate',
            externalId: 'wallet-2',
          },
        })
      )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      serviceToken: 'service-token-123',
    })

    const imported = await provider.importFromPrivateKey('0xabc')
    expect(imported).toMatchObject({
      externalId: 'wallet-2',
      address: '0x1111111111111111111111111111111111111111',
    })

    const exported = await provider.export()
    expect(exported).toMatchObject({
      externalId: 'wallet-2',
      address: '0x1111111111111111111111111111111111111111',
      privateKey: '0xprivate',
    })
  })

  it('rejects wallet generation without user id', async () => {
    const config = {
      env: 'devnet',
      currentUrl: 'https://joai.ai',
    } as WarpClientConfig

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      serviceToken: 'service-token-123',
    })

    await expect(provider.generate()).rejects.toThrow('user.id is required for wallet generation')
  })

  it('rejects non-https base url unless explicitly allowed', () => {
    const config = createConfig()

    expect(() =>
      createProvider(config, 'ethereum', {
        baseUrl: 'http://signer.example',
        serviceToken: 'service-token-123',
      })
    ).toThrow('baseUrl must use HTTPS unless allowInsecureHttp is explicitly enabled')
  })

  it('allows loopback http base url by default', async () => {
    const config = createConfig()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          walletId: 'wallet-local-1',
          externalId: 'wallet-local-1',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      })
    )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'http://localhost:3008/',
      serviceToken: 'service-token-123',
    })

    await provider.generate()
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('http://localhost:3008/v1/wallets/generate')
  })

  it('rejects lifecycle endpoints without service token', async () => {
    const config = createConfig()

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
    })

    await expect(provider.generate()).rejects.toThrow('No service token configured for wallet lifecycle endpoints')
  })

  it('normalizes endpoint paths that do not start with slash', async () => {
    const config = createConfig()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce(
      asResponse({
        ok: true,
        status: 200,
        jsonData: {
          walletId: 'wallet-1',
          externalId: 'wallet-1',
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        },
      })
    )

    const provider = createProvider(config, 'ethereum', {
      baseUrl: 'https://signer.example',
      serviceToken: 'service-token-123',
      endpoints: {
        generate: 'v1/wallets/generate',
      },
    })

    await provider.generate()
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://signer.example/v1/wallets/generate')
  })

  it('rejects absolute endpoint override urls', () => {
    const config = createConfig()

    expect(() =>
      createProvider(config, 'ethereum', {
        baseUrl: 'https://signer.example',
        serviceToken: 'service-token-123',
        endpoints: {
          generate: 'https://attacker.example/v1/wallets/generate',
        },
      })
    ).toThrow('endpoint path must be relative')
  })

  it('creates a provider factory with the default remote provider name', () => {
    const config = createConfig()

    const provider = createRemoteWalletProvider({
      baseUrl: 'https://signer.example',
      accessToken: 'access-token-xyz',
      serviceToken: 'service-token-123',
    })(config, createChain('ethereum'))

    expect(provider).toBeTruthy()
  })

  it('creates a provider factory with a custom provider name', () => {
    const config = createConfig()

    const provider = createRemoteWalletProvider(
      {
        baseUrl: 'https://signer.example',
        accessToken: 'access-token-xyz',
        serviceToken: 'service-token-123',
      },
      'remoteSigner'
    )(config, createChain('ethereum'))

    expect(provider).toBeTruthy()
  })
})
