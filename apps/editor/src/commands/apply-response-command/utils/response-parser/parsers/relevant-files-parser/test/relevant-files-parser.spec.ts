import * as fs from 'fs'
import * as path from 'path'
import { parse_relevant_files } from '../relevant-files-parser'

describe('relevant files parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'cases', test_case, filename),
      'utf-8'
    )
  }

  it('rejects when including code blocks', () => {
    const test_case = 'code-blocks-invalid'
    const text = load_test_case_file(test_case, 'relevant-files.txt')
    const result = parse_relevant_files({
      response: text,
      workspace_files: ['src/hello.ts', 'src/main.ts']
    })

    expect(result).toBeNull()
  })
})
