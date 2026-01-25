/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,
  // Indicates whether the coverage information should be collected while executing the test
  testMatch: ['**/src/**/*.@(spec|test).ts?(x)'],
  // Module name mapper for path aliases from tsconfig.json
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^vscode$': '<rootDir>/__mocks__/vscode.js'
  },
  // Transform files with ts-jest
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json' // Ensure it uses the correct tsconfig
      }
    ]
  },
  // Ignore transforms for node_modules
  transformIgnorePatterns: ['/node_modules/']
  // Setup files can be added here if needed, e.g., for global mocks or environment setup
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Note: For tests involving actual VS Code APIs, a different setup might be needed
  // using vscode-test or similar, but for unit tests like clipboard-parser, 'node' is fine.
}
