import * as fs from 'fs'
import * as path from 'path'
import { process_truncated_content } from './process-truncation'

describe('process_truncated_content', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', test_case, filename),
      'utf-8'
    )
  }

  const run_test_case = (test_case: string) => {
    const original_text = load_test_case_file(test_case, 'original.txt')
    const truncated_text = load_test_case_file(test_case, 'truncated.txt')
    const expected_text = load_test_case_file(test_case, 'expected.txt')

    const result = process_truncated_content(truncated_text, original_text)
    expect(result).toBe(expected_text)
  }

  it('restores content in a basic middle truncation', () => {
    run_test_case('basic')
  })

  it('handles updates to lines that follow a truncation', () => {
    run_test_case('update-after-truncation')
  })

  it('handles multiple truncation markers in one file', () => {
    run_test_case('multiple-truncations')
  })

  it('handles truncations at the start and end of the file', () => {
    run_test_case('edge-truncations')
  })
})
