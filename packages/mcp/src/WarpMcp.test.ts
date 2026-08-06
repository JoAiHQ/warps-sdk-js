import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { WarpMcpAction } from '@joai/warps'
import { WarpMcp } from './WarpMcp'

jest.mock('@modelcontextprotocol/client')
jest.mock('@modelcontextprotocol/client')

describe('WarpMcp', () => {
  const mockUrl = 'https://mcp.example.com'
  const mockHeaders = { Authorization: 'Bearer test-token' }

  let mockClient: jest.Mocked<Client>
  let mockTransport: jest.Mocked<StreamableHTTPClientTransport>
  let warpMcp: WarpMcp

  beforeEach(() => {
    jest.clearAllMocks()

    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any

    mockTransport = {} as any
    ;(Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockClient)
    ;(StreamableHTTPClientTransport as jest.MockedClass<typeof StreamableHTTPClientTransport>).mockImplementation(() => mockTransport)

    warpMcp = new WarpMcp({ env: 'mainnet' })
  })

  it('connects to MCP server and lists tools', async () => {
    const mockTools = {
      tools: [
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }

    mockClient.listTools.mockResolvedValue(mockTools as any)

    const warps = await warpMcp.getWarpsFromTools(mockUrl, mockHeaders)

    expect(Client).toHaveBeenCalledWith({ name: 'warps-mcp-client', version: '1.0.0' }, { capabilities: {} })
    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL(mockUrl), {
      requestInit: { headers: mockHeaders },
    })
    expect(mockClient.connect).toHaveBeenCalledWith(mockTransport)
    expect(mockClient.listTools).toHaveBeenCalled()
    expect(mockClient.close).toHaveBeenCalled()
    expect(warps).toHaveLength(2)
    expect(warps[0].name).toBe('tool1')
    expect(warps[0].protocol).toBe('warp:3.0.0')
    expect(warps[0].actions[0].type).toBe('mcp')
    const mcpAction = warps[0].actions[0] as WarpMcpAction
    expect(mcpAction.destination?.url).toBe(mockUrl)
    expect(mcpAction.destination?.tool).toBe('tool1')
    expect(warps[1].name).toBe('tool2')
    expect(warps[1].protocol).toBe('warp:3.0.0')
  })

  it('handles connection without headers', async () => {
    const mockTools = {
      tools: [
        {
          name: 'tool1',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }

    mockClient.listTools.mockResolvedValue(mockTools as any)

    const warps = await warpMcp.getWarpsFromTools(mockUrl)

    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL(mockUrl), {
      requestInit: { headers: {} },
    })
    expect(warps).toHaveLength(1)
    const mcpAction = warps[0].actions[0] as WarpMcpAction
    expect(mcpAction.destination?.headers).toBeUndefined()
  })

  it('closes client on error', async () => {
    const error = new Error('Connection failed')
    mockClient.connect.mockRejectedValue(error)

    await expect(warpMcp.getWarpsFromTools(mockUrl, mockHeaders)).rejects.toThrow('Connection failed')
    expect(mockClient.close).toHaveBeenCalled()
  })

  it('handles close error gracefully on success path', async () => {
    const mockTools = {
      tools: [
        {
          name: 'tool1',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }

    mockClient.listTools.mockResolvedValue(mockTools as any)
    mockClient.close.mockResolvedValue(undefined)

    const warps = await warpMcp.getWarpsFromTools(mockUrl)

    expect(warps).toHaveLength(1)
    expect(mockClient.close).toHaveBeenCalled()
  })
})
