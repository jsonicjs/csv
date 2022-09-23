/** @type {import('@ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  transform: {
    // "^.+\\.tsx?$": "esbuild-jest"
    // "^.+\\.tsx?$": "jest-esbuild"
    "^.+\\.tsx?$": "es-jest"
  },
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  watchPathIgnorePatterns: ['.*.js$'],
}
