import { WarpChainName, WarpPlatformName } from './constants'
import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig } from './types'
import { WarpExecutor } from './WarpExecutor'

jest.mock('./helpers/x402', () => ({
  handleX402Payment: jest.fn((response) => response),
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
