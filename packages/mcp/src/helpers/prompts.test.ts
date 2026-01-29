import { Warp, WarpPromptAction } from '@joai/warps'
import { convertPromptActionToPrompt, interpolatePromptWithArgs } from './prompts'

describe('interpolatePromptWithArgs', () => {
  it('interpolates simple placeholders', () => {
    const template = 'Hello {{name}}!'
    const args = { name: 'World' }

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Hello World!')
  })

  it('interpolates multiple placeholders', () => {
    const template = 'Hello {{name}}, you are {{age}} years old.'
    const args = { name: 'Alice', age: '30' }

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Hello Alice, you are 30 years old.')
  })

  it('handles placeholders with spaces', () => {
    const template = 'Hello {{ name }}!'
    const args = { name: 'World' }

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Hello World!')
  })

  it('handles missing placeholders by keeping them empty', () => {
    const template = 'Hello {{name}}!'
    const args = {}

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Hello {{name}}!')
  })

  it('handles empty string values', () => {
    const template = 'Hello {{name}}!'
    const args = { name: '' }

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Hello !')
  })

  it('handles multiple occurrences of same placeholder', () => {
    const template = '{{name}} says hi to {{name}}'
    const args = { name: 'Bob' }

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Bob says hi to Bob')
  })

  it('returns unchanged template when no args provided', () => {
    const template = 'Static prompt with no placeholders'
    const args = {}

    const result = interpolatePromptWithArgs(template, args)

    expect(result).toBe('Static prompt with no placeholders')
  })
})

describe('convertPromptActionToPrompt', () => {
  const mockConfig = { env: 'mainnet' as const }

  it('converts a simple prompt action without inputs', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Simple Prompt',
      title: { en: 'Simple Prompt' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Get Prompt' },
      prompt: 'This is a static prompt.',
    }

    const result = convertPromptActionToPrompt(warp, action, 'Test description', mockConfig)

    expect(result.name).toBe('simple_prompt')
    expect(result.description).toBe('Test description')
    expect(result.prompt).toBe('This is a static prompt.')
    expect(result.arguments).toBeUndefined()
  })

  it('converts a prompt action with inputs', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Prompt Example',
      title: { en: 'Prompt Example' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Generate' },
      prompt: 'Hello {{name}}, topic: {{topic}}',
      inputs: [
        {
          name: 'Name',
          as: 'name',
          type: 'string',
          source: 'field',
          required: true,
          description: { en: 'Your name' },
        },
        {
          name: 'Topic',
          as: 'topic',
          type: 'string',
          source: 'field',
          required: false,
          description: { en: 'Your topic' },
        },
      ],
    }

    const result = convertPromptActionToPrompt(warp, action, 'Example description', mockConfig)

    expect(result.name).toBe('prompt_example')
    expect(result.description).toBe('Example description')
    expect(result.prompt).toBe('Hello {{name}}, topic: {{topic}}')
    expect(result.arguments).toBeDefined()
    expect(result.arguments).toHaveLength(2)

    expect(result.arguments![0].name).toBe('name')
    expect(result.arguments![0].description).toBe('Your name')
    expect(result.arguments![0].required).toBe(true)

    expect(result.arguments![1].name).toBe('topic')
    expect(result.arguments![1].description).toBe('Your topic')
    expect(result.arguments![1].required).toBe(false)
  })

  it('skips hidden inputs', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Hidden Input Test',
      title: { en: 'Test' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Test' },
      prompt: 'Test {{visible}} {{hidden}}',
      inputs: [
        {
          name: 'visible',
          type: 'string',
          source: 'field',
          required: true,
        },
        {
          name: 'hidden',
          type: 'string',
          source: 'hidden',
          required: true,
        },
      ],
    }

    const result = convertPromptActionToPrompt(warp, action, undefined, mockConfig)

    expect(result.arguments).toBeDefined()
    expect(result.arguments).toHaveLength(1)
    expect(result.arguments![0].name).toBe('visible')
  })

  it('uses input name when as is not provided', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Test',
      title: { en: 'Test' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Test' },
      prompt: 'Test {{myInput}}',
      inputs: [
        {
          name: 'myInput',
          type: 'string',
          source: 'field',
          required: true,
        },
      ],
    }

    const result = convertPromptActionToPrompt(warp, action, undefined, mockConfig)

    expect(result.arguments).toBeDefined()
    expect(result.arguments![0].name).toBe('myInput')
  })

  it('sanitizes warp name for MCP prompt name', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'My Awesome Prompt!@#$',
      title: { en: 'Test' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Test' },
      prompt: 'Test prompt',
    }

    const result = convertPromptActionToPrompt(warp, action, undefined, mockConfig)

    expect(result.name).toBe('my_awesome_prompt')
  })

  it('handles prompt action with empty inputs array', () => {
    const warp: Warp = {
      protocol: 'warp:3.0.0',
      name: 'Empty Inputs',
      title: { en: 'Test' },
      description: null,
      actions: [],
    }

    const action: WarpPromptAction = {
      type: 'prompt',
      label: { en: 'Test' },
      prompt: 'Static prompt',
      inputs: [],
    }

    const result = convertPromptActionToPrompt(warp, action, 'Description', mockConfig)

    expect(result.arguments).toBeUndefined()
  })
})
