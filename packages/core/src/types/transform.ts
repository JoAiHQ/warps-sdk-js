export type TransformRunner = {
  run(code: string, args: any[]): Promise<any>
}

export type ClientTransformConfig = {
  runner?: TransformRunner | null
}
