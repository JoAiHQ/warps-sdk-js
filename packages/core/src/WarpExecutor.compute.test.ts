import { WarpChainName } from './constants'
import { createMockAdapter, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { TransformRunner, WarpComputeAction } from './types'
import { WarpExecutor } from './WarpExecutor'

jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'),
  safeWindow: { open: jest.fn() },
}))

const createTransformRunner = (): TransformRunner => ({
  run: async (code: string, context: any) => {
    const fn = eval(code)
    return typeof fn === 'function' ? fn(context) : fn
  },
})

const makeComputeWarp = (overrides: Partial<WarpComputeAction> = {}) => ({
  ...createMockWarp(),
  chain: WarpChainName.Multiversx,
  actions: [
    {
      type: 'compute' as const,
      label: 'Compute',
      ...overrides,
    } as WarpComputeAction,
  ],
})

describe('WarpExecutor — compute action', () => {
  const config = createMockConfig({ transform: { runner: createTransformRunner() } })
  const adapters = [
    (() => {
      const a = createMockAdapter()
      a.chain = WarpChainName.Multiversx
      a.prefix = WarpChainName.Multiversx
      return a
    })(),
  ]

  let onExecuted: jest.Mock
  let onActionExecuted: jest.Mock
  let onActionUnhandled: jest.Mock
  let onError: jest.Mock
  let executor: WarpExecutor

  beforeEach(() => {
    onExecuted = jest.fn()
    onActionExecuted = jest.fn()
    onActionUnhandled = jest.fn()
    onError = jest.fn()
    executor = new WarpExecutor(config, adapters, { onExecuted, onActionExecuted, onActionUnhandled, onError })
  })

  it('returns success status (never unhandled)', async () => {
    const warp = makeComputeWarp({ inputs: [] })
    const result = await executor.execute(warp, [])

    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].status).toBe('success')
  })

  it('fires onActionExecuted, not onActionUnhandled', async () => {
    const warp = makeComputeWarp({ inputs: [] })
    await executor.execute(warp, [])

    expect(onActionExecuted).toHaveBeenCalledWith(expect.objectContaining({ execution: expect.objectContaining({ status: 'success' }) }))
    expect(onActionUnhandled).not.toHaveBeenCalled()
  })

  it('fires onExecuted with success result', async () => {
    const warp = makeComputeWarp({ inputs: [] })
    await executor.execute(warp, [])

    expect(onExecuted).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }))
  })

  it('resolves hidden transform inputs and returns mapped values', async () => {
    const warp = makeComputeWarp({
      inputs: [
        {
          name: 'result',
          as: 'result',
          type: 'uint64',
          source: 'hidden',
          modifier: 'transform:() => 42',
        },
      ],
    })

    const result = await executor.execute(warp, [])
    expect(result.immediateExecutions[0].status).toBe('success')
    expect(result.immediateExecutions[0].values.mapped).toMatchObject({ result: 42n })
  })

  it('resolves multiple hidden transform inputs', async () => {
    const warp = makeComputeWarp({
      inputs: [
        { name: 'correct', as: 'correct', type: 'bool', source: 'hidden', modifier: 'transform:() => true' },
        { name: 'message', as: 'message', type: 'string', source: 'hidden', modifier: "transform:() => 'hello'" },
      ],
    })

    const result = await executor.execute(warp, [])
    expect(result.immediateExecutions[0].values.mapped).toMatchObject({ correct: true, message: 'hello' })
  })

  it('succeeds with no inputs', async () => {
    const warp = makeComputeWarp({ inputs: [] })
    const result = await executor.execute(warp, [])

    expect(result.immediateExecutions[0].status).toBe('success')
    expect(result.immediateExecutions[0].values.mapped).toEqual({})
  })

  it('interpolates success message with computed values', async () => {
    const warp = {
      ...makeComputeWarp({
        inputs: [{ name: 'name', as: 'name', type: 'string', source: 'hidden', modifier: "transform:() => 'Alice'" }],
      }),
      messages: { success: 'Hello {{name}}!' },
    }

    const result = await executor.execute(warp, [])
    expect(result.immediateExecutions[0].messages.success).toBe('Hello Alice!')
  })

  it('skips execution and returns null immediate when when-condition is false', async () => {
    const warp = makeComputeWarp({ inputs: [], when: 'false' })
    const result = await executor.execute(warp, [])

    expect(result.immediateExecutions).toHaveLength(0)
    expect(onActionExecuted).not.toHaveBeenCalled()
  })

  it('executes when when-condition is true', async () => {
    const warp = makeComputeWarp({ inputs: [], when: 'true' })
    const result = await executor.execute(warp, [])

    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].status).toBe('success')
  })

  it('never calls fetch (no HTTP request)', async () => {
    const mockFetch = jest.fn()
    global.fetch = mockFetch as any

    const warp = makeComputeWarp({ inputs: [] })
    await executor.execute(warp, [])

    expect(mockFetch).not.toHaveBeenCalled()
  })

  describe('contrast with collect', () => {
    it('collect without destination returns unhandled; compute always returns success', async () => {
      const collectWarp = {
        ...createMockWarp(),
        chain: WarpChainName.Multiversx,
        actions: [{ type: 'collect' as const, label: 'Collect', inputs: [] }],
      }
      const computeWarp = makeComputeWarp({ inputs: [] })

      const collectResult = await executor.execute(collectWarp, [])
      const computeResult = await executor.execute(computeWarp, [])

      expect(collectResult.immediateExecutions[0].status).toBe('unhandled')
      expect(computeResult.immediateExecutions[0].status).toBe('success')
    })
  })
})

describe('getWarpInputAction — compute type', () => {
  it('detects compute as primary action when mixed with non-detectable types', async () => {
    const { getWarpInputAction } = await import('./helpers/general')
    const warp = {
      ...createMockWarp(),
      actions: [
        { type: 'state' as const, label: 'Read', op: 'read' as const, store: 'game', keys: [] },
        { type: 'compute' as const, label: 'Evaluate' },
        { type: 'state' as const, label: 'Write', op: 'write' as const, store: 'game', data: {} },
      ],
    }

    const { action } = getWarpInputAction(warp as any)
    expect(action.type).toBe('compute')
  })

  it('compute is picked before mcp in detectable order', async () => {
    const { getWarpInputAction } = await import('./helpers/general')
    const warp = {
      ...createMockWarp(),
      actions: [
        { type: 'compute' as const, label: 'Compute' },
        { type: 'mcp' as const, label: 'Mcp' },
      ],
    }

    const { action } = getWarpInputAction(warp as any)
    expect(action.type).toBe('compute')
  })
})
