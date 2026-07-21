import * as fs from 'fs'
import * as path from 'path'
import { parse_relevant_files_from_response } from '../relevant-files-parser'

describe('response-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'cases', test_case, filename),
      'utf-8'
    )
  }

  describe('parse_response relevant files', () => {
    it('filters and sorts valid paths from text', () => {
      const text = 'Look at src/b.ts, then src/a.ts and src/c.ts'
      const result = parse_relevant_files_from_response({
        response: text,
        workspace_files: ['src/a.ts', 'src/b.ts']
      })

      expect(result).toMatchObject({
        type: 'relevant-files',
        file_paths: ['src/b.ts', 'src/a.ts']
      })
    })

    it('allows code blocks if they contain valid paths', () => {
      const test_case = 'code-blocks-valid'
      const text = load_test_case_file(test_case, 'relevant-files.txt')
      const result = parse_relevant_files_from_response({
        response: text,
        workspace_files: ['src/hello.ts', 'src/main.ts']
      })

      expect(result).toMatchObject({
        type: 'relevant-files',
        file_paths: ['src/hello.ts']
      })
    })

    it('rejects responses with code blocks that do not contain valid paths', () => {
      const test_case = 'code-blocks-invalid'
      const text = load_test_case_file(test_case, 'relevant-files.txt')
      const result = parse_relevant_files_from_response({
        response: text,
        workspace_files: ['src/hello.ts', 'src/main.ts']
      })

      expect(result).toBeNull()
    })
  })
})
