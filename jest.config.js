module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/apps/**/*.spec.ts',
    '<rootDir>/packages/**/*.spec.ts'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/dist/'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@/(.*)$': '<rootDir>/apps/editor/src/$1'
  }
}
