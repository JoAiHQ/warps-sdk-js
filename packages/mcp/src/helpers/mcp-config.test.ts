import { buildAppMcpResourceMeta } from './mcp-config'

describe('buildAppMcpResourceMeta', () => {
  it('returns secure defaults when no config is provided', () => {
    expect(buildAppMcpResourceMeta()).toEqual({
      ui: {
        prefersBorder: true,
        csp: {
          connectDomains: [],
          resourceDomains: [],
          frameDomains: [],
          baseUriDomains: [],
        },
        permissions: {},
      },
    })
  })

  it('applies app-level overrides', () => {
    const result = buildAppMcpResourceMeta({
      prefersBorder: false,
      csp: {
        connectDomains: ['https://api.multiversx.com'],
      },
      permissions: { clipboardWrite: {} },
      domain: 'https://chatgpt.joai.ai',
    })

    expect(result).toEqual({
      ui: {
        prefersBorder: false,
        csp: {
          connectDomains: ['https://api.multiversx.com'],
          resourceDomains: [],
          frameDomains: [],
          baseUriDomains: [],
        },
        permissions: { clipboardWrite: {} },
        domain: 'https://chatgpt.joai.ai',
      },
    })
  })

  it('returns a new object on each call', () => {
    const a = buildAppMcpResourceMeta()
    const b = buildAppMcpResourceMeta()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.ui!.csp!.connectDomains).not.toBe(b.ui!.csp!.connectDomains)
  })

  it('omits domain when not provided', () => {
    const result = buildAppMcpResourceMeta({ prefersBorder: true })
    expect(result.ui).not.toHaveProperty('domain')
  })
})
