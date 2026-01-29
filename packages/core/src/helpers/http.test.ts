import { beforeEach, describe, expect, it } from '@jest/globals'
import { WarpInterpolator } from '../WarpInterpolator'
import { WarpSerializer } from '../WarpSerializer'
import type { ResolvedInput, WarpChainInfo, WarpCollectDestinationHttp, WarpExecutable } from '../types'
import { buildBody, buildHeaders, buildHttpRequest, buildUrl, getJsonFromInput, HttpInputNames, HttpMethods, parseJsonSafely } from './http'

describe('HTTP Helpers', () => {
  let serializer: WarpSerializer
  let interpolator: WarpInterpolator
  let mockExecutable: WarpExecutable
  let mockDestination: WarpCollectDestinationHttp

  beforeEach(() => {
    serializer = new WarpSerializer()
    interpolator = new WarpInterpolator({ env: 'devnet', currentUrl: 'https://test.com' }, null as any, [])
    ;(interpolator as any).applyInputs = (template: string, inputs: ResolvedInput[], ser: WarpSerializer) => {
      let result = template
      inputs.forEach((ri) => {
        const key = ri.input.as || ri.input.name
        const value = ri.value ? ser.stringToNative(ri.value)[1] : ''
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
      })
      return result
    }

    mockExecutable = {
      warp: {} as any,
      action: 0,
      adapter: null as any,
      chain: { name: 'multiversx' } as WarpChainInfo,
      destination: null,
      args: [],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    }

    mockDestination = {
      url: 'https://api.example.com/test',
      method: 'GET',
    }
  })

  describe('getJsonFromInput', () => {
    it('should extract JSON string from resolved input', () => {
      const resolvedInputs: ResolvedInput[] = [
        {
          input: { name: 'Queries', as: 'QUERIES', type: 'string', source: 'field' },
          value: 'string:{"key": "value"}',
        },
      ]

      const result = getJsonFromInput(resolvedInputs, HttpInputNames.Queries, serializer)
      expect(result).toBe('{"key": "value"}')
    })

    it('should return null if input not found', () => {
      const resolvedInputs: ResolvedInput[] = []
      const result = getJsonFromInput(resolvedInputs, HttpInputNames.Queries, serializer)
      expect(result).toBeNull()
    })

    it('should return null if input has no value', () => {
      const resolvedInputs: ResolvedInput[] = [
        {
          input: { name: 'Queries', as: 'QUERIES', type: 'string', source: 'field' },
          value: null,
        },
      ]

      const result = getJsonFromInput(resolvedInputs, HttpInputNames.Queries, serializer)
      expect(result).toBeNull()
    })
  })

  describe('parseJsonSafely', () => {
    it('should parse valid JSON', () => {
      const result = parseJsonSafely('{"key": "value"}')
      expect(result).toEqual({ key: 'value' })
    })

    it('should return null for invalid JSON', () => {
      const result = parseJsonSafely('invalid json')
      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseJsonSafely('')
      expect(result).toBeNull()
    })
  })

  describe('buildUrl', () => {
    it('should build URL with query parameters for GET', () => {
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Queries', as: HttpInputNames.Queries, type: 'string', source: 'field' },
          value: 'string:{"userId": "123", "status": "active"}',
        },
      ]

      const url = buildUrl(interpolator, mockDestination, mockExecutable, HttpMethods.Get, serializer)
      expect(url).toContain('userId=123')
      expect(url).toContain('status=active')
    })

    it('should return base URL if no queries provided', () => {
      mockExecutable.resolvedInputs = []
      const url = buildUrl(interpolator, mockDestination, mockExecutable, HttpMethods.Get, serializer)
      expect(url).toBe('https://api.example.com/test')
    })

    it('should not add queries for non-GET methods', () => {
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Queries', as: HttpInputNames.Queries, type: 'string', source: 'field' },
          value: 'string:{"key": "value"}',
        },
      ]

      const url = buildUrl(interpolator, mockDestination, mockExecutable, HttpMethods.Post, serializer)
      expect(url).toBe('https://api.example.com/test')
      expect(url).not.toContain('key=value')
    })
  })

  describe('buildBody', () => {
    it('should return undefined for GET requests', () => {
      const body = buildBody(HttpMethods.Get, mockExecutable, {}, serializer)
      expect(body).toBeUndefined()
    })

    it('should use PAYLOAD input if provided', () => {
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Payload', as: HttpInputNames.Payload, type: 'string', source: 'field' },
          value: 'string:{"name": "John", "age": 30}',
        },
      ]

      const body = buildBody(HttpMethods.Post, mockExecutable, {}, serializer)
      expect(body).toBe('{"name": "John", "age": 30}')
    })

    it('should fall back to payload object if PAYLOAD input not provided', () => {
      mockExecutable.resolvedInputs = []
      const payload = { data: { key: 'value' } }
      const body = buildBody(HttpMethods.Post, mockExecutable, payload, serializer)
      expect(body).toBe(JSON.stringify(payload))
    })

    it('should remove PAYLOAD and QUERIES from payload before stringifying', () => {
      mockExecutable.resolvedInputs = []
      const payload = { PAYLOAD: 'test', QUERIES: 'test', data: { key: 'value' } }
      const body = buildBody(HttpMethods.Post, mockExecutable, payload, serializer)
      const parsed = JSON.parse(body!)
      expect(parsed.PAYLOAD).toBeUndefined()
      expect(parsed.QUERIES).toBeUndefined()
      expect(parsed.data).toEqual({ key: 'value' })
    })
  })

  describe('buildHeaders', () => {
    it('should set default Content-Type and Accept headers', async () => {
      const headers = await buildHeaders(interpolator, mockDestination, mockExecutable, null, serializer)
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('Accept')).toBe('application/json')
    })

    it('should parse HEADERS JSON input if provided', async () => {
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Headers', as: HttpInputNames.Headers, type: 'string', source: 'field' },
          value: 'string:{"Authorization": "Bearer token123", "X-Custom": "value"}',
        },
      ]

      const headers = await buildHeaders(interpolator, mockDestination, mockExecutable, null, serializer)
      expect(headers.get('Authorization')).toBe('Bearer token123')
      expect(headers.get('X-Custom')).toBe('value')
    })

    it('should use destination headers if HEADERS input not provided', async () => {
      mockDestination.headers = {
        'X-API-Key': '{{API_KEY}}',
      }
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'API Key', as: 'API_KEY', type: 'string', source: 'field' },
          value: 'string:secret123',
        },
      ]

      const headers = await buildHeaders(interpolator, mockDestination, mockExecutable, null, serializer)
      expect(headers.get('X-API-Key')).toBe('secret123')
    })
  })

  describe('buildHttpRequest', () => {
    it('should build complete HTTP request config', async () => {
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Queries', as: HttpInputNames.Queries, type: 'string', source: 'field' },
          value: 'string:{"param": "value"}',
        },
        {
          input: { name: 'Headers', as: HttpInputNames.Headers, type: 'string', source: 'field' },
          value: 'string:{"X-Custom": "header"}',
        },
      ]

      const config = await buildHttpRequest(interpolator, mockDestination, mockExecutable, null, {}, serializer)

      expect(config.url).toContain('param=value')
      expect(config.method).toBe(HttpMethods.Get)
      expect(config.headers.get('X-Custom')).toBe('header')
      expect(config.body).toBeUndefined()
    })

    it('should build POST request with payload', async () => {
      mockDestination.method = HttpMethods.Post
      mockExecutable.resolvedInputs = [
        {
          input: { name: 'Payload', as: HttpInputNames.Payload, type: 'string', source: 'field' },
          value: 'string:{"data": "test"}',
        },
      ]

      const config = await buildHttpRequest(interpolator, mockDestination, mockExecutable, null, {}, serializer)

      expect(config.method).toBe(HttpMethods.Post)
      expect(config.body).toBe('{"data": "test"}')
    })
  })
})
