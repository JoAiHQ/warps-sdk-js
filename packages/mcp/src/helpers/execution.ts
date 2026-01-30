import { getWarpPrimaryAction, Warp, WarpActionInput } from '@joai/warps'

export const convertMcpArgsToWarpInputs = (warp: Warp, args: Record<string, any>): string[] => {
  const { action } = getWarpPrimaryAction(warp)
  if (!action.inputs) return []

  return action.inputs.map((input: WarpActionInput) => {
    const key = input.as || input.name
    const value = args[key] ?? input.default ?? null

    if (value === null && input.type === 'bool') return 'false'
    if (value === null || value === undefined) return ''
    return String(value)
  })
}
