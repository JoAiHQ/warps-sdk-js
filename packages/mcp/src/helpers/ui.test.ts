import { Warp, WarpChainName } from '@joai/warps'
import fetchMock from 'jest-fetch-mock'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createAppResource } from './ui'

const mockConfig = { env: 'mainnet' as const }

describe('createAppResource', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  it('creates app resource with HTML component from URL', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_app',
      title: { en: 'Test App' },
      description: { en: 'Test description' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'test_app',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    const mockHtmlContent = `<!DOCTYPE html>
<html data-theme="auto">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>body { margin: 0; }</style>
</head>
<body>
<div id="root"></div>
<script type="module">
console.log('Hello World');
</script>
</body>
</html>`

    fetchMock.mockResponseOnce(mockHtmlContent)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    expect(result!.name).toBe('test_app')
    expect(result!.uri).toBe('ui://widget/test_app')
    expect(result!.mimeType).toBe('text/html;profile=mcp-app')
    expect(result!.description).toBe('MCP app for test_app')
    expect(result!.content).toBe(mockHtmlContent)
  })

  it('handles component download failure', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'download_fail_test',
      title: { en: 'Download Fail Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/missing.html',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'download_fail_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    fetchMock.mockResponseOnce('', { status: 404 })

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })

  it('loads HTML content directly', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'structure_test',
      title: { en: 'Structure Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'structure_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    const mockHtmlContent = `<!DOCTYPE html>
<html>
<body>
<div id="root"></div>
<script type="module">console.log("test");</script>
</body>
</html>`
    fetchMock.mockResponseOnce(mockHtmlContent)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeDefined()
    expect(result!.content).toBe(mockHtmlContent)
    expect(result!.content).toMatch(/<div id="root"><\/div>/)
    expect(result!.content).toMatch(/<script type="module">/)
    expect(result!.content).toContain('console.log("test");')
  })

  it('returns null when warp has no meta identifier', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'no_meta_test',
      title: { en: 'No Meta Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: 'https://example.com/app.html',
    }

    const mockHtmlContent = '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
    fetchMock.mockResponseOnce(mockHtmlContent)

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })

  it('rejects non-URL paths', async () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'local_file_test',
      title: { en: 'Local File Test' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      ui: './dist/app.html',
      meta: {
        chain: 'multiversx' as WarpChainName,
        identifier: 'local_file_test',
        query: null,
        hash: 'test_hash',
        creator: 'test_creator',
        createdAt: '2024-01-01T00:00:00Z',
      },
    }

    const result = await createAppResource(warp, warp.ui!, mockConfig)

    expect(result).toBeNull()
  })
})
