import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { Warp, WarpClientConfig } from '@joai/warps'
import { convertMcpToolToWarp } from './helpers/warps'

export class WarpMcp {
  constructor(private readonly config: WarpClientConfig) {}

  async getWarpsFromTools(url: string, headers?: Record<string, string>): Promise<Warp[]> {
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: headers || {} },
    })

    const client = new Client({ name: 'warps-mcp-client', version: '1.0.0' }, { capabilities: {} })

    try {
      await client.connect(transport)

      const tools = await client.listTools()

      await client.close()

      return await Promise.all(tools.tools.map((tool) => convertMcpToolToWarp(this.config, tool, url, headers)))
    } catch (error) {
      await client.close().catch(() => {})
      throw error
    }
  }
}
