import Ajv from 'ajv'
import { WarpConfig } from './config'
import { getWarpInputAction } from './helpers'
import { Warp, WarpClientConfig, WarpContractAction, WarpQueryAction } from './types'

type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

type ValidationError = string

export class WarpValidator {
  constructor(private config: WarpClientConfig) {
    this.config = config
  }

  async validate(warp: Warp): Promise<ValidationResult> {
    const errors: ValidationError[] = []

    errors.push(...this.validateHasActions(warp))
    errors.push(...this.validateMaxOneValuePosition(warp))
    errors.push(...this.validateVariableNamesAndResultNamesUppercase(warp))
    errors.push(...this.validateAbiIsSetIfApplicable(warp))
    errors.push(...(await this.validateSchema(warp)))

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private validateHasActions(warp: Warp): ValidationError[] {
    try {
      const { action } = getWarpInputAction(warp)
      return action ? [] : ['Warp must have at least one action']
    } catch (error) {
      return [error instanceof Error ? error.message : 'Warp must have at least one action']
    }
  }

  private validateMaxOneValuePosition(warp: Warp): ValidationError[] {
    const position = warp.actions.filter((action) => {
      if (!action.inputs) return false
      return action.inputs.some((input) => input.position === 'value')
    })

    return position.length > 1 ? ['Only one value position action is allowed'] : []
  }

  private validateVariableNamesAndResultNamesUppercase(warp: Warp): ValidationError[] {
    const errors: ValidationError[] = []
    const validateUppercase = (obj: Record<string, any> | undefined, type: string) => {
      if (!obj) return
      Object.keys(obj).forEach((key) => {
        if (key !== key.toUpperCase()) {
          errors.push(`${type} name '${key}' must be uppercase`)
        }
      })
    }

    validateUppercase(warp.vars, 'Variable')
    validateUppercase(warp.output, 'Output')

    if (warp.trigger?.type === 'webhook' && warp.trigger.inputs) {
      validateUppercase(warp.trigger.inputs, 'Webhook trigger input')
    }

    return errors
  }

  private validateAbiIsSetIfApplicable(warp: Warp): ValidationError[] {
    const hasContractAction = warp.actions.some((action) => action.type === 'contract')
    const hasQueryAction = warp.actions.some((action) => action.type === 'query')

    if (!hasContractAction && !hasQueryAction) {
      return []
    }

    const hasAnyAbi = warp.actions.some((action) => (action as WarpContractAction | WarpQueryAction).abi)

    const hasAnyOutputRequiringAbi = Object.values(warp.output || {}).some(
      (output) => output.startsWith('out.') || output.startsWith('event.')
    )

    if (warp.output && !hasAnyAbi && hasAnyOutputRequiringAbi) {
      return ['ABI is required when output is present for contract or query actions']
    }
    return []
  }

  private async validateSchema(warp: Warp): Promise<ValidationError[]> {
    try {
      const schemaUrl = this.config.schema?.warp || WarpConfig.LatestWarpSchemaUrl
      const schemaResponse = await fetch(schemaUrl)
      const schema = await schemaResponse.json()
      const ajv = new Ajv({ strict: false })
      const validate = ajv.compile(schema)

      return validate(warp) ? [] : [`Schema validation failed: ${ajv.errorsText(validate.errors)}`]
    } catch (error) {
      return [`Schema validation failed: ${error instanceof Error ? error.message : String(error)}`]
    }
  }
}
