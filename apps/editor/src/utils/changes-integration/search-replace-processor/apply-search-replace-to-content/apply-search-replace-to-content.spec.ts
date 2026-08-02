import * as fs from 'fs'
import * as path from 'path'
import { apply_search_replace_to_content } from './apply-search-replace-to-content'
import { parse_search_replace_segments } from '../parse-search-replace-segments'

describe('search-replace-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', test_case, filename),
      'utf-8'
    )
  }

  const run_test_case = (test_case: string) => {
    const original_content = load_test_case_file(test_case, 'original.txt')
    const markers_content = load_test_case_file(test_case, 'markers.txt')
    const expected_content = load_test_case_file(test_case, 'expected.txt')
    const segments = parse_search_replace_segments(markers_content)

    const result = apply_search_replace_to_content({
      original_content,
      segments
    })

    expect(result).toBe(expected_content)
  }

  describe('apply_search_replace_to_content', () => {
    it('applies a basic search replace block correctly', () => {
      run_test_case('basic-conflict')
    })

    it('applies multiple search replace blocks in a single file', () => {
      run_test_case('multiple-conflicts')
    })

    it('handles deletions via empty updated blocks', () => {
      run_test_case('deletion')
    })

    it('throws an error when context cannot be found', () => {
      const original_content = 'Some random text'
      const markers_content = '<<<<<<<\nMissing\n=======\nFound\n>>>>>>>'
      const segments = parse_search_replace_segments(markers_content)

      expect(() =>
        apply_search_replace_to_content({
          original_content,
          segments
        })
      ).toThrow(/Could not find content to replace/)
    })

    it('handles whitespace issues in search replace blocks', () => {
      run_test_case('whitespace-issues')
    })

    it('handles rst syntax correctly', () => {
      run_test_case('rst-syntax')
    })
  })
})
