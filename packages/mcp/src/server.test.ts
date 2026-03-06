const mockRegisterAppTool = jest.fn()
const mockRegisterAppResource = jest.fn()
const mockNormalizeObjectSchema = jest.fn((schema) => schema)

const mockMcpServerCtor = jest.fn()

jest.mock('@modelcontextprotocol/ext-apps/server', () => ({
  registerAppTool: mockRegisterAppTool,
  registerAppResource: mockRegisterAppResource,
}))

jest.mock('@modelcontextprotocol/sdk/server/zod-compat.js', () => ({
  normalizeObjectSchema: mockNormalizeObjectSchema,
}))

jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: mockMcpServerCtor,
}))

import { createMcpServerFromWarps } from './server'

const createMockServerInstance = () => ({
  registerTool: jest.fn(),
  registerResource: jest.fn(),
  registerPrompt: jest.fn(),
})

describe('createMcpServerFromWarps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMcpServerCtor.mockImplementation(() => createMockServerInstance())
  })

  it('passes MCP app ui permissions through without legacy normalization', async () => {
    createMcpServerFromWarps(
      { name: 'test-server' },
      [{ name: 'test-warp' } as any],
      [
        {
          resource: {
            name: 'test-ui',
            uri: 'ui://widget/test',
            mimeType: 'text/html;profile=mcp-app',
            content: '<html></html>',
            meta: {
              ui: {
                permissions: {
                  camera: {},
                  clipboardWrite: {},
                },
              },
            },
          },
        },
      ],
      jest.fn()
    )

    expect(mockRegisterAppResource).toHaveBeenCalledTimes(1)
    expect(mockRegisterAppResource.mock.calls[0]?.[3]).toMatchObject({
      _meta: {
        ui: {
          permissions: {
            camera: {},
            clipboardWrite: {},
          },
        },
      },
    })
    const resourceHandler = mockRegisterAppResource.mock.calls[0]?.[4] as (() => Promise<{ contents: Array<Record<string, any>> }>) | undefined
    expect(resourceHandler).toBeDefined()

    const result = await resourceHandler!()
    expect(result.contents[0]?._meta?.ui?.permissions).toEqual({
      camera: {},
      clipboardWrite: {},
    })
  })

  it('preserves non-ui metadata on MCP app resources', async () => {
    createMcpServerFromWarps(
      { name: 'test-server' },
      [{ name: 'test-warp' } as any],
      [
        {
          resource: {
            name: 'test-ui',
            uri: 'ui://widget/test',
            mimeType: 'text/html;profile=mcp-app',
            content: '<html></html>',
            meta: {
              ui: {
                permissions: { microphone: {} },
              },
              custom: { hello: 'world' },
            },
          },
        },
      ],
      jest.fn()
    )

    const resourceHandler = mockRegisterAppResource.mock.calls[0]?.[4] as (() => Promise<{ contents: Array<Record<string, any>> }>) | undefined
    const result = await resourceHandler!()

    expect(result.contents[0]?._meta).toMatchObject({
      ui: { permissions: { microphone: {} } },
      custom: { hello: 'world' },
    })
  })

  it('registers ui:// resources as MCP app resources even when mimeType is omitted', () => {
    createMcpServerFromWarps(
      { name: 'test-server' },
      [{ name: 'test-warp' } as any],
      [
        {
          resource: {
            name: 'test-ui',
            uri: 'ui://widget/test-no-mime',
            content: '<html></html>',
          },
        },
      ],
      jest.fn()
    )

    expect(mockRegisterAppResource).toHaveBeenCalledTimes(1)
    expect(mockRegisterAppResource.mock.calls[0]?.[2]).toBe('ui://widget/test-no-mime')
  })
})
