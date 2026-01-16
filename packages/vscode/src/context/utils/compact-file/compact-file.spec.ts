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

  it('should handle c-style content (combined)', () => {
    const case_path = path.join(__dirname, 'test-cases', 'c-style')
    const input = fs.readFileSync(path.join(case_path, 'input.txt'), 'utf-8')
    const expected = fs.readFileSync(
      path.join(case_path, 'output.txt'),
      'utf-8'
    )
    expect(compact_file(input, '.ts')).toBe(expected)
  })

  it('should strip jsx bodies', () => {
    const { input, expected } = load_test_case('jsx', '.')
    expect(compact_file(input, '.tsx')).toBe(expected)
  })

  it('should strip python function bodies', () => {
    const { input, expected } = load_test_case('python', '.')
    expect(compact_file(input, '.py')).toBe(expected)
  })

  it('should strip ruby method bodies', () => {
    const { input, expected } = load_test_case('ruby', '.')
    expect(compact_file(input, '.rb')).toBe(expected)
  })

  it('should strip css bodies', () => {
    const { input, expected } = load_test_case('css', '.')
    expect(compact_file(input, '.css')).toBe(expected)
  })

  it('should strip sql comments', () => {
    const { input, expected } = load_test_case('sql', '.')
    expect(compact_file(input, '.sql')).toBe(expected)
  })

  it('should strip html comments', () => {
    const { input, expected } = load_test_case('html', '.')
    expect(compact_file(input, '.html')).toBe(expected)
  })
})
