module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/packages/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '/dist/'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@/(.*)$': '<rootDir>/packages/vscode/src/$1'
  }
}






