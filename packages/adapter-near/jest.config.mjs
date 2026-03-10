export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
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
    '^near-api-js$': '<rootDir>/src/test-support/near-api-js.mock.ts',
    '^@scure/bip39/wordlists/(.*)\\.js$': '@scure/bip39/wordlists/$1.js',
    '^@scure/bip39/wordlists/(.*)$': '@scure/bip39/wordlists/$1.js',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  globalSetup: '<rootDir>/jest.globalsetup.ts',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|near-api-js/.*|@scure/.*|@noble/.*|bs58/.*))'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
}
