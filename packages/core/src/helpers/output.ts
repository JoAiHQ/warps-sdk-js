import { WarpConstants } from '../constants'
import { ResolvedInput, TransformRunner, Warp, WarpClientConfig } from '../types'
import { WarpExecutionOutput } from '../types/output'
import { WarpLogger } from '../WarpLogger'
import { WarpSerializer } from '../WarpSerializer'
import { getWarpActionByIndex } from './general'
import { buildMappedOutput } from './payload'

const extractOutputValues = (
  warp: Warp,
  actionIndex: number,
  extractValue: (pathParts: string[]) => any
): { stringValues: string[]; nativeValues: any[]; output: WarpExecutionOutput } => {
  const stringValues: string[] = []
  const nativeValues: any[] = []
  let output: WarpExecutionOutput = {}

  if (warp.output) {
    for (const [outputName, outputPath] of Object.entries(warp.output)) {
      if (outputPath.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = parseOutputOutIndex(outputPath)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        output[outputName] = null
        continue
      }
      const [outputType, ...pathParts] = outputPath.split('.')

      if (outputType === 'out' || outputType.startsWith('out[') || outputType === '$') {
        const value = extractValue(pathParts)
        stringValues.push(String(value))
        nativeValues.push(value)
        output[outputName] = value
      } else {
        output[outputName] = outputPath
      }
    }
  }

  return { stringValues, nativeValues, output }
}

export const extractCollectOutput = async (
  warp: Warp,
  response: any,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  config: WarpClientConfig
): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> => {
  const getNestedValueFromObject = (obj: any, path: string[]): any =>
    path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj)

  const extractValue = (pathParts: string[]): any =>
    pathParts.length === 0 ? response : getNestedValueFromObject(response, pathParts)

  const { stringValues, nativeValues, output } = extractOutputValues(warp, actionIndex, extractValue)

  return {
    values: { string: stringValues, native: nativeValues, mapped: buildMappedOutput(inputs, serializer) },
    output: await evaluateOutputCommon(warp, output, response, actionIndex, inputs, serializer, config),
  }
}

export const evaluateOutputCommon = async (
  warp: Warp,
  baseOutput: WarpExecutionOutput,
  rawOutput: any,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  config: WarpClientConfig
): Promise<WarpExecutionOutput> => {
  if (!warp.output) return baseOutput
  let output = { ...baseOutput }
  output = evaluateInputOutput(output, warp, actionIndex, inputs, serializer)
  output = await evaluateTransformOutput(warp, output, rawOutput, config.transform?.runner || null)
  return output
}

const evaluateInputOutput = (
  output: WarpExecutionOutput,
  warp: Warp,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer
): WarpExecutionOutput => {
  const modifiable = { ...output }
  const actionInputs = getWarpActionByIndex(warp, actionIndex)?.inputs || []

  for (const [key, value] of Object.entries(modifiable)) {
    if (typeof value === 'string' && value.startsWith('in.')) {
      const inputName = value.split('.')[1]
      const inputIndex = actionInputs.findIndex((i) => i.as === inputName || i.name === inputName)
      const valueAtIndex = inputIndex !== -1 ? inputs[inputIndex]?.value : null
      modifiable[key] = valueAtIndex ? serializer.stringToNative(valueAtIndex)[1] : null
    }
  }
  return modifiable
}

const evaluateTransformOutput = async (
  warp: Warp,
  baseOutput: WarpExecutionOutput,
  rawOutput: any,
  transformRunner: TransformRunner | null
): Promise<WarpExecutionOutput> => {
  if (!warp.output) return baseOutput
  const modifiable = { ...baseOutput }

  const transforms = Object.entries(warp.output)
    .filter(([, path]) => path.startsWith(WarpConstants.Transform.Prefix))
    .map(([key, path]) => ({ key, code: path.substring(WarpConstants.Transform.Prefix.length) }))

  if (transforms.length > 0 && (!transformRunner || typeof transformRunner.run !== 'function')) {
    throw new Error('Transform output is defined but no transform runner is configured. Provide a runner via config.transform.runner.')
  }

  // Context now includes 'out' containing the raw response
  const context: Record<string, any> = { ...modifiable, out: rawOutput }

  for (const { key, code } of transforms) {
    try {
      modifiable[key] = await transformRunner!.run(code, context)
      // Update context for subsequent transforms (if they depend on each other)
      context[key] = modifiable[key]
    } catch (err) {
      WarpLogger.error(`Transform error for Warp '${warp.name}' with output '${key}':`, err)
      modifiable[key] = null
      context[key] = null
    }
  }

  return modifiable
}

export const extractPromptOutput = async (
  warp: Warp,
  promptValue: string,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  config: WarpClientConfig
): Promise<{ values: { string: string[]; native: any[]; mapped: Record<string, any> }; output: WarpExecutionOutput }> => {
  const extractValue = (pathParts: string[]): any => (pathParts.length === 0 ? promptValue : null)

  const { stringValues, nativeValues, output } = extractOutputValues(warp, actionIndex, extractValue)

  const evaluatedOutput = await evaluateOutputCommon(warp, output, promptValue, actionIndex, inputs, serializer, config)

  // Always add PROMPT output with the prompt value, unless it's already defined
  if (!('PROMPT' in evaluatedOutput)) {
    evaluatedOutput.PROMPT = promptValue
  }

  return {
    values: { string: stringValues, native: nativeValues, mapped: buildMappedOutput(inputs, serializer) },
    output: evaluatedOutput,
  }
}

export const parseOutputOutIndex = (outputPath: string): number | null => {
  if (outputPath === 'out') return 1
  const outIndexMatch = outputPath.match(/^out\[(\d+)\]/)
  if (outIndexMatch) return parseInt(outIndexMatch[1], 10)
  if (outputPath.startsWith('out.') || outputPath.startsWith('event.')) return null
  return null
}
