/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  projects: [
    '<rootDir>/apps/editor',
    {
      preset: 'ts-jest',
      testMatch: [
        '<rootDir>/apps/editor/src/**/*.spec.ts?(x)',
        '<rootDir>/packages/shared/**/*.spec.ts?(x)'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/apps/editor/'
      ],
    }
  ]
}
