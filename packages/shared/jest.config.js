/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: true,
  // coverageDirectory: "coverage",
  // coverageProvider: "v8",
  testMatch: ['**/src/**/*.@(spec|test).ts'],
  // Module name mapper (if needed for internal @shared imports, but likely not necessary here)
  // moduleNameMapper: {
  //   '^@shared/(.*)$': '<rootDir>/src/$1',
  // },
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        // Use the main tsconfig which includes types for jest
        tsconfig: 'tsconfig.json'
      }
    ]
  }
}
