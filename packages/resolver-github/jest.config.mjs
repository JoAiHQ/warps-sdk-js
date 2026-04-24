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
    // resolver-github never touches mppx at runtime, so stub it for tests.
    '^mppx/client$': '<rootDir>/src/__mocks__/mppx-client.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],
}
