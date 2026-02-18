const BIGINT_PREFIX = '$bigint:'

// JSON replacer for value serialization (handles BigInts and other special types)
export const valueReplacer = (key: string, value: any): any => {
  if (typeof value === 'bigint') return BIGINT_PREFIX + value.toString()
  return value
}

// JSON reviver for value deserialization (handles BigInts and other special types)
export const valueReviver = (key: string, value: any): any => {
  if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length))
  }
  return value
}
