import { WarpActionInput, WarpNativeValue } from './types'
import { WarpSerializer } from './WarpSerializer'

export enum WarpInputError {
  Required = 'required',
  String = 'string',
  InvalidFormat = 'invalid_format',
  Integer = 'integer',
  Boolean = 'boolean',
}

type ValidatableInput = Pick<WarpActionInput, 'name' | 'as' | 'type' | 'required' | 'pattern'>

export class WarpInputValidator {
  private readonly serializer = new WarpSerializer()

  /**
   * Validate submitted values against a collect action's input definitions.
   *
   * Inputs may be positional (same order as the definitions) or keyed by the input's `as` or `name`.
   * Values may be native or serialized warp args (e.g. "string:Max").
   * Returns errors keyed by input name.
   */
  validate(definitions: ValidatableInput[], inputs: unknown[] | Record<string, unknown>): Record<string, WarpInputError> {
    const errors: Record<string, WarpInputError> = {}

    definitions.forEach((input, index) => {
      if (!input || typeof input.name !== 'string') return

      const key = typeof input.as === 'string' ? input.as : input.name
      const raw = Array.isArray(inputs) ? inputs[index] : (inputs[key] ?? inputs[input.name])
      const error = this.validateValue(input, this.nativeValue(raw))

      if (error !== null) errors[input.name] = error
    })

    return errors
  }

  validateValue(input: ValidatableInput, value: unknown): WarpInputError | null {
    const type = input.type ?? 'string'
    const empty = value === null || value === undefined || value === ''

    if (input.required && (empty || (type === 'boolean' && value !== true))) return WarpInputError.Required
    if (empty) return null

    if ((type === 'string' || type === 'textarea') && typeof value !== 'string') return WarpInputError.String

    if (type === 'string' && typeof input.pattern === 'string' && input.pattern !== '' && !this.matches(input.pattern, value as string)) {
      return WarpInputError.InvalidFormat
    }

    if (type === 'uint64' && !this.isWholeNumber(value)) return WarpInputError.Integer

    if (type === 'boolean' && typeof value !== 'boolean') return WarpInputError.Boolean

    return null
  }

  private matches(pattern: string, value: string): boolean {
    try {
      return new RegExp(pattern, 'u').test(value)
    } catch {
      return false
    }
  }

  private isWholeNumber(value: unknown): boolean {
    if (typeof value === 'bigint') return value >= 0n
    if (typeof value === 'number') return Number.isInteger(value) && value >= 0
    return typeof value === 'string' && /^[0-9]+$/.test(value)
  }

  private nativeValue(value: unknown): unknown {
    if (typeof value !== 'string' || !value.includes(':')) return value

    try {
      return this.serializer.stringToNative(value)[1] as WarpNativeValue
    } catch {
      return value
    }
  }
}
