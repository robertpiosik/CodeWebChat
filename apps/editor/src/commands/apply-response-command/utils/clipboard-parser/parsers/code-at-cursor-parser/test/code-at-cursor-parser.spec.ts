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

  describe('parse_response', () => {
    it('parses code completion format with file path, line, and character', () => {
      const test_case = 'code-completion'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'code-at-cursor',
        file_path: 'src/index.ts',
        line: 25,
        character: 5,
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses code completion format with surrounding text', () => {
      const test_case = 'code-completion-with-text'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'code-at-cursor',
        file_path: 'src/index.ts',
        line: 25,
        character: 5,
        content: load_test_case_file(test_case, '2-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '3-text.txt')
      })
    })
  })
})
