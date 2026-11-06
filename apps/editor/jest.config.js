/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  displayName: 'editor',
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  testMatch: ['<rootDir>/src/**/*.spec.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/dist/'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json'
      }
    ]
  }
}
