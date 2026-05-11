import { WarpExecutionOutput } from '../types/output'
import { WarpNextConfig } from '../types/warp'
import { getNextInfo, getNextInfoForStatus, resolveNextString, resolveNextStrings } from './next'

const emptyOutput: WarpExecutionOutput = {}

describe('resolveNextStrings', () => {
  describe('plain string (backward compatible)', () => {
    it('returns [string] on success path', () => {
      expect(resolveNextStrings('@some-warp', 'success')).toEqual(['@some-warp'])
    })

    it('returns null on error path', () => {
      expect(resolveNextStrings('@some-warp', 'error')).toBeNull()
    })

    it('returns null for nullish input', () => {
      expect(resolveNextStrings(null, 'success')).toBeNull()
      expect(resolveNextStrings(undefined, 'success')).toBeNull()
    })
  })

  describe('string array (backward compatible)', () => {
    it('returns array on success path', () => {
      expect(resolveNextStrings(['@a', '@b'], 'success')).toEqual(['@a', '@b'])
    })

    it('returns null on error path', () => {
      expect(resolveNextStrings(['@a', '@b'], 'error')).toBeNull()
    })
  })

  describe('object with success/error paths', () => {
    const config: WarpNextConfig = { success: '@on-ok', error: '@on-err' }

    it('returns success path for success', () => {
      expect(resolveNextStrings(config, 'success')).toEqual(['@on-ok'])
    })

    it('returns error path for error', () => {
      expect(resolveNextStrings(config, 'error')).toEqual(['@on-err'])
    })
  })

  describe('when conditions', () => {
    const output: WarpExecutionOutput = { MESSAGE: 'urgent bounty', COUNT: 3, STATUS: 'done' }

    it('filters out entries with when condition that evaluates to false', () => {
      const config: WarpNextConfig = [
        { identifier: '@send-if-match', when: "{{MESSAGE}} !== '' && {{MESSAGE}} !== undefined" },
        '@always-send',
      ]
      expect(resolveNextStrings(config, 'success', output)).toEqual(['@send-if-match', '@always-send'])
    })

    it('skips entry when when condition is false', () => {
      const config: WarpNextConfig = [
        { identifier: '@skip', when: "{{MESSAGE}} === ''" },
        '@send',
      ]
      expect(resolveNextStrings(config, 'success', output)).toEqual(['@send'])
    })

    it('skips all entries when all when conditions are false', () => {
      const config: WarpNextConfig = [
        { identifier: '@skip1', when: "{{MESSAGE}} === ''" },
        { identifier: '@skip2', when: '{{COUNT}} === 0' },
      ]
      expect(resolveNextStrings(config, 'success', output)).toBeNull()
    })

    it('passes through plain strings and truthy when entries', () => {
      const config: WarpNextConfig = [
        '@always',
        { identifier: '@conditional', when: '{{COUNT}} > 0' },
      ]
      expect(resolveNextStrings(config, 'success', output)).toEqual(['@always', '@conditional'])
    })

    it('works with success/error object syntax', () => {
      const config: WarpNextConfig = {
        success: [
          { identifier: '@conditional', when: '{{STATUS}} === "done"' },
          { identifier: '@skip', when: '{{STATUS}} === "pending"' },
        ],
        error: '@on-error',
      }
      expect(resolveNextStrings(config, 'success', output)).toEqual(['@conditional'])
      expect(resolveNextStrings(config, 'error', output)).toEqual(['@on-error'])
    })

    it('handles a single WarpNextEntry object (not in array) as the config', () => {
      expect(resolveNextStrings({ identifier: '@warp', when: '{{COUNT}} > 0' }, 'success', output)).toEqual(['@warp'])
      expect(resolveNextStrings({ identifier: '@warp', when: '{{COUNT}} === 0' }, 'success', output)).toBeNull()
    })

    it('returns null on error path for a single WarpNextEntry object', () => {
      expect(resolveNextStrings({ identifier: '@warp' }, 'error')).toBeNull()
    })

    it('correctly handles when variable present in output bag but with non-matching value', () => {
      const config: WarpNextConfig = [
        { identifier: '@skip', when: '{{COUNT}} === 0' },
        { identifier: '@keep', when: '{{COUNT}} > 0' },
      ]
      expect(resolveNextStrings(config, 'success', output)).toEqual(['@keep'])
    })

    it('returns null when no output provided and when conditions cannot be evaluated (treats as pass-through)', () => {
      const config: WarpNextConfig = [
        { identifier: '@conditional', when: '{{MESSAGE}} !== ""' },
      ]
      expect(resolveNextStrings(config, 'success')).toEqual(['@conditional'])
    })
  })
})

describe('resolveNextString', () => {
  it('returns the first string', () => {
    expect(resolveNextString(['@a', '@b'], 'success')).toBe('@a')
  })

  it('returns null on error path for string', () => {
    expect(resolveNextString('@warp', 'error')).toBeNull()
  })

  it('respects when conditions', () => {
    const output: WarpExecutionOutput = { MESSAGE: '' }
    const config: WarpNextConfig = [
      { identifier: '@skip', when: "{{MESSAGE}} !== '' && {{MESSAGE}} !== undefined" },
      '@fallback',
    ]
    expect(resolveNextString(config, 'success', output)).toBe('@fallback')
  })
})

describe('edge cases', () => {
  it('throws when when expression has invalid syntax', () => {
    const config: WarpNextConfig = { identifier: '@warp', when: 'invalid syntax !!!' }
    expect(() => resolveNextStrings(config, 'success', emptyOutput)).toThrow()
  })
})

describe('getNextInfo', () => {
  const mockConfig = {} as any
  const mockAdapters = [] as any

  const makeWarp = (next?: WarpNextConfig) => ({
    protocol: 'warp:3.0.0',
    chain: 'multiversx',
    name: 'test',
    title: 'Test',
    description: null,
    actions: [{ type: 'prompt' as const, label: 'Prompt' }],
    next,
  })

  it('returns null when no next is configured', () => {
    const warp = makeWarp()
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, emptyOutput)
    expect(result).toBeNull()
  })

  it('returns next info for a plain string next', () => {
    const warp = makeWarp('@next-warp')
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, emptyOutput)
    expect(result).not.toBeNull()
    expect(result![0].identifier).toContain('next-warp')
  })

  it('excludes next entries with failing when conditions', () => {
    const output: WarpExecutionOutput = { MESSAGE: '' }
    const warp = makeWarp([
      { identifier: '@send', when: "{{MESSAGE}} !== '' && {{MESSAGE}} !== undefined" },
      '@always',
    ])
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, output)
    expect(result).not.toBeNull()
    expect(result![0].identifier).toContain('always')
    expect(result!.length).toBe(1)
  })

  it('returns null when all entries are filtered out by when conditions', () => {
    const output: WarpExecutionOutput = { ACTIVE: true }
    const warp = makeWarp([
      { identifier: '@skip', when: '{{ACTIVE}} === false' },
    ])
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, output)
    expect(result).toBeNull()
  })

  it('prefers action-level next over warp-level next', () => {
    const output: WarpExecutionOutput = { MESSAGE: 'hello' }
    const warp = {
      ...makeWarp('@warp-level'),
      actions: [{ type: 'prompt' as const, label: 'Prompt', next: '@action-level' }],
    }
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, output)
    expect(result![0].identifier).toContain('action-level')
  })

  it('evaluates when condition against output bag — skips when variable present but condition false', () => {
    const output: WarpExecutionOutput = { MESSAGE: '' }
    const warp = makeWarp([
      { identifier: '@conditional', when: "{{MESSAGE}} !== ''" },
    ])
    const result = getNextInfo(mockConfig, mockAdapters, warp, 1, output)
    expect(result).toBeNull()
  })
})

describe('getNextInfoForStatus', () => {
  const mockConfig = {} as any
  const mockAdapters = [] as any

  const makeWarp = (next?: WarpNextConfig) => ({
    protocol: 'warp:3.0.0',
    chain: 'multiversx',
    name: 'test',
    title: 'Test',
    description: null,
    actions: [{ type: 'collect' as const, label: 'Collect' }],
    next,
  })

  it('uses error path when status is error', () => {
    const warp = makeWarp({ success: '@on-ok', error: '@on-err' })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, emptyOutput, 'error')
    expect(result![0].identifier).toContain('on-err')
  })

  it('uses success path when status is success', () => {
    const warp = makeWarp({ success: '@on-ok', error: '@on-err' })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, emptyOutput, 'success')
    expect(result![0].identifier).toContain('on-ok')
  })

  it('uses success path for unhandled status', () => {
    const warp = makeWarp({ success: '@on-ok', error: '@on-err' })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, emptyOutput, 'unhandled')
    expect(result![0].identifier).toContain('on-ok')
  })

  it('filters by when on success path', () => {
    const output: WarpExecutionOutput = { ENABLED: true }
    const warp = makeWarp({
      success: [
        { identifier: '@conditional', when: '{{ENABLED}} === true' },
        '@fallback',
      ],
    })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, output, 'success')
    expect(result![0].identifier).toContain('conditional')
    expect(result!.length).toBe(2)
  })

  it('filters by when on error path', () => {
    const output: WarpExecutionOutput = { RETRY: false }
    const warp = makeWarp({
      error: [
        { identifier: '@retry', when: '{{RETRY}} === true' },
        '@abort',
      ],
    })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, output, 'error')
    expect(result![0].identifier).toContain('abort')
    expect(result!.length).toBe(1)
  })

  it('applies when conditions on unhandled status (maps to success path)', () => {
    const output: WarpExecutionOutput = { ENABLED: false }
    const warp = makeWarp({
      success: [
        { identifier: '@conditional', when: '{{ENABLED}} === true' },
        '@fallback',
      ],
    })
    const result = getNextInfoForStatus(mockConfig, mockAdapters, warp, 1, output, 'unhandled')
    expect(result![0].identifier).toContain('fallback')
    expect(result!.length).toBe(1)
  })
})
