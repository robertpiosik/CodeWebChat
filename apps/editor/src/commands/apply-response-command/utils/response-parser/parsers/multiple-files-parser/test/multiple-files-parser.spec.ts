import { parse_response } from '../../../response-parser'
import * as fs from 'fs'
import * as path from 'path'

describe('response-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'cases', test_case, filename),
      'utf-8'
    )
  }

  describe('parse_response', () => {
    it('parses conflict with inline file where the first code block contains a merge conflict and the second is an inline file', () => {
      const test_case = 'conflict-with-inline-file'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'inline-file',
        content: load_test_case_file(
          test_case,
          '2-conflict-with-inline-file.txt'
        )
      })
    })

    it('merges content when merge conflicts are split across separate code blocks', () => {
      const test_case = 'merge-conflicts-in-separate-code-blocks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('merges content and text when multiple merge conflicts for the same file are provided in separate code blocks with text between them', () => {
      const test_case = 'merge-conflicts-merge-the-same-file'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('merges content when merge conflicts use three dots notation', () => {
      const test_case = 'merge-conflicts-three-dots'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from markdown heading preceding a code block', () => {
      const test_case = 'path-above-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file path for a renamed file from markdown heading preceding a code block', () => {
      const test_case = 'path-above-code-block-renaming'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        renamed_from: 'src/welcome.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple markdowns with headins', () => {
      const test_case = 'multiple-markdowns-with-headings'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/world.md',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file path from plain text with colon preceding a code block', () => {
      const test_case = 'path-above-code-block-raw'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from bolded text above a code block', () => {
      const test_case = 'path-above-code-block-bold'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('extracts file path from backticks when there are no intermediate lines before code block', () => {
      const test_case = 'path-in-backticks-no-intermediate-empty-lines'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/main.py',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('extracts file path from commented backticks even with intermediate text before code block', () => {
      const test_case = 'path-in-backticks-comment-with-intermediate-text'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/main.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses text that appears immediately after a closing code block', () => {
      const test_case = 'text-below-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'text',
        content: 'Lorem ipsum.'
      })
    })

    it('parses deleted file header', () => {
      const test_case = 'delete-file-header'
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
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '3-text.txt')
      })
    })

    it('returns text item when response is just regular text', () => {
      const text = 'This is just regular text without a file path'
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: text
      })
    })
  })
})
