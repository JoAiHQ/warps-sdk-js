import { readFileSync } from 'fs'
import { join } from 'path'
import { WarpChainName } from './constants'
import { createMockConfig } from './test-utils/mockConfig'
import { Warp } from './types'
import { WarpValidator } from './WarpValidator'

const localSchemaPath = join(__dirname, '../../../warp-schema.json')
const localSchema = JSON.parse(readFileSync(localSchemaPath, 'utf-8'))

;(global as any).fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(localSchema),
  } as Response)
)

describe('WarpValidator', () => {
  const defaultConfig = createMockConfig()

  const createWarp = (overrides: Partial<Warp> = {}): Warp => ({
    protocol: 'test',
    name: 'test',
    title: 'test',
    description: 'test',
    chain: WarpChainName.Multiversx,
    actions: [],
    ...overrides,
  })

  it('validates a valid warp', async () => {
    const validator = new WarpValidator(defaultConfig)
    const warp = createWarp({
      actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
    })
    const result = await validator.validate(warp)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  describe('validateMaxOneValuePosition', () => {
    it('allows zero value position actions', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows one value position action', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when multiple value position actions exist', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Only one value position action is allowed')
    })
  })

  describe('validateVariableNamesAndResultNamesUppercase', () => {
    it('allows uppercase variable names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
        vars: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows uppercase result names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
        output: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when variable name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
        vars: { test: 'value' },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Variable name 'test' must be uppercase")
    })

    it('returns error when output name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
        output: { test: 'value' },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Output name 'test' must be uppercase")
    })
  })

  describe('validateAbiIsSetIfApplicable', () => {
    it('allows contract action with results and ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            gasLimit: 1000000,
            abi: 'hashOfAbi',
          },
        ],
        output: {
          TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows query action with results and ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'query',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            abi: 'hashOfAbi',
          },
        ],
        output: {
          TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows contract action without results and without ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            gasLimit: 1000000,
          },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows query action without results and without ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'query',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
          },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when contract action has output but no ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            gasLimit: 1000000,
          },
        ],
        output: {
          TEST: 'out.value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('ABI is required when output is present for contract or query actions')
    })

    it('returns error when query action has output but no ABI', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'query',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
          },
        ],
        output: {
          TEST: 'out.value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('ABI is required when output is present for contract or query actions')
    })
  })

  describe('validatePrimaryAction', () => {
    it('validates successfully when non-detectable action is marked as primary', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'link', label: 'test link 1', url: 'https://test1.com' },
          { type: 'link', label: 'test link 2', url: 'https://test2.com' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when actions array is empty', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Warp has no actions: undefined')
    })

    it('validates successfully when single non-detectable action is marked as primary', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'link', label: 'test link', url: 'https://test.com' }],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates successfully when only non-detectable actions exist without primary flag', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'link', label: 'test link', url: 'https://test.com' }],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates successfully when detectable actions exist', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'link', label: 'test link', url: 'https://test.com' },
          { type: 'transfer', label: 'test transfer', address: 'erd1...' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates successfully when action has primary flag', async () => {
      const configWithoutSchema = createMockConfig({ schema: undefined })
      const validator = new WarpValidator(configWithoutSchema)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test transfer', description: 'test', address: 'erd1...' }],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('validateSchema', () => {
    const mockFetch = jest.fn()
    beforeEach(() => {
      global.fetch = mockFetch as any
    })

    afterEach(() => {
      mockFetch.mockReset()
    })

    it('validates against schema', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          protocol: { type: 'string' },
          name: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          chain: { type: 'string' },
          actions: { type: 'array' },
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      })

      const configWithSchema = createMockConfig({ schema: { warp: 'https://example.com/schema.json' } })
      const validator = new WarpValidator(configWithSchema)
      const warp = createWarp({
        actions: [{ type: 'transfer', label: 'test', description: 'test', address: 'erd1...' }],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when schema validation fails', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          protocol: { type: 'string' },
          name: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          chain: { type: 'string' },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['transfer', 'contract', 'query', 'collect', 'link'] },
              },
              required: ['type'],
            },
          },
        },
        required: ['protocol', 'name', 'title', 'description', 'chain', 'actions'],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchema,
      })

      const configWithSchema = createMockConfig({ schema: { warp: 'https://example.com/schema.json' } })
      const validator = new WarpValidator(configWithSchema)
      const warp = createWarp({
        actions: [
          { type: 'transfer', label: 'valid action', description: 'test', address: 'erd1...' },
          // @ts-expect-error - intentionally invalid action type
          { type: 'invalid', label: 'test', description: 'test' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Schema validation failed')
    })
  })

  describe('validateUrlPlaceholdersHaveInputs', () => {
    it('passes when URL placeholder has matching url-positioned input', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'log activity',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}/activities', method: 'POST' },
            inputs: [
              { name: 'contactId', as: 'contactId', type: 'string', position: 'url:contactId', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(0)
    })

    it('passes when URL placeholder is declared as a var', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        vars: { JOAI_AGENT_UUID: 'env:JOAI_AGENT_UUID' },
        actions: [
          {
            type: 'collect',
            label: 'reminders',
            destination: { url: 'https://api.example.com/v1/agents/{{JOAI_AGENT_UUID}}/reminders', method: 'POST' },
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(0)
    })

    it('fails when URL placeholder has no matching input and is not a var', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'log activity',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}/activities', method: 'POST' },
            inputs: [
              // contactId is a regular field input, not url-positioned → URL collapses
              { name: 'contactId', as: 'contactId', type: 'string', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('{{contactId}}') && e.includes('url:contactId'))).toBe(true)
    })

    it('fails when URL has multiple placeholders and one is missing', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'delete activity',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}/activities/{{activityId}}', method: 'DELETE' },
            inputs: [
              { name: 'contactId', as: 'contactId', type: 'string', position: 'url:contactId', source: 'field' },
              { name: 'activityId', as: 'activityId', type: 'string', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      // Exactly one URL-position error: activityId is missing url:activityId positioning
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(1)
      expect(urlErrors[0]).toContain('url:activityId')
      expect(urlErrors[0]).not.toContain('url:contactId')
    })

    it('ignores actions without HTTP destination', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      const result = await validator.validate(warp)
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(0)
    })

    it('passes when a later action reuses a url-positioned input from an earlier action (chain inheritance)', async () => {
      // In multi-action warps the user provides each input once and it stays
      // available for subsequent actions. Validator must NOT require
      // re-declaring url:contactId in every action that uses {{contactId}}.
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'set property',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}/properties', method: 'POST' },
            inputs: [
              { name: 'contactId', as: 'contactId', type: 'string', position: 'url:contactId', source: 'field' },
              { name: 'value', as: 'value', type: 'string', source: 'field', position: 'payload:value' },
            ],
          } as any,
          {
            type: 'collect',
            label: 'tag contact',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}', method: 'PUT' },
            inputs: [
              // No re-declaration of contactId — should inherit from action 1
              { name: 'tag', as: 'tag', type: 'string', source: 'field', position: 'payload:tagsAppend[]' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(0)
    })

    it('still fails for placeholder that no action declares (even chain-wide)', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'first',
            destination: { url: 'https://api.example.com/v1/teams/{{teamId}}/contacts', method: 'GET' },
            inputs: [
              { name: 'teamId', as: 'teamId', type: 'string', position: 'url:teamId', source: 'field' },
            ],
          } as any,
          {
            type: 'collect',
            label: 'second references unknown {{contactId}}',
            destination: { url: 'https://api.example.com/v1/contacts/{{contactId}}', method: 'PUT' },
            inputs: [
              { name: 'name', as: 'name', type: 'string', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const urlErrors = result.errors.filter((e) => e.includes('no input has position "url:'))
      expect(urlErrors).toHaveLength(1)
      expect(urlErrors[0]).toContain('url:contactId')
    })
  })

  describe('validateNoArgPositionsOnHttpActions', () => {
    it('passes for HTTP action with no arg positions', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'create reminder',
            destination: { url: 'https://api.example.com/v1/reminders', method: 'POST' },
            inputs: [
              { name: 'text', as: 'text', type: 'string', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const argErrors = result.errors.filter((e) => e.includes('CLI arg positions'))
      expect(argErrors).toHaveLength(0)
    })

    it('fails when POST action has arg:N input', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'create item',
            destination: { url: 'https://api.example.com/v1/items', method: 'POST' },
            inputs: [
              { name: 'title', as: 'title', type: 'string', position: 'arg:1', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('title') && e.includes('arg:1') && e.includes('POST'))).toBe(true)
    })

    it('fails for PATCH/PUT/DELETE too', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'update name',
            destination: { url: 'https://api.example.com/v1/agents/{{JOAI_AGENT_UUID}}', method: 'PATCH' },
            inputs: [
              { name: 'name', as: 'name', type: 'string', position: 'arg:1', source: 'field' },
            ],
          } as any,
        ],
        vars: { JOAI_AGENT_UUID: 'env:JOAI_AGENT_UUID' },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('arg:1') && e.includes('PATCH'))).toBe(true)
    })

    it('allows arg:N on GET actions (query strings can encode positional args in other modes)', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'collect',
            label: 'lookup',
            destination: { url: 'https://api.example.com/v1/lookup', method: 'GET' },
            inputs: [
              { name: 'q', as: 'q', type: 'string', position: 'arg:1', source: 'field' },
            ],
          } as any,
        ],
      })
      const result = await validator.validate(warp)
      const argErrors = result.errors.filter((e) => e.includes('CLI arg positions'))
      expect(argErrors).toHaveLength(0)
    })

    it('allows arg:N on non-HTTP actions (e.g. transfers)', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'amount', type: 'biguint', position: 'arg:1', source: 'field' }],
          },
        ],
      })
      const result = await validator.validate(warp)
      const argErrors = result.errors.filter((e) => e.includes('CLI arg positions'))
      expect(argErrors).toHaveLength(0)
    })
  })
})
