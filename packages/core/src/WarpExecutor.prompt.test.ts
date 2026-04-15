import { WarpChainName, WarpPlatformName } from './constants'
import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig } from './types'
import { WarpExecutor } from './WarpExecutor'

jest.mock('./helpers/mpp', () => ({
  getMppFetch: jest.fn(() => Promise.resolve(fetch)),
}))

describe('WarpExecutor - Prompt Actions', () => {
  const handlers = { onExecuted: jest.fn(), onError: jest.fn(), onActionExecuted: jest.fn() }
  const warp: Warp = createMockWarp()

  const config: WarpClientConfig = {
    env: 'devnet',
    user: { wallets: { multiversx: 'erd1...' } },
    clientUrl: 'https://anyclient.com',
    currentUrl: 'https://anyclient.com',
  }
  const adapters = [createMockAdapter(WarpChainName.Multiversx)]
  let executor: WarpExecutor // Declare executor here

  beforeEach(() => {
    jest.clearAllMocks()
    executor = new WarpExecutor(config, adapters, handlers) // Initialize executor here
  })

  it('should successfully execute a simple prompt action without inputs', async () => {
    const simplePromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Get Simple Prompt',
          prompt: 'This is a simple static prompt.',
        },
      ],
      output: {
        RESULT: 'out',
      },
    }

    const result = await executor.execute(simplePromptWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.RESULT).toBe('This is a simple static prompt.')
    expect(execution.output.PROMPT).toBe('This is a simple static prompt.')
    expect(execution.values.string).toEqual(['This is a simple static prompt.'])
    expect(execution.values.native).toEqual(['This is a simple static prompt.'])
    expect(execution.values.mapped).toEqual({})
    expect(handlers.onActionExecuted).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 1,
        execution: expect.objectContaining({
          status: 'success',
          output: expect.objectContaining({
            RESULT: 'This is a simple static prompt.',
            PROMPT: 'This is a simple static prompt.',
          }),
        }),
      })
    )
  })

  it('should successfully execute a prompt action with inputs and interpolation', async () => {
    const interpolatedPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Generate Personalized Prompt',
          prompt: 'Hello {{name}}! You are {{age}} years old.',
          inputs: [
            {
              name: 'Name',
              as: 'name',
              type: 'string',
              source: 'field',
              required: true,
            },
            {
              name: 'Age',
              as: 'age',
              type: 'uint32',
              source: 'field',
              required: true,
            },
          ],
        },
      ],
      output: {
        RESULT: 'out',
      },
    }

    const inputs = ['string:John Doe', 'uint32:30']
    const result = await executor.execute(interpolatedPromptWarp, inputs)

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.RESULT).toBe('Hello John Doe! You are 30 years old.')
    expect(execution.output.PROMPT).toBe('Hello John Doe! You are 30 years old.')
    expect(execution.values.string).toEqual(['Hello John Doe! You are 30 years old.'])
    expect(execution.values.native).toEqual(['Hello John Doe! You are 30 years old.'])
    expect(execution.values.mapped).toEqual({ name: 'John Doe', age: 30 })
    expect(handlers.onActionExecuted).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 1,
        execution: expect.objectContaining({
          status: 'success',
          output: expect.objectContaining({
            RESULT: 'Hello John Doe! You are 30 years old.',
            PROMPT: 'Hello John Doe! You are 30 years old.',
          }),
        }),
      })
    )
  })

  it('should properly map output using out path', async () => {
    const outPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Generate Draft',
          prompt: 'create a x.com post draft based on the following notes: {{NOTES}}',
          inputs: [
            {
              name: 'Notes',
              as: 'NOTES',
              type: 'string',
              source: 'field',
              required: true,
            },
          ],
        },
      ],
      output: {
        DRAFT: 'out',
      },
    }

    const inputs = ['string:Exciting news! We just launched a new feature.']
    const result = await executor.execute(outPromptWarp, inputs)

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.DRAFT).toBe('create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.')
    expect(execution.output.PROMPT).toBe('create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.')
    expect(execution.values.string).toEqual(['create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.'])
    expect(execution.values.native).toEqual(['create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.'])
    expect(handlers.onActionExecuted).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 1,
        execution: expect.objectContaining({
          status: 'success',
          output: expect.objectContaining({
            DRAFT: 'create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.',
            PROMPT: 'create a x.com post draft based on the following notes: Exciting news! We just launched a new feature.',
          }),
        }),
      })
    )
  })

  it('should always include PROMPT output even when no output is defined', async () => {
    const noOutputWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Prompt Without Output',
          prompt: 'This prompt has no output defined.',
        },
      ],
      // No output defined
    }

    const result = await executor.execute(noOutputWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.PROMPT).toBe('This prompt has no output defined.')
    expect(execution.output).toEqual({ PROMPT: 'This prompt has no output defined.' })
  })

  it('should not override PROMPT output if explicitly defined in warp output', async () => {
    const customPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Prompt With Custom PROMPT',
          prompt: 'Original prompt text',
        },
      ],
      output: {
        PROMPT: 'out',
        CUSTOM: 'out',
      },
    }

    const result = await executor.execute(customPromptWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    // PROMPT should be the evaluated output value (from 'out'), not the default
    expect(execution.output.PROMPT).toBe('Original prompt text')
    expect(execution.output.CUSTOM).toBe('Original prompt text')
  })

  it('should not override PROMPT output even if it evaluates to null', async () => {
    const nullPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Prompt With Null PROMPT',
          prompt: 'Original prompt text',
        },
      ],
      output: {
        PROMPT: 'in.nonexistent', // This will evaluate to null
      },
    }

    const result = await executor.execute(nullPromptWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    // PROMPT should be null (as defined), not the default prompt value
    expect(execution.output.PROMPT).toBeNull()
  })

  it('should resolve platform-specific prompt for macos', async () => {
    const macosConfig: WarpClientConfig = { ...config, platform: WarpPlatformName.Macos }
    const macosExecutor = new WarpExecutor(macosConfig, adapters, handlers)

    const platformWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Open App',
          prompt: {
            macos: '/open -a "{{APP}}"',
            linux: '/xdg-open {{APP}}',
            windows: '/start "" "{{APP}}"',
          },
          inputs: [{ name: 'App', as: 'APP', type: 'string', source: 'field', required: true }],
        },
      ],
    }

    const result = await macosExecutor.execute(platformWarp, ['string:Safari'])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output.PROMPT).toBe('/open -a "Safari"')
  })

  it('should resolve platform-specific prompt for linux', async () => {
    const linuxConfig: WarpClientConfig = { ...config, platform: WarpPlatformName.Linux }
    const linuxExecutor = new WarpExecutor(linuxConfig, adapters, handlers)

    const platformWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Open App',
          prompt: {
            macos: '/open -a "{{APP}}"',
            linux: '/xdg-open {{APP}}',
            windows: '/start "" "{{APP}}"',
          },
          inputs: [{ name: 'App', as: 'APP', type: 'string', source: 'field', required: true }],
        },
      ],
    }

    const result = await linuxExecutor.execute(platformWarp, ['string:firefox'])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output.PROMPT).toBe('/xdg-open firefox')
  })

  it('should resolve platform-specific prompt for windows', async () => {
    const windowsConfig: WarpClientConfig = { ...config, platform: WarpPlatformName.Windows }
    const windowsExecutor = new WarpExecutor(windowsConfig, adapters, handlers)

    const platformWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Open App',
          prompt: {
            macos: '/open -a "{{APP}}"',
            linux: '/xdg-open {{APP}}',
            windows: '/start "" "{{APP}}"',
          },
          inputs: [{ name: 'App', as: 'APP', type: 'string', source: 'field', required: true }],
        },
      ],
    }

    const result = await windowsExecutor.execute(platformWarp, ['string:notepad'])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output.PROMPT).toBe('/start "" "notepad"')
  })

  it('should still work with plain string prompt when platform is set', async () => {
    const macosConfig: WarpClientConfig = { ...config, platform: WarpPlatformName.Macos }
    const macosExecutor = new WarpExecutor(macosConfig, adapters, handlers)

    const plainPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Plain Prompt',
          prompt: '/echo hello',
        },
      ],
    }

    const result = await macosExecutor.execute(plainPromptWarp, [])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output.PROMPT).toBe('/echo hello')
  })

  it('should throw when platform-keyed prompt is used without platform in config', async () => {
    const noPlatformConfig: WarpClientConfig = { ...config }
    const noPlatformExecutor = new WarpExecutor(noPlatformConfig, adapters, handlers)

    const platformWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Open App',
          prompt: { macos: '/open -a "test"', linux: '/xdg-open test' },
        },
      ],
    }

    const result = await noPlatformExecutor.execute(platformWarp, [])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].status).toBe('error')
  })

  it('should resolve destination from inputs with position destination', async () => {
    const destinationWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Send Message',
          prompt: '{{INSTRUCTION}}',
          inputs: [
            { name: 'Instruction', as: 'INSTRUCTION', type: 'string', source: 'field', required: true },
            { name: 'Destination', as: 'DESTINATION', type: 'string', position: 'destination', source: 'hidden', required: false, default: 'room:test-room' },
          ],
        },
      ],
    }

    const result = await executor.execute(destinationWarp, ['string:say hello'])
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.destination).toBe('string:room:test-room')
    expect(execution.output.PROMPT).toBe('say hello')
  })

  it('should return null destination when no destination input provided', async () => {
    const noDestWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Simple Prompt',
          prompt: '{{TEXT}}',
          inputs: [
            { name: 'Text', as: 'TEXT', type: 'string', source: 'field', required: true },
          ],
        },
      ],
    }

    const result = await executor.execute(noDestWarp, ['string:hello'])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].destination).toBeNull()
  })

  it('should call onPromptGenerate and set MESSAGE when handler is provided', async () => {
    const llmHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue('Generated response text'),
    }
    const llmExecutor = new WarpExecutor(config, adapters, llmHandlers)

    const promptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'LLM Prompt',
          prompt: 'Write a tweet about {{TOPIC}}',
          inputs: [{ name: 'Topic', as: 'TOPIC', type: 'string', source: 'field' as const, required: true }],
        },
      ],
    }

    const result = await llmExecutor.execute(promptWarp, ['string:AI'])
    const execution = result.immediateExecutions[0]

    expect(execution.status).toBe('success')
    expect(execution.output.PROMPT).toBe('Write a tweet about AI')
    expect(execution.output.MESSAGE).toBe('Generated response text')
    expect(llmHandlers.onPromptGenerate).toHaveBeenCalledWith('Write a tweet about AI', undefined)
  })

  it('should only set PROMPT when onPromptGenerate returns null', async () => {
    const llmHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue(null),
    }
    const llmExecutor = new WarpExecutor(config, adapters, llmHandlers)

    const promptWarp: Warp = {
      ...warp,
      actions: [{ type: 'prompt', label: 'Command', prompt: '/open -a Safari' }],
    }

    const result = await llmExecutor.execute(promptWarp, [])
    const execution = result.immediateExecutions[0]

    expect(execution.status).toBe('success')
    expect(execution.output.PROMPT).toBe('/open -a Safari')
    expect(execution.output.MESSAGE).toBeUndefined()
    expect(llmHandlers.onPromptGenerate).toHaveBeenCalledWith('/open -a Safari', undefined)
  })

  it('should not call onPromptGenerate when handler is absent', async () => {
    const noLlmExecutor = new WarpExecutor(config, adapters, handlers)

    const promptWarp: Warp = {
      ...warp,
      actions: [{ type: 'prompt', label: 'Simple', prompt: 'Hello world' }],
    }

    const result = await noLlmExecutor.execute(promptWarp, [])
    const execution = result.immediateExecutions[0]

    expect(execution.status).toBe('success')
    expect(execution.output.PROMPT).toBe('Hello world')
    expect(execution.output.MESSAGE).toBeUndefined()
  })

  it('should chain outputs between actions via envs', async () => {
    const llmHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue('Classification: DeFi swap'),
    }
    const chainExecutor = new WarpExecutor(config, adapters, llmHandlers)

    const chainedWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'compute',
          label: 'Decode',
          inputs: [{ name: 'Data', as: 'DATA', type: 'string', source: 'field' as const, required: true }],
          auto: true,
        },
        {
          type: 'prompt',
          label: 'Classify',
          prompt: 'Classify: {{DATA}}',
          auto: true,
        },
      ],
    }

    const result = await chainExecutor.execute(chainedWarp, ['string:raw-tx-data'])

    expect(result.immediateExecutions).toHaveLength(2)
    const promptExec = result.immediateExecutions[1]
    expect(promptExec.output.PROMPT).toBe('Classify: raw-tx-data')
    expect(promptExec.output.MESSAGE).toBe('Classification: DeFi swap')
    expect(llmHandlers.onPromptGenerate).toHaveBeenCalledWith('Classify: raw-tx-data', undefined)
  })

  it('should handle state read actions via SDK cache', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)
    // Pre-populate state in cache
    const cache = stateExecutor['factory'].getCache()
    await cache.set('state:default:counter', { count: 42, label: 'test' })

    const stateWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Read Counter',
          op: 'read',
          store: 'counter',
        },
      ],
    }

    const result = await stateExecutor.execute(stateWarp, [])

    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output).toEqual({ 'state.count': 42, 'state.label': 'test' })
  })

  it('should handle state write actions with placeholder resolution', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)
    const cache = stateExecutor['factory'].getCache()

    const stateWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Write State',
          op: 'write',
          store: 'results',
          data: { answer: '{{VALUE}}' },
        },
      ],
    }

    await stateExecutor.execute(stateWarp, [], { envs: { VALUE: 'hello' } })

    const stored = await cache.get<Record<string, any>>('state:default:results')
    expect(stored).toEqual({ answer: 'hello' })
  })

  it('should handle state clear actions', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)
    const cache = stateExecutor['factory'].getCache()
    await cache.set('state:default:temp', { key: 'value' })

    const stateWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Clear State',
          op: 'clear',
          store: 'temp',
        },
      ],
    }

    await stateExecutor.execute(stateWarp, [])
    const stored = await cache.get('state:default:temp')
    expect(stored).toBeNull()
  })

  it('should skip state action when when condition is false', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)

    const stateWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Conditional State',
          op: 'read',
          store: 'counter',
          when: '1 === 0',
        },
      ],
    }

    const result = await stateExecutor.execute(stateWarp, [])
    expect(result.immediateExecutions).toHaveLength(0)
  })

  it('should use scope for cache key isolation', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)
    const cache = stateExecutor['factory'].getCache()

    const stateWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Write Scoped',
          op: 'write',
          store: 'data',
          data: { key: 'scoped-value' },
        },
      ],
    }

    await stateExecutor.execute(stateWarp, [], { scope: 'room-123' })
    const stored = await cache.get<Record<string, any>>('state:room-123:data')
    expect(stored).toEqual({ key: 'scoped-value' })

    // Default scope should be empty
    const defaultStored = await cache.get('state:default:data')
    expect(defaultStored).toBeNull()
  })

  it('should chain state read outputs into prompt template', async () => {
    const combinedHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue('Translated: Hallo Welt'),
    }
    const combinedExecutor = new WarpExecutor(config, adapters, combinedHandlers)
    // Pre-populate state
    const cache = combinedExecutor['factory'].getCache()
    await cache.set('state:default:greetings', { greeting: 'Hello World' })

    const chainedWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Read State',
          op: 'read',
          store: 'greetings',
        },
        {
          type: 'prompt',
          label: 'Translate',
          prompt: 'Translate this: {{state.greeting}}',
          auto: true,
        },
      ],
    }

    const result = await combinedExecutor.execute(chainedWarp, [])

    expect(result.immediateExecutions).toHaveLength(2)
    expect(combinedHandlers.onPromptGenerate).toHaveBeenCalledWith('Translate this: Hello World', undefined)
    const promptExec = result.immediateExecutions[1]
    expect(promptExec.output.PROMPT).toBe('Translate this: Hello World')
    expect(promptExec.output.MESSAGE).toBe('Translated: Hallo Welt')
  })

  it('should chain warp output values between actions', async () => {
    const llmHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue('This is a DeFi swap transaction'),
    }
    const chainExecutor = new WarpExecutor(config, adapters, llmHandlers)

    const chainedWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'compute',
          label: 'Decode',
          inputs: [{ name: 'Raw', as: 'RAW', type: 'string', source: 'field' as const, required: true }],
          auto: true,
        },
        {
          type: 'prompt',
          label: 'Classify',
          prompt: 'Classify: {{DECODED}}',
          auto: true,
        },
      ],
      output: { DECODED: 'out[1]' },
    }

    const result = await chainExecutor.execute(chainedWarp, ['string:base64data'])

    expect(result.immediateExecutions).toHaveLength(2)
    // Compute output DECODED flows into prompt template via output chaining
    const computeExec = result.immediateExecutions[0]
    expect(computeExec.output.DECODED).toBeDefined()

    const promptExec = result.immediateExecutions[1]
    expect(promptExec.output.MESSAGE).toBe('This is a DeFi swap transaction')
  })

  it('should chain full pipeline: state read → prompt → state write', async () => {
    const pipelineHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockResolvedValue('42'),
    }
    const pipelineExecutor = new WarpExecutor(config, adapters, pipelineHandlers)
    const cache = pipelineExecutor['factory'].getCache()
    await cache.set('state:room-1:game', { question: 'What is the meaning of life?' })

    const pipelineWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'state' as any,
          label: 'Load Question',
          op: 'read',
          store: 'game',
        },
        {
          type: 'prompt',
          label: 'Answer',
          prompt: '{{state.question}}',
          auto: true,
        },
        {
          type: 'state' as any,
          label: 'Save Answer',
          op: 'write',
          store: 'game',
          data: { answer: '{{MESSAGE}}' },
          auto: true,
        },
      ],
    }

    await pipelineExecutor.execute(pipelineWarp, [], { scope: 'room-1' })

    // Verify the prompt received the state value
    expect(pipelineHandlers.onPromptGenerate).toHaveBeenCalledWith('What is the meaning of life?', undefined)

    // Verify the state write persisted the LLM response
    const stored = await cache.get<Record<string, any>>('state:room-1:game')
    expect(stored).toEqual({ question: 'What is the meaning of life?', answer: 42 })
  })

  it('should handle onPromptGenerate that throws an error gracefully', async () => {
    const errorHandlers = {
      ...handlers,
      onPromptGenerate: jest.fn().mockRejectedValue(new Error('LLM service unavailable')),
    }
    const errorExecutor = new WarpExecutor(config, adapters, errorHandlers)

    const promptWarp: Warp = {
      ...warp,
      actions: [{ type: 'prompt', label: 'Failing Prompt', prompt: 'Generate something' }],
    }

    const result = await errorExecutor.execute(promptWarp, [])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].status).toBe('error')
    expect(result.immediateExecutions[0].output._DATA).toBeInstanceOf(Error)
  })

  it('should handle loop actions by calling onLoop handler', async () => {
    let loopCount = 0
    const loopExecutor = new WarpExecutor(config, adapters, {
      ...handlers,
      onLoop: ({ warp: w, inputs: i, meta: m }) => {
        loopCount++
        loopExecutor.execute(w, i, m).catch(() => {})
      },
    })

    const loopWarp: Warp = {
      ...warp,
      actions: [
        { type: 'prompt', label: 'Say Hello', prompt: 'Hello' },
        { type: 'loop' as any, label: 'Loop', maxIterations: 3, delay: 0 },
      ],
    }

    await loopExecutor.execute(loopWarp, [])
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(loopCount).toBeGreaterThanOrEqual(2)
    loopExecutor.stop()
  })

  it('should stop loop when stop() is called', async () => {
    let loopCount = 0
    const loopExecutor = new WarpExecutor(config, adapters, {
      ...handlers,
      onLoop: ({ warp: w, inputs: i, meta: m }) => {
        loopCount++
        loopExecutor.execute(w, i, m).catch(() => {})
      },
    })

    const loopWarp: Warp = {
      ...warp,
      actions: [
        { type: 'prompt', label: 'Say Hello', prompt: 'Hello' },
        { type: 'loop' as any, label: 'Loop', maxIterations: 100, delay: 10 },
      ],
    }

    await loopExecutor.execute(loopWarp, [])
    loopExecutor.stop()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(loopCount).toBeLessThanOrEqual(1)
  })

  it('should not loop when when condition is false', async () => {
    let loopCount = 0
    const loopExecutor = new WarpExecutor(config, adapters, {
      ...handlers,
      onLoop: () => { loopCount++ },
    })

    const loopWarp: Warp = {
      ...warp,
      actions: [
        { type: 'prompt', label: 'Say Hello', prompt: 'Hello' },
        { type: 'loop' as any, label: 'Conditional Loop', when: '1 === 0', maxIterations: 10, delay: 0 },
      ],
    }

    await loopExecutor.execute(loopWarp, [])
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(loopCount).toBe(0)
    loopExecutor.stop()
  })

  it('should call onMountAction for mount actions', async () => {
    const mountHandler = jest.fn()
    const mountExecutor = new WarpExecutor(config, adapters, { ...handlers, onMountAction: mountHandler })

    const mountWarp: Warp = {
      ...warp,
      actions: [{ type: 'mount' as any, label: 'Mount', warp: 'some-warp' }],
    }

    await mountExecutor.execute(mountWarp, [])
    expect(mountHandler).toHaveBeenCalledWith(expect.objectContaining({
      action: expect.objectContaining({ type: 'mount', warp: 'some-warp' }),
    }))
  })

  it('should skip mount action when when condition is false', async () => {
    const mountHandler = jest.fn()
    const mountExecutor = new WarpExecutor(config, adapters, { ...handlers, onMountAction: mountHandler })

    const mountWarp: Warp = {
      ...warp,
      actions: [{ type: 'mount' as any, label: 'Mount', warp: 'some-warp', when: '1 === 0' }],
    }

    await mountExecutor.execute(mountWarp, [])
    expect(mountHandler).not.toHaveBeenCalled()
  })

  it('should silently skip loop when onLoop handler is absent', async () => {
    const noLoopExecutor = new WarpExecutor(config, adapters, handlers)

    const loopWarp: Warp = {
      ...warp,
      actions: [
        { type: 'prompt', label: 'Hello', prompt: 'Hello' },
        { type: 'loop' as any, label: 'Loop', maxIterations: 3, delay: 0 },
      ],
    }

    const result = await noLoopExecutor.execute(loopWarp, [])
    expect(result.immediateExecutions).toHaveLength(1)
    expect(result.immediateExecutions[0].output.PROMPT).toBe('Hello')
  })

  it('should coerce state write values (numbers, booleans)', async () => {
    const stateExecutor = new WarpExecutor(config, adapters, handlers)
    const cache = stateExecutor['factory'].getCache()

    const stateWarp: Warp = {
      ...warp,
      actions: [{
        type: 'state' as any, label: 'Write', op: 'write', store: 'coerce-test',
        data: { count: '42', active: 'true', name: 'hello' },
      }],
    }

    await stateExecutor.execute(stateWarp, [])
    const stored = await cache.get<Record<string, any>>('state:default:coerce-test')
    expect(stored).toEqual({ count: 42, active: true, name: 'hello' })
  })

  it('should handle errors during prompt action execution', async () => {
    const errorWarp: Warp = {
      protocol: 'warp',
      name: 'error-test-warp',
      title: 'Error Test Warp',
      description: 'Warp for testing error handling',
      actions: [
        {
          type: 'prompt',
          label: 'Error Prompt',
          prompt: 'This is a prompt.',
        },
      ],
      output: {
        RESULT: 'out',
      },
    }

    const errorMessage = 'Simulated error during prompt execution'

    // Mock factory.getChainInfoForWarp to throw an error
    jest.spyOn(executor['factory'], 'getChainInfoForWarp').mockRejectedValue(new Error(errorMessage))

    const result = await executor.execute(errorWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('error')
    expect(execution.output._DATA).toBeInstanceOf(Error)
    expect(execution.output._DATA.message).toBe(errorMessage)
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        result: expect.objectContaining({
          status: 'error',
          output: expect.objectContaining({
            _DATA: expect.objectContaining({ message: errorMessage }),
          }),
        }),
      })
    )
  })
})
