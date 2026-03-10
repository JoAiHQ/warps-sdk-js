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
    '^@joai/warps$': '<rootDir>/../../packages/core/src/index.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  passWithNoTests: true,
}
