import { apply_conflict_markers_to_content } from './conflict-marker-parser'
import * as fs from 'fs'
import * as path from 'path'

describe('conflict-marker-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', test_case, filename),
      'utf-8'
    )
  }

  describe('apply_conflict_markers_to_content', () => {
    it('applies a basic conflict marker correctly', () => {
      const test_case = 'basic-conflict'
      const original = load_test_case_file(test_case, 'original.txt')
      const markers = load_test_case_file(test_case, 'markers.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')

      const result = apply_conflict_markers_to_content(original, markers)
      expect(result).toBe(expected)
    })

    it('applies multiple conflict markers in a single file', () => {
      const test_case = 'multiple-conflicts'
      const original = load_test_case_file(test_case, 'original.txt')
      const markers = load_test_case_file(test_case, 'markers.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')

      const result = apply_conflict_markers_to_content(original, markers)
      expect(result).toBe(expected)
    })

    it('handles deletions via empty updated blocks', () => {
      const test_case = 'deletion'
      const original = load_test_case_file(test_case, 'original.txt')
      const markers = load_test_case_file(test_case, 'markers.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')

      const result = apply_conflict_markers_to_content(original, markers)
      expect(result).toBe(expected)
    })

    it('throws an error when context cannot be found', () => {
      const original = 'Some random text'
      const markers = '<<<<<<<\nMissing\n=======\nFound\n>>>>>>>'

      expect(() =>
        apply_conflict_markers_to_content(original, markers)
      ).toThrow(/Could not find content to replace/)
    })
  })
})
