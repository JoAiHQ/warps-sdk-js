import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig, WarpCollectAction, WarpMcpAction, WarpQueryAction } from './types'
import { WarpExecutor } from './WarpExecutor'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock safeWindow
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  safeWindow: { open: jest.fn() },
}))

describe('WarpExecutor', () => {
  const handlers = { onExecuted: jest.fn(), onError: jest.fn() }
  const warp: Warp = createMockWarp()

  const config: WarpClientConfig = {
    env: 'devnet',
    user: { wallets: { MULTIVERSX: 'erd1...' } },
    clientUrl: 'https://anyclient.com',
    currentUrl: 'https://anyclient.com',
  }
  const adapters = [
    (() => {
      const a = createMockAdapter()
      a.chain = 'multiversx'
      a.prefix = 'multiversx'
      return a
    })(),
    (() => {
      const a = createMockAdapter()
      a.chain = 'sui'
      a.prefix = 'sui'
      return a
    })(),
  ]
  const executor = new WarpExecutor(config, adapters, handlers)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('execute', () => {
    it('executes a warp with multiple actions', async () => {
      const result = await executor.execute(warp, [])
      expect(result).toBeDefined()
      expect(result.chain).toBeDefined()
      expect(result.immediateExecutions).toBeDefined()
      expect(result.txs).toBeDefined()
      expect(Array.isArray(result.txs)).toBe(true)
      expect(Array.isArray(result.immediateExecutions)).toBe(true)
    })

    it('handles execution errors gracefully', async () => {
      const errorWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Error Action',
            chain: 'invalid-chain',
            address: 'invalid-address',
            value: '0',
            inputs: [],
          },
        ],
      }
      // The new implementation uses default chain when invalid chain is provided
      const result = await executor.execute(errorWarp, [])
      expect(result).toBeDefined()
      expect(result.chain).toBeDefined()
      expect(result.chain.name).toBe('multiversx') // Should fall back to default chain
    })

    it('automatically merges queries from warp.meta.query with provided queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const warpWithMetaQuery = {
        ...warp,
        meta: {
          chain: 'multiversx' as const,
          identifier: 'hash:abc123',
          query: {
            provider: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww',
            chain: 'multiversx',
          },
          hash: 'abc123',
          creator: 'erd1creator',
          createdAt: '2024-01-01T00:00:00Z',
        },
        vars: {
          PROVIDER: 'query:provider',
          CHAIN: 'query:chain',
        },
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Query',
            destination: {
              url: 'https://api.example.com/collect?provider={{PROVIDER}}&chain={{CHAIN}}',
              method: 'GET' as const,
            },
            inputs: [],
          } as WarpCollectAction,
        ],
      }

      const providedQueries = { chain: 'sui' }
      const result = await executor.execute(warpWithMetaQuery, [], { queries: providedQueries })

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0] as string
      // Provider from meta.query should be used
      expect(url).toContain('provider=erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww')
      // Chain from provided queries should override meta.query
      expect(url).toContain('chain=sui')
    })

    it('uses queries from warp.meta.query when no queries are provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const warpWithMetaQuery = {
        ...warp,
        meta: {
          chain: 'multiversx' as const,
          identifier: 'hash:abc123',
          query: {
            provider: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww',
          },
          hash: 'abc123',
          creator: 'erd1creator',
          createdAt: '2024-01-01T00:00:00Z',
        },
        vars: {
          PROVIDER: 'query:provider',
        },
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Query',
            destination: {
              url: 'https://api.example.com/collect?provider={{PROVIDER}}',
              method: 'GET' as const,
            },
            inputs: [],
          } as WarpCollectAction,
        ],
      }

      const result = await executor.execute(warpWithMetaQuery, [])

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalled()
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0] as string
      // Provider from meta.query should be automatically used
      expect(url).toContain('provider=erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww')
    })

    it('resolves field inputs from queries in warp.meta.query and uses them for interpolation', async () => {
      const providerAddress = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww'
      const contractWarp = {
        ...warp,
        chain: 'multiversx',
        meta: {
          chain: 'multiversx' as const,
          identifier: '@multiversx:multiversx-staking-claim',
          query: {
            PROVIDER: providerAddress,
          },
          hash: 'abc123',
          creator: 'erd1creator',
          createdAt: '2024-01-01T00:00:00Z',
        },
        actions: [
          {
            type: 'contract' as const,
            label: 'Claim now',
            address: '{{PROVIDER}}',
            func: 'claimRewards',
            args: [],
            gasLimit: 10000000,
            inputs: [
              {
                name: 'Provider',
                as: 'PROVIDER',
                type: 'address',
                source: 'field' as const,
                required: true,
              },
            ],
          },
        ],
      }

      const executable = await executor['factory'].createExecutable(contractWarp, 1, [], { queries: { PROVIDER: providerAddress } })
      
      // Verify the input was resolved from queries
      const providerInput = executable.resolvedInputs.find((ri) => ri.input.as === 'PROVIDER')
      expect(providerInput).toBeDefined()
      expect(providerInput?.value).toBe(`address:${providerAddress}`)
      
      // Verify the destination was interpolated from the resolved input
      expect(executable.destination).toBe(providerAddress)
    })
  })

  describe('collect actions', () => {
    it('handles collect actions correctly', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
              {
                name: 'amount',
                type: 'biguint',
                source: 'field' as const,
                position: 'value' as const,
              },
              {
                name: 'asset',
                type: 'asset',
                source: 'field' as const,
                position: 'transfer' as const,
              },
              {
                name: 'queryParam',
                type: 'string',
                source: 'query' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }
      // Provide valid receiver input for the collect action
      const inputs = ['address:erd1receiver', 'biguint:100', 'asset:MYTOKEN|100', 'string:foo']
      const result = await executor.execute(collectWarp, inputs)
      expect(result).toBeDefined()
      expect(handlers.onExecuted).toHaveBeenCalled()
    })

    it('interpolates input variables in destination URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Check rewards',
            destination: {
              url: '{{CHAIN_API}}/accounts/{{ADDRESS}}/delegation',
              method: 'GET' as const,
            },
            inputs: [
              {
                name: 'Address',
                as: 'ADDRESS',
                type: 'address',
                source: 'field' as const,
                required: true,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1test123456789']
      await executor.execute(collectWarp, inputs)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const fetchCall = mockFetch.mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).toContain('/accounts/erd1test123456789/delegation')
      expect(url).toContain('devnet-api.multiversx.com')
    })

    it('handles nested payload structure with position parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const nestedPayloadWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Nested Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'reference',
                as: 'ref',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'country',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'amount',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:123', 'string:micha@vleap.ai', 'string:AT', 'string:10.00']
      const result = await executor.execute(nestedPayloadWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                customer: {
                  ref: '123',
                  email: 'micha@vleap.ai',
                  country: 'AT',
                  amount: '10.00',
                },
              },
            },
          }),
        })
      )
    })

    it('maintains flat payload structure when position is not set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const flatPayloadWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Flat Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'reference',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:123', 'string:micha@vleap.ai']
      const result = await executor.execute(flatPayloadWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            reference: '123',
            email: 'micha@vleap.ai',
          }),
        })
      )
    })

    it('builds nested payload correctly with multiple levels', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const multiLevelWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Multi Level Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'user',
                as: 'name',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer.info' as const,
              },
              {
                name: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer.info' as const,
              },
              {
                name: 'amount',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.transaction' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:John Doe', 'string:john@example.com', 'string:100.00']
      const result = await executor.execute(multiLevelWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            request: {
              customer: {
                info: {
                  name: 'John Doe',
                  email: 'john@example.com',
                },
              },
              transaction: {
                amount: '100.00',
              },
            },
          }),
        })
      )
    })

    it('should handle hidden inputs with default values', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const hiddenInputWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Hidden Input',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'reference',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'apiVersion',
                type: 'string',
                source: 'hidden' as const,
                default: 'v1.0',
                position: 'payload:data.attributes.customer' as const,
              },
              {
                name: 'timestamp',
                type: 'string',
                source: 'hidden' as const,
                default: '2024-01-01T00:00:00Z',
                position: 'payload:data.metadata' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:REF123']
      const result = await executor.execute(hiddenInputWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                customer: {
                  reference: 'REF123',
                  apiVersion: 'v1.0',
                },
              },
              metadata: {
                timestamp: '2024-01-01T00:00:00Z',
              },
            },
          }),
        })
      )
    })

    it('should handle mixed hidden and user inputs', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const mixedInputWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Mixed Inputs',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'userEmail',
                as: 'email',
                type: 'string',
                source: 'field' as const,
                position: 'payload:request.customer' as const,
              },
              {
                name: 'apiKey',
                type: 'string',
                source: 'hidden' as const,
                default: 'secret-key-123',
                position: 'payload:request.headers' as const,
              },
              {
                name: 'requestId',
                type: 'string',
                source: 'hidden' as const,
                default: 'req-456',
                position: 'payload:request.metadata' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:user@example.com']
      const result = await executor.execute(mixedInputWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            request: {
              customer: {
                email: 'user@example.com',
              },
              headers: {
                apiKey: 'secret-key-123',
              },
              metadata: {
                requestId: 'req-456',
              },
            },
          }),
        })
      )
    })

    it('should handle hidden inputs without position (flat structure)', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const flatHiddenWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with Flat Hidden Input',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
              headers: { 'Content-Type': 'application/json' },
            },
            inputs: [
              {
                name: 'userInput',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'version',
                type: 'string',
                source: 'hidden' as const,
                default: '2.1.0',
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-value']
      const result = await executor.execute(flatHiddenWarp, inputs)

      expect(result).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/collect',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userInput: 'test-value',
            version: '2.1.0',
          }),
        })
      )
    })

    it('should return unhandled status when collect action destination object has no URL property', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect without Destination URL',
            destination: { method: 'POST' } as any,
            inputs: [
              {
                name: 'destination',
                type: 'string',
                source: 'field' as const,
                position: 'destination' as const,
              },
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:dummy-destination', 'string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result).toBeDefined()
      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].status).toBe('unhandled')
      expect(result.immediateExecutions[0].warp).toEqual(unhandledWarp)
      expect(result.immediateExecutions[0].action).toBe(1)
      expect(result.immediateExecutions[0].output).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
      expect(handlers.onExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhandled',
          warp: unhandledWarp,
          action: 1,
        })
      )
    })

    it('should return unhandled status when collect action destination is a string without URL', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect with String Destination',
            destination: 'some-string-destination' as any,
            inputs: [
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result).toBeDefined()
      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].status).toBe('unhandled')
      expect(result.immediateExecutions[0].warp).toEqual(unhandledWarp)
      expect(result.immediateExecutions[0].action).toBe(1)
      expect(result.immediateExecutions[0].output).toEqual({})
      expect(mockFetch).not.toHaveBeenCalled()
      expect(handlers.onExecuted).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhandled',
          warp: unhandledWarp,
          action: 1,
        })
      )
    })

    it('should evaluate output correctly for unhandled collect', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Unhandled Collect with Output',
            destination: 'some-destination' as any,
            inputs: [
              {
                name: 'username',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'userId',
                as: 'ID',
                type: 'string',
                source: 'field' as const,
              },
              {
                name: 'user',
                as: 'name',
                type: 'string',
                source: 'field' as const,
                position: 'payload:data.user' as const,
              },
            ],
            next: '{{STATUS}}',
          } as WarpCollectAction,
        ],
        output: {
          USERNAME: 'out.username',
          USERNAME_INPUT: 'in.username',
          USER_ID: 'in.ID',
          USER_NAME: 'out.data.user.name',
          STATUS: 'out.username',
        },
      }

      const inputs = ['string:john_doe', 'string:user123', 'string:Alice']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('unhandled')
      expect(execution.output.USERNAME).toBe('john_doe')
      expect(execution.output.USERNAME_INPUT).toBe('john_doe')
      expect(execution.output.USER_ID).toBe('user123')
      expect(execution.output.USER_NAME).toBe('Alice')
      expect(execution.output.STATUS).toBe('john_doe')
      expect(execution.values.string.length).toBeGreaterThan(0)
      expect(execution.values.native.length).toBeGreaterThan(0)
      expect(execution.next).toBeDefined()
      expect(execution.next).toHaveLength(1)
      expect(execution.next?.[0]?.identifier).toBeDefined()
    })

    it('sets destination in WarpActionExecutionResult from input with position destination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'destination',
                type: 'address',
                source: 'field' as const,
                position: 'destination' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1destination123456789']
      const result = await executor.execute(collectWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      expect(result.immediateExecutions[0].destination).toBe('address:erd1destination123456789')
      expect(handlers.onExecuted).toHaveBeenCalled()
      const executionResult = handlers.onExecuted.mock.calls[0][0]
      expect(executionResult.destination).toBe('address:erd1destination123456789')
    })

    it('should handle unhandled collect with no output configuration', async () => {
      const unhandledWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Unhandled Collect No Output',
            destination: 'some-destination' as any,
            inputs: [
              {
                name: 'data',
                type: 'string',
                source: 'field' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['string:test-data']
      const result = await executor.execute(unhandledWarp, inputs)

      expect(result.immediateExecutions).toHaveLength(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('unhandled')
      expect(execution.output).toEqual({})
      expect(execution.values.string).toEqual([])
      expect(execution.values.native).toEqual([])
    })
  })

  describe('multi-action execution', () => {
    it('should emit onActionExecuted for each action', async () => {
      const onActionExecuted = jest.fn()
      const multiActionHandlers = {
        onActionExecuted,
        onError: jest.fn(),
      }
      const multiActionExecutor = new WarpExecutor(config, adapters, multiActionHandlers)

      const multiActionWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer 1',
            chain: 'multiversx',
            address: 'erd1receiver1',
            value: '1000000000000000000',
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer 2',
            chain: 'multiversx',
            address: 'erd1receiver2',
            value: '2000000000000000000',
            inputs: [],
          },
        ],
      }

      await multiActionExecutor.execute(multiActionWarp, [])

      // Transfer actions don't call onActionExecuted in the current implementation
      // Only collect, link, and query actions call onActionExecuted
      expect(onActionExecuted).toHaveBeenCalledTimes(0)
    })

    it('should handle mixed action types correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'collect data' }),
      })

      const mixedWarp = {
        ...warp,
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer After Collect',
            chain: 'multiversx',
            address: 'erd1receiver',
            value: '1000000000000000000',
            inputs: [],
          },
        ],
      }

      await executor.execute(mixedWarp, [])
    })

    it('should handle multiple actions on same chain correctly', async () => {
      const multiActionWarp = {
        ...warp,
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer 1',
            chain: 'multiversx',
            address: 'erd1receiver1',
            value: '1000000000000000000',
            inputs: [],
          },
          {
            type: 'transfer' as const,
            label: 'Transfer 2',
            chain: 'multiversx',
            address: 'erd1receiver2',
            value: '2000000000000000000',
            inputs: [],
          },
        ],
      }

      await executor.execute(multiActionWarp, [])
    })
  })

  describe('execution handlers - async vs sync', () => {
    it('should handle sync onExecuted handler', async () => {
      const syncHandler = jest.fn()
      const syncHandlers = { onExecuted: syncHandler, onError: jest.fn() }
      const syncExecutor = new WarpExecutor(config, adapters, syncHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await syncExecutor.execute(collectWarp, inputs)

      expect(syncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })

    it('should handle async onExecuted handler', async () => {
      const asyncHandler = jest.fn().mockResolvedValue(undefined)
      const asyncHandlers = { onExecuted: asyncHandler, onError: jest.fn() }
      const asyncExecutor = new WarpExecutor(config, adapters, asyncHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await asyncExecutor.execute(collectWarp, inputs)

      expect(asyncHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })

    it('should handle mixed async/sync handlers', async () => {
      const syncExecutedHandler = jest.fn()
      const asyncExecutedHandler = jest.fn().mockResolvedValue(undefined)
      const mixedHandlers = {
        onExecuted: syncExecutedHandler,
        onError: jest.fn(),
      }
      const mixedExecutor = new WarpExecutor(config, adapters, mixedHandlers)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'test data' }),
      })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect' as const,
            label: 'Collect Data',
            destination: {
              url: 'https://api.example.com/collect',
              method: 'POST' as const,
            },
            inputs: [
              {
                name: 'address',
                type: 'string',
                source: 'field' as const,
                position: 'receiver' as const,
              },
            ],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await mixedExecutor.execute(collectWarp, inputs)

      expect(syncExecutedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          warp: collectWarp,
          action: 1,
        })
      )
    })
  })

  describe('link actions with auto enabled', () => {
    it('should execute link actions when auto is explicitly set to true', async () => {
      const { safeWindow } = require('./constants')
      const mockWindowOpen = safeWindow.open as jest.Mock
      mockWindowOpen.mockClear()

      const linkWarp = {
        ...warp,
        actions: [
          {
            type: 'link' as const,
            label: 'Auto Link',
            auto: true,
            url: 'https://example.com',
          },
        ],
      }

      const result = await executor.execute(linkWarp, [])

      expect(result).toBeDefined()
      expect(result.chain).toBeDefined()
      expect(result.txs).toEqual([])
      expect(result.immediateExecutions).toEqual([])
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com', '_blank')
    })
  })

  describe('when property', () => {
    it('should skip action when when condition evaluates to false', async () => {
      const contractWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'contract' as const,
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:erd1bridge', 'uint256:1000'],
            gasLimit: 200000,
            primary: true,
            inputs: [
              {
                name: 'Token',
                as: 'TOKEN',
                type: 'address',
                source: 'field' as const,
                position: 'arg:1' as const,
              },
            ],
          },
          {
            type: 'contract' as const,
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            when: "{{primary.TOKEN}} === '0x0000000000000000000000000000000000000000'",
          },
        ],
      }

      const result = await executor.execute(contractWarp, ['address:erd1token'])
      expect(result.txs.length).toBe(1)
    })

    it('should execute action when when condition evaluates to true', async () => {
      const contractWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'contract' as const,
            label: 'Approve',
            address: 'erd1token',
            func: 'approve',
            args: ['address:erd1bridge', 'uint256:1000'],
            gasLimit: 200000,
            primary: true,
            inputs: [
              {
                name: 'Token',
                as: 'TOKEN',
                type: 'address',
                source: 'field' as const,
                position: 'arg:1' as const,
              },
            ],
          },
          {
            type: 'contract' as const,
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            when: "{{primary.TOKEN}} === 'erd1token'",
          },
        ],
      }

      const result = await executor.execute(contractWarp, ['address:erd1token'])
      expect(result.txs.length).toBe(2)
    })

    it('should execute action when when property is not present', async () => {
      const contractWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'contract' as const,
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
          },
        ],
      }

      const result = await executor.execute(contractWarp, [])
      expect(result.txs.length).toBe(1)
    })

    it('should handle when condition with primary asset properties', async () => {
      const contractWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'contract' as const,
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              {
                name: 'Asset',
                as: 'asset',
                type: 'asset',
                source: 'field' as const,
                position: { token: 'arg:1' as const, amount: 'arg:2' as const },
              },
            ],
          },
          {
            type: 'contract' as const,
            label: 'Approve',
            address: '{{primary.asset.token}}',
            func: 'approve',
            args: ['address:erd1bridge', 'uint256:{{primary.asset.amount}}'],
            gasLimit: 200000,
            when: "{{primary.asset.token}} === 'EGLD'",
          },
        ],
      }

      const result = await executor.execute(contractWarp, ['asset:EGLD|1000'])
      expect(result.txs.length).toBe(2)
    })

    it('should skip link action when when condition evaluates to false', async () => {
      const { safeWindow } = require('./constants')
      const mockWindowOpen = safeWindow.open as jest.Mock
      mockWindowOpen.mockClear()

      const linkWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'contract' as const,
            label: 'Deposit',
            address: 'erd1bridge',
            func: 'deposit',
            args: [],
            gasLimit: 200000,
            primary: true,
            inputs: [
              {
                name: 'Token',
                as: 'TOKEN',
                type: 'address',
                source: 'field' as const,
                position: 'arg:1' as const,
              },
            ],
          },
          {
            type: 'link' as const,
            label: 'External Link',
            url: 'https://example.com',
            when: "{{primary.TOKEN}} === '0x0000000000000000000000000000000000000000'",
          },
        ],
      }

      await executor.execute(linkWarp, ['address:erd1token'])
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should call onError with result.output._DATA for collect action errors', async () => {
      const errorData = { error: 'Collect failed', code: 500 }
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => errorData })

      const collectWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'collect',
            label: 'Collect Data',
            destination: { url: 'https://api.example.com/collect', method: 'POST' },
            inputs: [{ name: 'address', type: 'string', source: 'field', position: 'receiver' }],
          } as WarpCollectAction,
        ],
      }

      const inputs = ['address:erd1receiver']
      await executor.execute(collectWarp, inputs)

      expect(handlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: JSON.stringify(errorData),
          result: expect.objectContaining({
            status: 'error',
            output: expect.objectContaining({
              _DATA: errorData,
            }),
          }),
        })
      )
    })

    it('should call onError with result.output._DATA for query action errors', async () => {
      const errorData = { error: 'Query failed', code: 400 }
      const queryAdapter = createMockAdapter()
      queryAdapter.chain = 'multiversx'
      queryAdapter.executor.executeQuery = jest.fn().mockResolvedValue({
        status: 'error',
        warp: warp,
        action: 1,
        user: 'erd1...',
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: errorData },
        messages: {},
        destination: null,
        resolvedInputs: [],
      })

      const queryHandlers = { onExecuted: jest.fn(), onError: jest.fn() }
      const queryExecutor = new WarpExecutor(config, [queryAdapter], queryHandlers)

      const queryWarp = {
        ...warp,
        chain: 'multiversx',
        actions: [{ type: 'query', label: 'Query Data', address: 'erd1test', func: 'getAccount', inputs: [] } as WarpQueryAction],
      } as Warp

      await queryExecutor.execute(queryWarp, [])

      expect(queryHandlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: JSON.stringify(errorData),
          result: expect.objectContaining({
            status: 'error',
            output: expect.objectContaining({
              _DATA: errorData,
            }),
          }),
        })
      )
    })
  })

  describe('mcp actions', () => {
    it('handles error when mcp action has no destination', async () => {
      const mcpWarp: Warp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'mcp' as const,
            label: 'MCP Tool',
            destination: undefined,
            inputs: [],
            primary: true,
          } as WarpMcpAction,
        ],
      }

      const result = await executor.execute(mcpWarp, [])

      expect(result.immediateExecutions.length).toBe(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('error')
      expect(execution.output._DATA).toBeDefined()
      expect(handlers.onError).toHaveBeenCalled()

      const errorMessage = execution.output._DATA instanceof Error
        ? execution.output._DATA.message
        : String(execution.output._DATA)
      expect(errorMessage).toContain('MCP action requires destination')
    })

    it('handles error when mcp sdk is not installed or connection fails', async () => {
      const mcpWarp: Warp = {
        ...warp,
        chain: 'multiversx',
        actions: [
          {
            type: 'mcp' as const,
            label: 'MCP Tool',
            destination: {
              url: 'https://mcp.example.com',
              tool: 'test_tool',
            },
            inputs: [
              {
                name: 'name',
                type: 'string',
                source: 'field' as const,
                position: 'payload:name',
              },
            ],
            primary: true,
          } as WarpMcpAction,
        ],
      }

      const inputs = ['string:Test Product']
      const result = await executor.execute(mcpWarp, inputs)

      expect(result.immediateExecutions.length).toBe(1)
      const execution = result.immediateExecutions[0]
      expect(execution.status).toBe('error')
      expect(execution.output._DATA).toBeDefined()
      expect(handlers.onError).toHaveBeenCalled()

      const errorMessage = execution.output._DATA instanceof Error
        ? execution.output._DATA.message
        : String(execution.output._DATA)
      expect(errorMessage.length).toBeGreaterThan(0)
    })
  })
})
