export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'jsdom',
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
    '^@noble/ed25519$': '<rootDir>/src/__mocks__/@noble/ed25519.ts',
    '^@scure/bip39$': '<rootDir>/src/__mocks__/@scure/bip39.ts',
    '^@scure/bip39/wordlists/(.*)\\.js$': '@scure/bip39/wordlists/$1.js',
    '^@scure/bip39/wordlists/(.*)$': '@scure/bip39/wordlists/$1.js',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@noble/ed25519/.*|@scure/.*))'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
}
