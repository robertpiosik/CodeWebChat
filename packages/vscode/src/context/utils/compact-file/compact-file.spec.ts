import { compact_file } from './compact-file'
import * as fs from 'fs'
import * as path from 'path'

describe('compact_file', () => {
  const load_test_case = (
    test_case: string,
    directory = 'c-style'
  ): { input: string; expected: string } => {
    const case_path = path.join(__dirname, 'test-cases', directory, test_case)
    const input = fs.readFileSync(path.join(case_path, 'input.txt'), 'utf-8')
    const expected = fs.readFileSync(
      path.join(case_path, 'output.txt'),
      'utf-8'
    )
    return { input, expected }
  }

  it('should remove single line comments', () => {
    const { input, expected } = load_test_case('remove-single-line-comments')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should remove block comments on a single line', () => {
    const { input, expected } = load_test_case(
      'remove-block-comments-single-line'
    )
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should remove multi-line block comments', () => {
    const { input, expected } = load_test_case(
      'remove-multi-line-block-comments'
    )
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should preserve comments inside double quotes', () => {
    const { input, expected } = load_test_case('preserve-double-quotes')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should preserve comments inside single quotes', () => {
    const { input, expected } = load_test_case('preserve-single-quotes')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should preserve comments inside template literals', () => {
    const { input, expected } = load_test_case('preserve-template-literals')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should preserve block comments inside strings', () => {
    const { input, expected } = load_test_case(
      'preserve-block-comments-in-strings'
    )
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should handle escaped quotes inside strings', () => {
    const { input, expected } = load_test_case('handle-escaped-quotes')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should handle complex mixed content', () => {
    const { input, expected } = load_test_case('complex-mixed-content')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should handle input with only comments', () => {
    const { input, expected } = load_test_case('only-comments')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should strip function bodies when enabled', () => {
    const { input, expected } = load_test_case('javascript-bodies')
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should strip python function bodies', () => {
    const { input, expected } = load_test_case('python', '.')
    expect(compact_file(input, '.py')).toBe(expected)
  })
})
