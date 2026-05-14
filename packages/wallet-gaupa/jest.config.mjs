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
  transformIgnorePatterns: ['node_modules/(?!(uuid|@multiversx|.*\\.mjs$))'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@joai/warps$': '<rootDir>/../../core/src/index.ts',
    '^mppx/client$': '<rootDir>/../../core/src/__mocks__/mppx-client.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  passWithNoTests: true,
}
