import {
  parse_multiple_files,
  parse_file_content_only,
  parse_response
} from './clipboard-parser'
import * as fs from 'fs'
import * as path from 'path'

describe('clipboard-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', test_case, filename),
      'utf-8'
    )
  }

  describe('parse_clipboard_multiple_files', () => {
    it('should parse comment filename format', () => {
      const text = load_test_case_file('comment-filename', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('comment-filename', 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file('comment-filename', 'file-2.txt')
      )
    })

    it('should parse file-xml format', () => {
      const text = load_test_case_file('file-xml', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('file-xml', 'file-1.txt')
      )
    })

    it('should parse file-xml format with CDATA', () => {
      const text = load_test_case_file('file-xml-with-cdata', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('file-xml-with-cdata', 'file-1.txt')
      )
    })

    it('should parse file-xml with CDATA inside a code block', () => {
      const text = load_test_case_file(
        'file-xml-with-cdata-without-code-blocks',
        'response.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(
          'file-xml-with-cdata-without-code-blocks',
          'file-1.txt'
        )
      )
    })

    it('should parse file-xml with inner code block', () => {
      const text = load_test_case_file(
        'file-xml-inner-code-block',
        'response.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('file-xml-inner-code-block', 'file-1.txt')
      )
    })

    it('should parse html comment filename format', () => {
      const text = load_test_case_file('html-comment-style', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('html-comment-style', 'file-1.txt')
      )
    })

    it('should handle workspace prefixes', () => {
      const text = load_test_case_file('with-workspace-prefix', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].workspace_name).toBe('frontend')
      expect(result[0].content).toBe(
        load_test_case_file('with-workspace-prefix', 'file-1.txt')
      )
    })

    it('should ignore workspace prefixes when has_single_root=true', () => {
      const text = load_test_case_file('with-workspace-prefix', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('frontend/src/index.ts')
      expect(result[0].workspace_name).toBeUndefined()
    })

    it('should merge content for duplicate files', () => {
      const text = load_test_case_file('duplicate-files', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('duplicate-files', 'file-1.txt')
      )
    })

    it('should parse paths with backslashes', () => {
      const text = load_test_case_file('backslash-paths', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file('backslash-paths', 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file('backslash-paths', 'file-2.txt')
      )
    })

    it('should parse with curly brace on same line as closing backticks', () => {
      const text = load_test_case_file(
        'curly-on-same-line-as-closing-backticks',
        'response.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(
          'curly-on-same-line-as-closing-backticks',
          'file-1.txt'
        )
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file(
          'curly-on-same-line-as-closing-backticks',
          'file-2.txt'
        )
      )
    })

    //     it('should handle quoted filenames', () => {
    //       const text = load_clipboard_text('quoted-filenames.txt')
    //       const result = parse_multiple_files({
    //         response: text,
    //         is_single_root_folder_workspace: true
    //       })

    //       expect(result).toHaveLength(1)
    //       expect(result[0].file_path).toBe('src/utils.py')
    //       expect(result[0].content).toBe(`def add(a, b):
    //     return a + b`)
    //     })

    it('should parse uncommented filename format', () => {
      const text = load_test_case_file('uncommented-filename', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/utils.py')
      expect(result[0].content).toBe(
        load_test_case_file('uncommented-filename', 'file-1.txt')
      )
    })

    it('should handle inner backticks within a diff block', () => {
      const text = load_test_case_file('diff-inner-backticks', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-inner-backticks', 'file-1.txt')
      )
    })

    it('should handle inner backticks within a code block', () => {
      const text = load_test_case_file('inner-backticks', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file('inner-backticks', 'file-1.txt')
      )
    })

    it('should handle raw inner backticks within a code block', () => {
      const text = load_test_case_file('inner-backticks-raw', 'response.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file('inner-backticks-raw', 'file-1.txt')
      )
    })

    it('should handle nested code blocks in markdown', () => {
      const text = load_test_case_file(
        'markdown-with-nested-code-block',
        'response.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/test.md')
      expect(result[0].content).toBe(
        load_test_case_file('markdown-with-nested-code-block', 'file-1.txt')
      )
    })
  })

  describe('parse_file_content_only', () => {
    it('should parse file content without code blocks', () => {
      const text = load_test_case_file('file-content-only', 'response.txt')
      const result = parse_file_content_only({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.file_path).toBe('src/index.ts')
        expect(result.content).toBe(
          load_test_case_file('file-content-only', 'file-1.txt')
        )
      }
    })

    it('should return null for invalid file content format', () => {
      const text = 'This is just regular text without a file path'
      const result = parse_file_content_only({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toBeNull()
    })
  })

  describe('parse_clipboard_content', () => {
    it('should parse direct diff format in variant a', () => {
      const text = load_test_case_file('diff-direct-variant-a', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-a', 'file-1.txt')
      )
    })

    it('should parse code-completion format', () => {
      const text = load_test_case_file('code-completion', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('code-completion')
      expect(result.code_completion).toBeDefined()
      if (result.code_completion) {
        expect(result.code_completion.file_path).toBe('src/index.ts')
        expect(result.code_completion.line).toBe(25)
        expect(result.code_completion.character).toBe(5)
        expect(result.code_completion.content).toBe(
          'console.log("completion");'
        )
      }
    })

    it('should parse direct diff format in variant b', () => {
      const text = load_test_case_file('diff-direct-variant-b', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-b', 'file-1.txt')
      )
    })

    it('should parse direct diff format in variant c', () => {
      const text = load_test_case_file('diff-direct-variant-c', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-c', 'file-1.txt')
      )
    })

    it('should parse direct diff format in variant d', () => {
      const text = load_test_case_file('diff-direct-variant-d', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-d', 'file-1.txt')
      )
    })

    it('should parse direct diff format in variant e', () => {
      const text = load_test_case_file('diff-direct-variant-e', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-e', 'file-1.txt')
      )
    })

    it('should parse direct diff format in variant f', () => {
      const text = load_test_case_file('diff-direct-variant-f', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-f', 'file-1.txt')
      )
    })

    it('should parse direct diff format in variant g', () => {
      const text = load_test_case_file('diff-direct-variant-g', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-g', 'file-1.txt')
      )
    })

    it('should parse direct diff format without a/ b/ prefixes', () => {
      const text = load_test_case_file('diff-no-prefix', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-no-prefix', 'file-1.txt')
      )
    })

    it('should parse direct diff format for file deletion', () => {
      const text = load_test_case_file(
        'diff-direct-variant-deletion',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-direct-variant-deletion', 'file-1.txt')
      )
    })

    it('should parse direct diff format for file rename', () => {
      const text = load_test_case_file('diff-rename', 'response.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/old.ts')
      expect(result.patches![0].new_file_path).toBe('src/new.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-rename', 'file-1.txt')
      )
    })

    it('should parse multiple diff files format in variant a', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-a',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-a', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-a', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant b', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-b',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-b', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-b', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant c', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-c',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-c', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-c', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant d', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-d',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-d', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-d', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant e', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-e',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-e', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-e', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant f', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-f',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-f', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-f', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant g', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-g',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-g', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-g', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant h', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-h',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-h', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-h', 'file-2.txt')
      )
    })

    it('should parse multiple diff files format in variant i', () => {
      const text = load_test_case_file(
        'diff-multiple-files-variant-i',
        'response.txt'
      )
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file('diff-multiple-files-variant-i', 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file('diff-multiple-files-variant-i', 'file-2.txt')
      )
    })
  })
})
