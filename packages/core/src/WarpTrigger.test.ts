import { WarpChainName } from './constants'
import { createMockConfig } from './test-utils/sharedMocks'
import { Warp } from './types'
import { WarpValidator } from './WarpValidator'
import { matchesTrigger, resolveInputs, resolvePath } from './WarpWebhookTriggerMatcher'

const localSchema = { type: 'object' }

;(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(localSchema),
  } as Response)
)

const createWarp = (overrides: Partial<Warp> = {}): Warp => ({
  protocol: 'warp:3.0.0',
  name: 'test',
  title: 'Test',
  description: null,
  chain: WarpChainName.Multiversx,
  actions: [],
  ...overrides,
})

describe('WarpTrigger — webhook', () => {
  const config = createMockConfig()

  it('accepts a webhook trigger with uppercase input keys', async () => {
    const validator = new WarpValidator(config)
    const warp = createWarp({
      trigger: {
        type: 'webhook',
        source: 'readwise',
        inputs: { URL: 'document.url', TITLE: 'document.title', SOURCE_EXTERNAL_ID: 'document.id' },
      },
    })
    const result = await validator.validate(warp)
    expect(result.errors.filter((e) => e.includes('trigger input'))).toHaveLength(0)
  })

  it('rejects a webhook trigger with lowercase input keys', async () => {
    const validator = new WarpValidator(config)
    const warp = createWarp({
      trigger: {
        type: 'webhook',
        source: 'readwise',
        inputs: { url: 'document.url', title: 'document.title' },
      },
    })
    const result = await validator.validate(warp)
    const triggerErrors = result.errors.filter((e) => e.includes('Webhook trigger input'))
    expect(triggerErrors).toContain("Webhook trigger input name 'url' must be uppercase")
    expect(triggerErrors).toContain("Webhook trigger input name 'title' must be uppercase")
  })

  it('accepts a webhook trigger with no inputs', async () => {
    const validator = new WarpValidator(config)
    const warp = createWarp({
      trigger: { type: 'webhook', source: 'sentry' },
    })
    const result = await validator.validate(warp)
    expect(result.errors.filter((e) => e.includes('trigger input'))).toHaveLength(0)
  })

  it('does not check inputs for non-webhook triggers', async () => {
    const validator = new WarpValidator(config)
    const warp = createWarp({
      trigger: { type: 'message', pattern: 'hello' },
    })
    const result = await validator.validate(warp)
    expect(result.errors.filter((e) => e.includes('trigger input'))).toHaveLength(0)
  })

  it('next field on warp is independent from trigger', async () => {
    const warp = createWarp({
      trigger: {
        type: 'webhook',
        source: 'sentry',
        inputs: { TITLE: 'data.issue.title', URL: 'data.issue.permalink' },
      },
      next: '@joai-item-create?title={{TITLE}}&url={{URL}}',
    })
    expect(warp.next).toBe('@joai-item-create?title={{TITLE}}&url={{URL}}')
    expect((warp.trigger as any).next).toBeUndefined()
  })

  it('accepts a webhook trigger with match conditions', async () => {
    const validator = new WarpValidator(config)
    const warp = createWarp({
      trigger: {
        type: 'webhook',
        source: 'readwise',
        match: { event_type: 'readwise.highlight.created' },
        inputs: { TEXT: 'highlight.text' },
      },
    })
    const result = await validator.validate(warp)
    expect(result.errors.filter((e) => e.includes('trigger'))).toHaveLength(0)
  })
})

const highlightPayload = {
  event_type: 'readwise.highlight.created',
  highlight: {
    text: 'The key insight is that simplicity scales.',
    note: 'Apply this to API design',
    book_title: 'A Philosophy of Software Design',
  },
}

describe('resolvePath', () => {
  it('resolves a shallow key', () => {
    expect(resolvePath({ event_type: 'highlight.created' }, 'event_type')).toBe('highlight.created')
  })

  it('resolves a nested dot-path', () => {
    expect(resolvePath(highlightPayload, 'highlight.text')).toBe('The key insight is that simplicity scales.')
  })

  it('resolves deeply nested paths', () => {
    expect(resolvePath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for a missing path', () => {
    expect(resolvePath(highlightPayload, 'highlight.missing')).toBeUndefined()
  })

  it('returns undefined when an intermediate key is missing', () => {
    expect(resolvePath(highlightPayload, 'document.url')).toBeUndefined()
  })
})

describe('matchesTrigger', () => {
  const trigger = {
    type: 'webhook' as const,
    source: 'readwise',
    match: { event_type: 'readwise.highlight.created' },
    inputs: { TEXT: 'highlight.text' },
  }

  it('matches when the payload satisfies all conditions', () => {
    expect(matchesTrigger(trigger, highlightPayload)).toBe(true)
  })

  it('does not match when a condition value differs', () => {
    expect(matchesTrigger(trigger, { ...highlightPayload, event_type: 'reader.document.finished' })).toBe(false)
  })

  it('does not match when the condition field is missing from the payload', () => {
    expect(matchesTrigger(trigger, { highlight: highlightPayload.highlight })).toBe(false)
  })

  it('matches when trigger has no match conditions (fires for all events)', () => {
    expect(matchesTrigger({ type: 'webhook', source: 'readwise' }, highlightPayload)).toBe(true)
  })

  it('matches when match is an empty object', () => {
    expect(matchesTrigger({ type: 'webhook', source: 'readwise', match: {} }, highlightPayload)).toBe(true)
  })

  it('matches numeric condition values', () => {
    const t = { type: 'webhook' as const, source: 'stripe', match: { 'data.amount': 100 } }
    expect(matchesTrigger(t, { data: { amount: 100 } })).toBe(true)
    expect(matchesTrigger(t, { data: { amount: 200 } })).toBe(false)
  })

  it('matches boolean condition values', () => {
    const t = { type: 'webhook' as const, source: 'custom', match: { active: true } }
    expect(matchesTrigger(t, { active: true })).toBe(true)
    expect(matchesTrigger(t, { active: false })).toBe(false)
  })

  it('requires all conditions to pass', () => {
    const t = { type: 'webhook' as const, source: 'github', match: { action: 'opened', 'pull_request.draft': false } }
    expect(matchesTrigger(t, { action: 'opened', pull_request: { draft: false } })).toBe(true)
    expect(matchesTrigger(t, { action: 'opened', pull_request: { draft: true } })).toBe(false)
    expect(matchesTrigger(t, { action: 'closed', pull_request: { draft: false } })).toBe(false)
  })
})

describe('resolveInputs', () => {
  const trigger = {
    type: 'webhook' as const,
    source: 'readwise',
    match: { event_type: 'readwise.highlight.created' },
    inputs: { TEXT: 'highlight.text', NOTE: 'highlight.note', SOURCE: 'readwise' },
  }

  it('resolves dot-path inputs from the payload', () => {
    const result = resolveInputs(trigger, highlightPayload)
    expect(result.TEXT).toBe('The key insight is that simplicity scales.')
    expect(result.NOTE).toBe('Apply this to API design')
  })

  it('returns static literals for values without dots', () => {
    expect(resolveInputs(trigger, highlightPayload).SOURCE).toBe('readwise')
  })

  it('returns undefined for missing dot-paths', () => {
    expect(resolveInputs(trigger, {}).TEXT).toBeUndefined()
  })

  it('returns empty object when trigger has no inputs', () => {
    expect(resolveInputs({ type: 'webhook', source: 'x' }, highlightPayload)).toEqual({})
  })
})
