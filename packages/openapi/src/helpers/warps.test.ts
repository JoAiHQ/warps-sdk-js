import { WarpClientConfig, buildGeneratedSourceWarpIdentifier } from '@joai/warps'
import { convertOpenApiToWarps } from './warps'
import { JsonLikeObject } from '../types'

const config: WarpClientConfig = { env: 'mainnet' }

const makeSpec = (overrides?: Partial<JsonLikeObject>): JsonLikeObject => ({
  openapi: '3.0.3',
  info: { title: 'Stream API' },
  servers: [{ url: 'https://stream.example.com' }],
  paths: {
    '/sessions/{sessionId}': {
      get: {
        operationId: 'getSession',
        summary: 'Get Session',
        description: 'Retrieve a session',
        parameters: [
          { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'verbose', in: 'query', schema: { type: 'boolean' } },
        ],
      },
    },
    '/messages': {
      post: {
        operationId: 'createMessage',
        summary: 'Create Message',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: { type: 'string' },
                  priority: { type: 'integer', default: 1 },
                },
              },
            },
          },
        },
      },
    },
  },
  ...overrides,
})

describe('convertOpenApiToWarps', () => {
  it('converts all operations to warps', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())
    expect(warps).toHaveLength(2)
  })

  it('creates collect actions with correct destination', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())

    const getSession = warps[0]
    const action = getSession.actions[0] as any
    expect(action.type).toBe('collect')
    expect(action.destination).toMatchObject({
      url: 'https://stream.example.com/sessions/{{sessionId}}',
      method: 'GET',
    })
    expect(action.destination.headers).toBeUndefined()
  })

  it('adds Content-Type header for POST with payload', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())

    const createMessage = warps[1]
    const action = createMessage.actions[0] as any
    expect(action.destination).toMatchObject({
      url: 'https://stream.example.com/messages',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('maps parameters to correct input positions', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())

    const action = warps[0].actions[0] as any
    expect(action.inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'sessionId', position: 'url:sessionId', required: true }),
        expect.objectContaining({ name: 'verbose', position: 'query:verbose', type: 'bool' }),
      ])
    )
  })

  it('maps payload inputs with correct positions', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())

    const action = warps[1].actions[0] as any
    expect(action.inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'text', position: 'payload:text', required: true, type: 'string' }),
        expect.objectContaining({ name: 'priority', position: 'payload:priority', default: 1, type: 'number' }),
      ])
    )
  })

  it('sets warp name as "ApiName: OperationTitle"', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec())
    expect(warps[0].name).toBe('Stream API: Get Session')
    expect(warps[1].name).toBe('Stream API: Create Message')
  })

  it('stamps meta with generated source identifier', async () => {
    const sourceUrl = 'https://stream.example.com/openapi.json'
    const warps = await convertOpenApiToWarps(config, makeSpec(), { sourceUrl })

    expect(warps[0].meta?.identifier).toBe(
      buildGeneratedSourceWarpIdentifier(
        { type: 'openapi', url: sourceUrl, contract: null },
        'getSession',
        'Stream API: Get Session'
      )
    )
  })

  it('filters by endpoints option', async () => {
    const warps = await convertOpenApiToWarps(config, makeSpec(), {
      endpoints: ['getSession'],
    })

    expect(warps).toHaveLength(1)
    expect(warps[0].name).toBe('Stream API: Get Session')
  })

  it('supports fallback endpoint identifiers (METHOD path)', async () => {
    const spec: JsonLikeObject = {
      paths: {
        '/status': {
          get: { summary: 'Get Status' },
        },
      },
    }

    const warps = await convertOpenApiToWarps(config, spec, {
      sourceUrl: 'https://api.example.com/spec.json',
      endpoints: ['GET /status'],
    })

    expect(warps).toHaveLength(1)
  })

  it('returns empty for spec without paths', async () => {
    const warps = await convertOpenApiToWarps(config, { info: {} })
    expect(warps).toEqual([])
  })
})
