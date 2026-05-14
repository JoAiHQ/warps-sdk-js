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
  transformIgnorePatterns: ['node_modules/(?!(uuid|@multiversx|.*\\.mjs$|@scure/.*))'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@joai/warps$': '<rootDir>/../core/src/index.ts',
    '^mppx/client$': '<rootDir>/../core/src/__mocks__/mppx-client.ts',
    '^@scure/bip39$': '<rootDir>/src/__mocks__/@scure/bip39.ts',
    '^@scure/bip39/wordlists/english\\.js$': '<rootDir>/src/__mocks__/@scure/bip39/wordlists/english.js',
    '^@scure/bip39/wordlists/(.*)\\.js$': '<rootDir>/src/__mocks__/@scure/bip39/wordlists/$1.js',
    '^@scure/bip39/wordlists/(.*)$': '<rootDir>/src/__mocks__/@scure/bip39/wordlists/$1.js',
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],
}
