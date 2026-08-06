const mockMcpServerCtor = jest.fn()

jest.mock('@modelcontextprotocol/server', () => ({
  McpServer: mockMcpServerCtor,
  fromJsonSchema: (schema: unknown) => ({ __jsonSchema: schema }),
}))

import { createMcpServerFromWarps } from './server'

const createMockServerInstance = () => ({
  registerTool: jest.fn(),
  registerResource: jest.fn(),
  registerPrompt: jest.fn(),
})

describe('createMcpServerFromWarps', () => {
  let server: ReturnType<typeof createMockServerInstance>

  beforeEach(() => {
    jest.clearAllMocks()
    server = createMockServerInstance()
    mockMcpServerCtor.mockImplementation(() => server)
  })

  it('passes MCP app ui permissions through on resources', async () => {
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

    expect(server.registerResource).toHaveBeenCalledTimes(1)
    expect(server.registerResource.mock.calls[0]?.[2]).toMatchObject({
      _meta: {
        ui: {
          permissions: {
            camera: {},
            clipboardWrite: {},
          },
        },
      },
    })
    const resourceHandler = server.registerResource.mock.calls[0]?.[3] as () => Promise<{ contents: Array<Record<string, any>> }>
    expect(resourceHandler).toBeDefined()

    const result = await resourceHandler()
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

    const resourceHandler = server.registerResource.mock.calls[0]?.[3] as () => Promise<{ contents: Array<Record<string, any>> }>
    const result = await resourceHandler()

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

    expect(server.registerResource).toHaveBeenCalledTimes(1)
    expect(server.registerResource.mock.calls[0]?.[1]).toBe('ui://widget/test-no-mime')
    expect(server.registerResource.mock.calls[0]?.[2]).toMatchObject({ mimeType: 'text/html;profile=mcp-app' })
  })
})
