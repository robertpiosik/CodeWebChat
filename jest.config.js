/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    '<rootDir>/apps/editor',
    {
      displayName: 'other',
      preset: 'ts-jest',
      testEnvironment: 'node',
      clearMocks: true,
      testMatch: [
        '<rootDir>/apps/**/*.spec.ts?(x)',
        '<rootDir>/packages/**/*.spec.ts?(x)'
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/out/',
        '/dist/',
        '<rootDir>/apps/editor/'
      ],
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1'
      }
    }
  ]
}
