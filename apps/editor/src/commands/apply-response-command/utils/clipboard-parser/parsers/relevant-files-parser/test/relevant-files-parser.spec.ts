import { parse_response } from '../../..'
import * as fs from 'fs'
import * as path from 'path'

describe('clipboard-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'cases', test_case, filename),
      'utf-8'
    )
  }

  describe('parse_response relevant files', () => {
    it('parses relevant files from a bullet list', () => {
      const test_case = 'bullet-list'
      const text = load_test_case_file(test_case, 'relevant-files.txt')
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true,
        workspace_files: ['src/hello.ts', 'src/welcome.ts']
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'relevant-files',
        file_paths: ['src/hello.ts', 'src/welcome.ts']
      })
    })

    it('parses relevant files from inline text', () => {
      const test_case = 'inline'
      const text = load_test_case_file(test_case, 'relevant-files.txt')
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true,
        workspace_files: ['src/hello.ts', 'src/welcome.ts', 'src/main.ts']
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'relevant-files',
        file_paths: ['src/hello.ts', 'src/welcome.ts', 'src/main.ts']
      })
    })
  })
})
