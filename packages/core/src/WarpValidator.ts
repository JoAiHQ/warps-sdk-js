import Ajv from 'ajv'
import { WarpConfig } from './config'
import { getWarpInputAction } from './helpers'
import { Warp, WarpClientConfig, WarpCollectDestinationHttp, WarpContractAction, WarpQueryAction } from './types'

type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

type ValidationError = string

const HTTP_WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Placeholders that look like `{{FOO_BAR}}` (all uppercase + underscores) are
 * global by convention — env vars, brand destinations, context injection — and
 * resolved by the runtime layer. Placeholders that look like `{{contactId}}`
 * (camelCase or lowercase) are per-request inputs and must be bound to a
 * url-positioned input to prevent URL collapse when the input is missing.
 */
const UPPERCASE_VAR_PATTERN = /^[A-Z][A-Z0-9_]*$/

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
    errors.push(...this.validateUrlPlaceholdersHaveInputs(warp))
    errors.push(...this.validateNoArgPositionsOnHttpActions(warp))
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

  /**
   * For each HTTP action with an URL, ensures every `{{X}}` placeholder in the
   * URL is either declared in `warp.vars` OR provided by an input with
   * `position: "url:X"`. Prevents dispatches where the URL collapses because
   * the placeholder was never interpolated (e.g. `/v1/contacts//activities`
   * becomes `/v1/contacts/activities`, which hits a different route).
   */
  private validateUrlPlaceholdersHaveInputs(warp: Warp): ValidationError[] {
    const errors: ValidationError[] = []
    const varNames = new Set(Object.keys(warp.vars ?? {}))

    for (const action of warp.actions) {
      const destination = (action as { destination?: WarpCollectDestinationHttp | string }).destination
      if (!destination || typeof destination === 'string' || !destination.url) continue

      const placeholders = this.extractUrlPlaceholders(destination.url)
      if (placeholders.length === 0) continue

      const inputs = (action as { inputs?: Array<{ position?: string; name?: string; as?: string }> }).inputs ?? []
      const urlPositionedInputNames = new Set(
        inputs
          .map((i) => i.position)
          .filter((p): p is string => typeof p === 'string' && p.startsWith('url:'))
          .map((p) => p.slice(4))
      )

      for (const placeholder of placeholders) {
        if (varNames.has(placeholder)) continue
        if (UPPERCASE_VAR_PATTERN.test(placeholder)) continue
        if (!urlPositionedInputNames.has(placeholder)) {
          errors.push(
            `URL "${destination.url}" contains {{${placeholder}}} but no input has position "url:${placeholder}" (and it is not declared in vars)`
          )
        }
      }
    }

    return errors
  }

  /**
   * For HTTP write actions (POST/PUT/PATCH/DELETE), flags inputs with
   * `position: "arg:N"` — these are CLI-style positional args that never
   * make it into the JSON body. The API receives an empty body and rejects
   * with "field required" errors. Inputs should omit `position` (default
   * body) or use `position: "payload:X"` / `position: "url:X"` explicitly.
   */
  private validateNoArgPositionsOnHttpActions(warp: Warp): ValidationError[] {
    const errors: ValidationError[] = []

    for (const action of warp.actions) {
      const destination = (action as { destination?: WarpCollectDestinationHttp | string }).destination
      if (!destination || typeof destination === 'string') continue

      const method = destination.method?.toUpperCase()
      if (!method || !HTTP_WRITE_METHODS.has(method)) continue

      const inputs = (action as { inputs?: Array<{ position?: string; name?: string; as?: string }> }).inputs ?? []
      for (const input of inputs) {
        if (input.position?.startsWith('arg:')) {
          const label = input.as ?? input.name ?? '(unnamed)'
          errors.push(
            `Input "${label}" has position "${input.position}" on HTTP ${method} action — CLI arg positions are not sent in the JSON body. Remove the position (defaults to body) or use "payload:X" / "url:X" explicitly.`
          )
        }
      }
    }

    return errors
  }

  private extractUrlPlaceholders(url: string): string[] {
    // Only path-segment placeholders matter — query-string `{{X}}` is tolerated
    // by the runtime (empty substitution leaves `?foo=` which is harmless) and
    // is typically resolved from any input by name rather than `position: "url:X"`.
    const pathPart = url.split('?')[0]
    const matches = pathPart.match(/\{\{([a-zA-Z_][a-zA-Z_0-9]*)\}\}/g)
    if (!matches) return []
    return matches.map((m) => m.slice(2, -2))
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
