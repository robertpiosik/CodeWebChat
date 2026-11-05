/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  ...require('../../jest.config.js'),
  rootDir: '../../',
  testMatch: [
    '<rootDir>/apps/editor/**/*.spec.ts?(x)'
  ]
}
