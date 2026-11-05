/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: [
    '<rootDir>/apps/**/*.spec.ts?(x)',
    '<rootDir>/packages/**/*.spec.ts?(x)'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/dist/'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@/(.*)$': '<rootDir>/apps/editor/src/$1'
  }
}
