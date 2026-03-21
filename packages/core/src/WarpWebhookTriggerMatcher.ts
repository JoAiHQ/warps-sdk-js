import { WarpTrigger } from './types'

type WebhookTrigger = Extract<WarpTrigger, { type: 'webhook' }>

/**
 * Returns true if the payload satisfies all conditions in `trigger.match`.
 * If `match` is absent or empty, always returns true (fires for all events).
 */
export function matchesTrigger(trigger: WebhookTrigger, payload: unknown): boolean {
  const conditions = trigger.match ?? {}
  for (const [path, expected] of Object.entries(conditions)) {
    if (resolvePath(payload, path) !== expected) {
      return false
    }
  }
  return true
}

/**
 * Resolves the trigger's `inputs` against the payload.
 * Values containing a dot are treated as dot-paths into the payload; others as static literals.
 */
export function resolveInputs(trigger: WebhookTrigger, payload: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [name, pathOrLiteral] of Object.entries(trigger.inputs ?? {})) {
    result[name] = pathOrLiteral.includes('.') ? resolvePath(payload, pathOrLiteral) : pathOrLiteral
  }
  return result
}

/**
 * Resolves a dot-path (e.g. "highlight.text") into a nested value.
 * Returns undefined if any segment along the path is missing.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce((curr, key) => (curr as Record<string, unknown> | undefined)?.[key], obj)
}
