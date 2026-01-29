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
          { type: 'link', label: 'test link 1', url: 'https://test1.com', primary: true },
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
      expect(result.errors).toContain('Warp has no primary action: undefined')
    })

    it('validates successfully when single non-detectable action is marked as primary', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [{ type: 'link', label: 'test link', url: 'https://test.com', primary: true }],
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
        actions: [{ type: 'transfer', label: 'test transfer', description: 'test', address: 'erd1...', primary: true }],
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
})
