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
    '^mppx/client$': '<rootDir>/../core/src/__mocks__/mppx-client.ts',
    '^@solana/kit$': '<rootDir>/jest.setup.ts',
    '^@x402/svm/exact/client$': '<rootDir>/jest.setup.ts',
    '^@scure/bip39/wordlists/(.*)\\.js$': '@scure/bip39/wordlists/$1.js',
    '^@scure/bip39/wordlists/(.*)$': '@scure/bip39/wordlists/$1.js',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  globalSetup: '<rootDir>/jest.globalsetup.ts',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@solana/.*|@scure/.*|@noble/.*|@x402/.*))'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
}
