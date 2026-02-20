import {
  extractOpenApiEndpoints,
  extractOpenApiOperations,
  extractOpenApiParameters,
  extractOpenApiPayloadInputs,
  mergeOpenApiParameters,
  getOpenApiBaseUrl,
  buildOpenApiOperationUrl,
  mapOpenApiSchemaToWarpType,
  getOpenApiName,
} from './openapi'

describe('extractOpenApiEndpoints', () => {
  it('extracts operationIds from paths', () => {
    const spec = {
      paths: {
        '/users': {
          get: { operationId: 'listUsers' },
          post: { operationId: 'createUser' },
        },
        '/users/{id}': {
          get: { operationId: 'getUser' },
        },
      },
    }

    expect(extractOpenApiEndpoints(spec)).toEqual(['listUsers', 'createUser', 'getUser'])
  })

  it('falls back to METHOD /path when no operationId', () => {
    const spec = {
      paths: {
        '/status': {
          get: { summary: 'Get Status' },
        },
      },
    }

    expect(extractOpenApiEndpoints(spec)).toEqual(['GET /status'])
  })

  it('returns empty for non-object input', () => {
    expect(extractOpenApiEndpoints(null)).toEqual([])
    expect(extractOpenApiEndpoints('string')).toEqual([])
  })

  it('returns empty when no paths', () => {
    expect(extractOpenApiEndpoints({ info: {} })).toEqual([])
  })

  it('deduplicates endpoints', () => {
    const spec = {
      paths: {
        '/users': {
          get: { operationId: 'listUsers' },
        },
      },
    }
    const result = extractOpenApiEndpoints(spec)
    expect(new Set(result).size).toBe(result.length)
  })
})

describe('extractOpenApiOperations', () => {
  it('extracts operations with full details', () => {
    const spec = {
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/sessions/{sessionId}': {
          get: {
            operationId: 'getSession',
            summary: 'Get Session',
            description: 'Retrieve a session by ID',
            parameters: [
              { name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'verbose', in: 'query', schema: { type: 'boolean' } },
            ],
          },
        },
      },
    }

    const operations = extractOpenApiOperations(spec, 'https://api.example.com/openapi.json')
    expect(operations).toHaveLength(1)
    expect(operations[0]).toMatchObject({
      identifier: 'getSession',
      title: 'Get Session',
      description: 'Retrieve a session by ID',
      method: 'get',
      url: 'https://api.example.com/sessions/{{sessionId}}',
      parameters: [
        expect.objectContaining({ name: 'sessionId', in: 'path', required: true, type: 'string' }),
        expect.objectContaining({ name: 'verbose', in: 'query', required: false, type: 'bool' }),
      ],
    })
  })

  it('merges path-level and operation-level parameters', () => {
    const spec = {
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/items/{itemId}': {
          parameters: [
            { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          get: {
            operationId: 'getItem',
            summary: 'Get Item',
            parameters: [
              { name: 'fields', in: 'query', schema: { type: 'string' } },
            ],
          },
        },
      },
    }

    const operations = extractOpenApiOperations(spec)
    expect(operations[0].parameters).toHaveLength(2)
    expect(operations[0].parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'itemId', in: 'path' }),
        expect.objectContaining({ name: 'fields', in: 'query' }),
      ])
    )
  })

  it('uses fallback identifier when no operationId', () => {
    const spec = {
      paths: {
        '/status': {
          get: { summary: 'Get Status' },
        },
      },
    }

    const operations = extractOpenApiOperations(spec)
    expect(operations[0].identifier).toBe('GET /status')
  })

  it('uses identifier as title when no summary', () => {
    const spec = {
      paths: {
        '/ping': {
          get: {},
        },
      },
    }

    const operations = extractOpenApiOperations(spec)
    expect(operations[0].title).toBe('GET /ping')
  })

  it('generates default description when none provided', () => {
    const spec = {
      paths: {
        '/ping': {
          get: { operationId: 'ping' },
        },
      },
    }

    const operations = extractOpenApiOperations(spec)
    expect(operations[0].description).toBe('Call GET /ping')
  })

  it('returns empty when no paths', () => {
    expect(extractOpenApiOperations({ info: {} })).toEqual([])
  })

  it('extracts payload inputs from request body', () => {
    const spec = {
      servers: [{ url: 'https://api.example.com' }],
      paths: {
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
    }

    const operations = extractOpenApiOperations(spec)
    expect(operations[0].payloadInputs).toEqual([
      expect.objectContaining({ name: 'text', position: 'payload:text', required: true, type: 'string' }),
      expect.objectContaining({ name: 'priority', position: 'payload:priority', default: 1, type: 'number' }),
    ])
  })
})

describe('extractOpenApiParameters', () => {
  it('extracts path and query parameters', () => {
    const raw = [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
    ]

    const params = extractOpenApiParameters(raw)
    expect(params).toHaveLength(2)
    expect(params[0]).toMatchObject({ name: 'id', in: 'path', required: true, type: 'string' })
    expect(params[1]).toMatchObject({ name: 'limit', in: 'query', required: false, type: 'number' })
  })

  it('path parameters are always required', () => {
    const raw = [{ name: 'id', in: 'path', required: false, schema: { type: 'string' } }]
    expect(extractOpenApiParameters(raw)[0].required).toBe(true)
  })

  it('ignores non-path/query parameters', () => {
    const raw = [{ name: 'Authorization', in: 'header', schema: { type: 'string' } }]
    expect(extractOpenApiParameters(raw)).toEqual([])
  })

  it('returns empty for non-array input', () => {
    expect(extractOpenApiParameters(null)).toEqual([])
    expect(extractOpenApiParameters(undefined)).toEqual([])
  })

  it('extracts default values', () => {
    const raw = [{ name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }]
    expect(extractOpenApiParameters(raw)[0].defaultValue).toBe(1)
  })
})

describe('mergeOpenApiParameters', () => {
  it('operation parameters override path-level parameters', () => {
    const base = [{ name: 'id', in: 'path' as const, required: true, type: 'string' }]
    const operation = [{ name: 'id', in: 'path' as const, required: true, type: 'number', description: 'overridden' }]

    const result = mergeOpenApiParameters(base, operation)
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('overridden')
  })

  it('combines non-overlapping parameters', () => {
    const base = [{ name: 'id', in: 'path' as const, required: true, type: 'string' }]
    const operation = [{ name: 'verbose', in: 'query' as const, required: false, type: 'bool' }]

    const result = mergeOpenApiParameters(base, operation)
    expect(result).toHaveLength(2)
  })
})

describe('extractOpenApiPayloadInputs', () => {
  it('extracts properties from JSON request body', () => {
    const requestBody = {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', description: 'User name' },
              age: { type: 'integer' },
              active: { type: 'boolean' },
            },
          },
        },
      },
    }

    const inputs = extractOpenApiPayloadInputs(requestBody)
    expect(inputs).toHaveLength(3)
    expect(inputs[0]).toMatchObject({ name: 'name', position: 'payload:name', required: true, type: 'string' })
    expect(inputs[1]).toMatchObject({ name: 'age', position: 'payload:age', required: false, type: 'number' })
    expect(inputs[2]).toMatchObject({ name: 'active', position: 'payload:active', required: false, type: 'bool' })
  })

  it('returns empty for missing request body', () => {
    expect(extractOpenApiPayloadInputs(null)).toEqual([])
    expect(extractOpenApiPayloadInputs(undefined)).toEqual([])
  })

  it('returns empty for non-JSON content type', () => {
    const requestBody = {
      content: {
        'text/plain': { schema: { type: 'string' } },
      },
    }
    expect(extractOpenApiPayloadInputs(requestBody)).toEqual([])
  })
})

describe('mapOpenApiSchemaToWarpType', () => {
  it('maps boolean to bool', () => {
    expect(mapOpenApiSchemaToWarpType({ type: 'boolean' })).toBe('bool')
  })

  it('maps integer to number', () => {
    expect(mapOpenApiSchemaToWarpType({ type: 'integer' })).toBe('number')
  })

  it('maps number to number', () => {
    expect(mapOpenApiSchemaToWarpType({ type: 'number' })).toBe('number')
  })

  it('defaults to string', () => {
    expect(mapOpenApiSchemaToWarpType({ type: 'string' })).toBe('string')
    expect(mapOpenApiSchemaToWarpType({ type: 'array' })).toBe('string')
    expect(mapOpenApiSchemaToWarpType(null)).toBe('string')
  })
})

describe('getOpenApiBaseUrl', () => {
  it('uses servers[0].url when available', () => {
    const schema = { servers: [{ url: 'https://api.example.com' }] }
    expect(getOpenApiBaseUrl(schema)).toBe('https://api.example.com')
  })

  it('resolves relative server URL against source URL', () => {
    const schema = { servers: [{ url: '/v1' }] }
    expect(getOpenApiBaseUrl(schema, 'https://api.example.com/openapi.json')).toBe('https://api.example.com/v1')
  })

  it('falls back to source URL host', () => {
    const schema = {}
    expect(getOpenApiBaseUrl(schema, 'https://api.example.com/docs/openapi.json')).toBe('https://api.example.com')
  })

  it('returns empty when no info available', () => {
    expect(getOpenApiBaseUrl({})).toBe('')
  })
})

describe('buildOpenApiOperationUrl', () => {
  it('combines base URL and path', () => {
    expect(buildOpenApiOperationUrl('https://api.example.com', '/users')).toBe('https://api.example.com/users')
  })

  it('converts path parameters to double-brace syntax', () => {
    expect(buildOpenApiOperationUrl('https://api.example.com', '/users/{id}')).toBe('https://api.example.com/users/{{id}}')
  })

  it('normalizes slashes', () => {
    expect(buildOpenApiOperationUrl('https://api.example.com/', '/users')).toBe('https://api.example.com/users')
  })
})

describe('getOpenApiName', () => {
  it('returns info.title when available', () => {
    expect(getOpenApiName({ info: { title: 'My API' } })).toBe('My API')
  })

  it('falls back to OpenAPI', () => {
    expect(getOpenApiName({})).toBe('OpenAPI')
    expect(getOpenApiName({ info: {} })).toBe('OpenAPI')
  })
})
