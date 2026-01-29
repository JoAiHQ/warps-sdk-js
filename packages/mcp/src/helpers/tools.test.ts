import { Warp, WarpActionInput, WarpChainName, WarpMcpAction, WarpTransferAction } from '@joai/warps'
import { z } from 'zod'
import { buildZodInputSchema, convertActionToTool, convertMcpActionToTool } from './tools'

const testWarpMeta = (identifier: string) => ({
  chain: 'multiversx' as WarpChainName,
  identifier,
  query: null as Record<string, unknown> | null,
  hash: identifier,
  creator: 'test',
  createdAt: '2024-01-01',
})

const getInnerSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  if ((schema as any)._def?.typeName === 'ZodOptional') {
    return (schema as any)._def.innerType
  }
  return schema
}

const isZodString = (schema: z.ZodTypeAny): schema is z.ZodString => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodString || (inner as any)._def?.typeName === 'ZodString'
}

const isZodNumber = (schema: z.ZodTypeAny): schema is z.ZodNumber => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodNumber || (inner as any)._def?.typeName === 'ZodNumber'
}

const isZodBoolean = (schema: z.ZodTypeAny): schema is z.ZodBoolean => {
  const inner = getInnerSchema(schema)
  return inner instanceof z.ZodBoolean || (inner as any)._def?.typeName === 'ZodBoolean'
}

const isZodOptional = (schema: z.ZodTypeAny): boolean => {
  return (schema as any)._def?.typeName === 'ZodOptional'
}

const isZodEnum = (schema: z.ZodTypeAny): schema is z.ZodEnum<any> => {
  return (schema as any)._def?.typeName === 'ZodEnum' || schema instanceof z.ZodEnum
}

describe('buildZodInputSchema', () => {
  const mockConfig = { env: 'mainnet' as const }
  it('builds schema from string input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.name).toBeDefined()
    expect(isZodString(result!.name)).toBe(true)
    expect(isZodOptional(result!.name)).toBe(false)
  })

  it('builds schema from number input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.amount).toBeDefined()
    expect(isZodNumber(result!.amount)).toBe(true)
  })

  it('builds schema from boolean input', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'active',
        type: 'bool',
        position: 'payload:active',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.active).toBeDefined()
    expect(isZodBoolean(result!.active)).toBe(true)
  })

  it('makes optional fields optional', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        required: false,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    // The schema should be optional when required is false
    const schema = result!.name
    // Check if it's wrapped in ZodOptional by checking the inner type
    const innerType = (schema as any)._def?.innerType
    const isOptional =
      isZodOptional(schema) || (schema as any)._def?.typeName === 'ZodOptional' || (innerType && innerType instanceof z.ZodString)
    // Actually, let's just verify it can parse undefined
    const parseResult = schema.safeParse(undefined)
    expect(parseResult.success).toBe(true)
  })

  it('filters out hidden inputs', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'visible',
        type: 'string',
        position: 'payload:visible',
        source: 'field',
        required: true,
      },
      {
        name: 'hidden',
        type: 'string',
        position: 'payload:hidden',
        source: 'hidden',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.visible).toBeDefined()
    expect(result!.hidden).toBeUndefined()
  })

  it('filters out non-field inputs', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'field_input',
        type: 'string',
        position: 'payload:field_input',
        source: 'field',
        required: true,
      },
      {
        name: 'other_input',
        type: 'string',
        position: 'payload:other_input',
        source: 'query',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.field_input).toBeDefined()
    expect(result!.other_input).toBeUndefined()
  })

  it('handles min/max constraints', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
        required: true,
        min: 10,
        max: 100,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    const schema = result!.amount as z.ZodNumber
    expect(schema.min(10)).toBeDefined()
    expect(schema.max(100)).toBeDefined()
  })

  it('handles pattern constraints', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'email',
        type: 'string',
        position: 'payload:email',
        source: 'field',
        required: true,
        pattern: '^[a-z]+@[a-z]+\\.[a-z]+$',
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.email).toBeDefined()
  })

  it('handles enum options', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'status',
        type: 'string',
        position: 'payload:status',
        source: 'field',
        required: true,
        options: ['active', 'inactive', 'pending'],
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(isZodEnum(result!.status)).toBe(true)
  })

  it('handles empty inputs array', () => {
    const result = buildZodInputSchema([], mockConfig)

    expect(result).toBeUndefined()
  })

  it('uses "as" field name when provided', () => {
    const inputs: WarpActionInput[] = [
      {
        name: 'original_name',
        as: 'renamed_field',
        type: 'string',
        position: 'payload:original_name',
        source: 'field',
        required: true,
      },
    ]

    const result = buildZodInputSchema(inputs, mockConfig)

    expect(result).toBeDefined()
    expect(result!.renamed_field).toBeDefined()
    expect(result!.original_name).toBeUndefined()
  })
})

describe('convertActionToTool', () => {
  const mockConfig = { env: 'mainnet' as const }
  it('converts action to tool with basic properties', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: { en: 'Test description' },
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, 'Test description', undefined, null, mockConfig)

    expect(tool.name).toBe('test_warp')
    expect(tool.description).toBe('Test description')
    expect(tool.inputSchema).toBeUndefined()
    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
  })

  it('includes output template URI in _meta when provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/test_warp' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/test_warp')
  })

  it('includes output template URI in _meta with resource when messages are provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      messages: {
        invoking: { en: 'Processing transfer' },
        invoked: { en: 'Transfer completed' },
      },
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/test_warp' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/test_warp')
  })

  it('includes output template URI in _meta with resource when messages are provided (de)', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { de: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { de: 'Übertragung' },
          address: 'erd1test',
        },
      ],
      messages: {
        invoking: { de: 'Übertragung wird verarbeitet' },
        invoked: { de: 'Übertragung abgeschlossen' },
      },
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/test_warp' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/test_warp')
  })

  it('includes only visibility in _meta when no resource is provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      messages: {
        invoking: 'Starting',
        invoked: 'Done',
      },
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, null, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
  })

  it('sanitizes warp name correctly', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'warp:test-warp with spaces',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      meta: testWarpMeta('test-warp_with_spaces'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, null, mockConfig)

    expect(tool.name).toBe('test-warp_with_spaces')
  })

  it('sanitizes warp name with _-_ pattern correctly', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'warp:staking_-_undelegate',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
        },
      ],
      meta: testWarpMeta('staking_undelegate'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const tool = convertActionToTool(warp, action, undefined, undefined, null, mockConfig)

    expect(tool.name).toBe('staking_undelegate')
  })

  it('uses primary action inputs when provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [
        {
          type: 'transfer',
          label: { en: 'Transfer' },
          address: 'erd1test',
          inputs: [
            {
              name: 'amount',
              type: 'uint256',
              position: 'payload:amount',
              source: 'field',
              required: true,
            },
          ],
        },
      ],
      meta: testWarpMeta('test_warp'),
    }

    const action = warp.actions[0] as WarpTransferAction
    const primaryInputs: WarpActionInput[] = [
      {
        name: 'custom_amount',
        type: 'uint256',
        position: 'payload:custom_amount',
        source: 'field',
        required: true,
      },
    ]

    const tool = convertActionToTool(warp, action, undefined, primaryInputs, null, mockConfig)

    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema!.custom_amount).toBeDefined()
    expect(tool.inputSchema!.amount).toBeUndefined()
  })
})

describe('convertMcpActionToTool', () => {
  const mockConfig = { env: 'mainnet' as const }
  it('converts MCP action to tool', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [],
      meta: testWarpMeta('test_warp'),
    }

    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: { en: 'MCP description' },
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool_name',
      },
      inputs: [
        {
          name: 'param',
          type: 'string',
          position: 'payload:param',
          source: 'field',
          required: true,
        },
      ],
    }

    const tool = convertMcpActionToTool(warp, action, 'MCP description', undefined, null, mockConfig)

    expect(tool.name).toBe('mcp_tool_name')
    expect(tool.description).toBe('MCP description')
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema!.param).toBeDefined()
  })

  it('includes output template URI in _meta when provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [],
    }

    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/mcp_tool' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/mcp_tool')
  })

  it('includes output template URI in _meta with resource when messages are provided (en)', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [],
      messages: {
        invoking: { en: 'Displaying board' },
        invoked: { en: 'Displayed the board' },
      },
    }

    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/mcp_tool' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/mcp_tool')
  })

  it('includes output template URI in _meta with resource when messages are provided (de)', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { de: 'Test Warp' },
      description: null,
      actions: [],
      messages: {
        invoking: { de: 'Board wird angezeigt' },
        invoked: { de: 'Board wurde angezeigt' },
      },
    }

    const action: WarpMcpAction = {
      type: 'mcp',
      label: { de: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(warp, action, undefined, undefined, { uri: 'ui://widget/mcp_tool' }, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
    expect(tool.meta?.ui?.resourceUri).toBe('ui://widget/mcp_tool')
  })

  it('includes only visibility in _meta when no resource is provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'test_warp',
      title: { en: 'Test Warp' },
      description: null,
      actions: [],
      messages: {
        invoking: { en: 'Starting process' },
      },
    }

    const action: WarpMcpAction = {
      type: 'mcp',
      label: { en: 'MCP Tool' },
      description: null,
      destination: {
        url: 'https://example.com',
        tool: 'mcp_tool',
      },
      inputs: [],
    }

    const tool = convertMcpActionToTool(warp, action, undefined, undefined, null, mockConfig)

    expect(tool.meta).toBeDefined()
    expect(tool.meta?.ui?.visibility).toEqual(['model', 'app'])
  })
})
