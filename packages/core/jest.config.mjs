export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // mppx ships pure ESM with .js extension — ts-jest can't parse it.
    // The validator/builder paths under test never reach mppx, so stub it.
    '^mppx/client$': '<rootDir>/src/__mocks__/mppx-client.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
}
