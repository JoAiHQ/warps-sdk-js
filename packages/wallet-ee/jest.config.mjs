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
    '^.+\\.js$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@joai/warps$': '<rootDir>/../core/src/index.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(jose|.*\\.mjs$))'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  passWithNoTests: true,
}
