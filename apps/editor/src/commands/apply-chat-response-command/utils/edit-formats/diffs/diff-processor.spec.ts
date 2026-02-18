import { apply_diff } from './diff-processor'
import * as fs from 'fs'
import * as path from 'path'

describe('diff-processor', () => {
  const load_test_case_file = (
    type: string,
    test_case: string,
    filename: string
  ): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', type, test_case, filename),
      'utf-8'
    )
  }

  describe('apply_diff', () => {
    it('applies diff with multiple hunks correctly', async () => {
      const test_case = 'multiple-hunks'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with insertions at start and end of file correctly', async () => {
      const test_case = 'insert-start-end'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with deletions only correctly', async () => {
      const test_case = 'deletion-only'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case correctly', async () => {
      const test_case = 'generic-1'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case 2 correctly', async () => {
      const test_case = 'generic-2'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case 3 correctly', async () => {
      const test_case = 'generic-3'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case 4 correctly', async () => {
      const test_case = 'generic-4'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case 5 correctly', async () => {
      const test_case = 'generic-5'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })

    it('applies diff with generic test case 6 correctly', async () => {
      const test_case = 'generic-6'
      const original = load_test_case_file('', test_case, 'original.txt')
      const diff = load_test_case_file('', test_case, 'diff.txt')
      const expected = load_test_case_file('', test_case, 'expected.txt')

      const result = apply_diff({
        original_code: original,
        diff_patch: diff
      })

      expect(result).toBe(expected)
    })
  })
})
