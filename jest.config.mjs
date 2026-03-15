/** @type {import("jest").Config} **/
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, diagnostics: false }],
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
}
