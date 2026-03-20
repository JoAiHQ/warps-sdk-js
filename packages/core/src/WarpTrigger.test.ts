import { WarpChainName } from './constants'
import { createMockConfig } from './test-utils/sharedMocks'
import { Warp } from './types'
import { WarpValidator } from './WarpValidator'

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
})
