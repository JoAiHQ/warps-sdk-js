import {
  buildWarpDirectIdentifierFromMcpToolCall,
  hasMcpAppUi,
  isMcpToolCallAllowedForWarp,
  resolveMcpAppWarpEmbedModel,
  resolveMcpToolCallToWarpDirect,
  normalizeMcpToolNameToWarpIdentifier,
  resolveMcpAppInputsPayload,
  resolveMcpAppOutputPayload,
} from './apps'

describe('resolveMcpAppInputsPayload', () => {
  it('prefers query payload when available', () => {
    expect(resolveMcpAppInputsPayload({ query: { amount: '1' }, contentInputs: { ignored: true } })).toEqual({ amount: '1' })
  })

  it('falls back to content inputs payload', () => {
    expect(resolveMcpAppInputsPayload({ contentInputs: { token: 'EGLD' } })).toEqual({ token: 'EGLD' })
  })

  it('falls back to raw inputs array payload', () => {
    expect(resolveMcpAppInputsPayload({ metaInputs: ['x', 'y'] })).toEqual({ inputs: ['x', 'y'] })
  })

  it('returns null when no valid payload exists', () => {
    expect(resolveMcpAppInputsPayload({ query: [], contentInputs: null })).toBeNull()
  })
})

describe('resolveMcpAppOutputPayload', () => {
  it('prefers meta output payload', () => {
    expect(resolveMcpAppOutputPayload({ metaOutput: { ok: true }, contentOutput: { ignored: true } })).toEqual({ ok: true })
  })

  it('falls back to content output payload', () => {
    expect(resolveMcpAppOutputPayload({ contentOutput: { tx: 'abc' } })).toEqual({ tx: 'abc' })
  })

  it('returns null when payload is not an object', () => {
    expect(resolveMcpAppOutputPayload({ metaOutput: 'x' })).toBeNull()
  })
})

describe('normalizeMcpToolNameToWarpIdentifier', () => {
  it('keeps @ identifiers unchanged', () => {
    expect(normalizeMcpToolNameToWarpIdentifier('@multiversx:swap-egld')).toBe('@multiversx:swap-egld')
  })

  it('prefixes colon identifiers with @', () => {
    expect(normalizeMcpToolNameToWarpIdentifier('multiversx:swap-egld')).toBe('@multiversx:swap-egld')
  })

  it('keeps non-colon names unchanged', () => {
    expect(normalizeMcpToolNameToWarpIdentifier('multiversx.swap.egld')).toBe('multiversx.swap.egld')
  })
})

describe('buildWarpDirectIdentifierFromMcpToolCall', () => {
  it('builds identifier with serialized query args', () => {
    const result = buildWarpDirectIdentifierFromMcpToolCall('multiversx:swap-egld', {
      amount: '100',
      route: ['wegld', 'cols'],
      skip: null,
    })

    expect(result).toContain('@multiversx:swap-egld?')
    expect(result).toContain('amount=100')
    expect(result).toContain('route=%5B%22wegld%22%2C%22cols%22%5D')
    expect(result).not.toContain('skip=')
  })
})

describe('isMcpToolCallAllowedForWarp', () => {
  it('allows when no active warp is provided', () => {
    expect(isMcpToolCallAllowedForWarp({ requestedToolName: 'multiversx:swap-egld' })).toBe(true)
  })

  it('allows when requested tool matches active warp', () => {
    expect(
      isMcpToolCallAllowedForWarp({
        requestedToolName: 'multiversx:swap-egld',
        activeWarpIdentifier: '@multiversx:swap-egld',
      })
    ).toBe(true)
  })

  it('rejects when requested tool differs from active warp', () => {
    expect(
      isMcpToolCallAllowedForWarp({
        requestedToolName: 'multiversx.other.tool',
        activeWarpIdentifier: '@multiversx:swap-egld',
      })
    ).toBe(false)
  })
})

describe('hasMcpAppUi', () => {
  it('returns true for app ui URLs and false for table/non-string', () => {
    expect(hasMcpAppUi('https://example.com/ui.html')).toBe(true)
    expect(hasMcpAppUi('table')).toBe(false)
    expect(hasMcpAppUi(null)).toBe(false)
  })
})

describe('resolveMcpAppWarpEmbedModel', () => {
  it('builds full mcp-app view model', () => {
    expect(
      resolveMcpAppWarpEmbedModel({
        ui: 'https://example.com/ui.html',
        query: { amount: '1' },
        metaOutput: { ok: true },
      })
    ).toEqual({
      isMcpApp: true,
      inputsPayload: { amount: '1' },
      outputPayload: { ok: true },
    })
  })
})

describe('resolveMcpToolCallToWarpDirect', () => {
  it('returns allowed warp-direct plan for matching active tool', () => {
    expect(
      resolveMcpToolCallToWarpDirect({
        requestedToolName: 'multiversx:swap-egld',
        activeWarpIdentifier: '@multiversx:swap-egld',
        args: { amount: '100' },
      })
    ).toEqual({
      allowed: true,
      warpIdentifier: '@multiversx:swap-egld?amount=100',
    })
  })
})
