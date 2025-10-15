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

  describe('parse_multiple_files', () => {
    it('parses multiple files when file paths are in comments at the start of code blocks', () => {
      const test_case = 'comment-filename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses file when using file-xml format within a markdown code block', () => {
      const test_case = 'file-xml'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file when using file-xml format with CDATA outside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file when using file-xml format with CDATA inside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata-without-code-blocks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file when file-xml content is wrapped in its own markdown code block', () => {
      const test_case = 'file-xml-inner-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file when file path is in an HTML-style comment inside a code block', () => {
      const test_case = 'html-comment-style'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses multiple files when file paths are in HTML-style comments outside of code blocks', () => {
      const test_case = 'html-comment-filename-outside-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/hello-world.html')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/lorem.css')
      expect(result[1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('extracts workspace name from file path when in a multi-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].workspace_name).toBe('frontend')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('treats workspace name as part of the file path when in a single-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('frontend/src/index.ts')
      expect(result[0].workspace_name).toBeUndefined()
    })

    it('merges content when the same file path appears in multiple code blocks', () => {
      const test_case = 'duplicate-files'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file paths that use backslashes as separators', () => {
      const test_case = 'backslash-paths'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses code blocks where a curly brace is on the same line as closing backticks', () => {
      const test_case = 'curly-on-same-line-as-closing-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses file when file path is the first line of a code block without comments', () => {
      const test_case = 'uncommented-filename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/utils.py')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('handles nested code blocks with language identifiers inside a code block', () => {
      const test_case = 'inner-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('handles nested code blocks without language identifiers inside a code block', () => {
      const test_case = 'inner-backticks-raw'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses markdown files with nested code blocks correctly', () => {
      const test_case = 'markdown-with-nested-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/test.md')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses PHP files when the opening tag appears before the file path comment', () => {
      const test_case = 'php-opening-tag'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.php')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file when file path comment and opening backticks are on the same line', () => {
      const test_case = 'filename-comment-and-backticks-on-same-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file path from code block language identifier', () => {
      const test_case = 'language-and-path'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file path from code block arguments', () => {
      const test_case = 'path-in-markdown-argument'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses file path from markdown heading preceding a code block', () => {
      const test_case = 'path-above-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/hello-world.ts')
      expect(result[0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })
  })

  describe('parse_file_content_only', () => {
    it('parses file content when there are no markdown code blocks', () => {
      const test_case = 'file-content-only'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_file_content_only({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.file_path).toBe('src/index.ts')
        expect(result.content).toBe(
          load_test_case_file(test_case, 'file-1.txt')
        )
      }
    })

    it('returns null when response is just text and not a file', () => {
      const text = 'This is just regular text without a file path'
      const result = parse_file_content_only({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toBeNull()
    })
  })

  describe('parse_response', () => {
    it('parses diff format without markdown code block or git header', () => {
      const test_case = 'diff-direct-variant-a'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses code completion format with file path, line, and character', () => {
      const test_case = 'code-completion'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

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

    it('parses diff format with git header but no markdown code block', () => {
      const test_case = 'diff-direct-variant-b'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format with git header but no ---/+++ lines', () => {
      const test_case = 'diff-direct-variant-c'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format with git header and hunk header on same line', () => {
      const test_case = 'diff-direct-variant-d'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff for a new file with git header', () => {
      const test_case = 'diff-direct-variant-e'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format with timestamps in ---/+++ lines', () => {
      const test_case = 'diff-direct-variant-f'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format with quoted file paths in ---/+++ lines', () => {
      const test_case = 'diff-direct-variant-g'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format where file paths lack a/ and b/ prefixes', () => {
      const test_case = 'diff-no-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format for a file deletion', () => {
      const test_case = 'diff-direct-variant-deletion'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff format for a file rename', () => {
      const test_case = 'diff-rename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/old.ts')
      expect(result.patches![0].new_file_path).toBe('src/new.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses multiple diffs each in their own markdown code block', () => {
      const test_case = 'diff-multiple-files-variant-a'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs with git headers each in their own markdown code block', () => {
      const test_case = 'diff-multiple-files-variant-b'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs with git headers and no ---/+++ lines in markdown code blocks', () => {
      const test_case = 'diff-multiple-files-variant-c'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs with hunk header on same line as git header in markdown code blocks', () => {
      const test_case = 'diff-multiple-files-variant-d'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple new file diffs in their own markdown code blocks', () => {
      const test_case = 'diff-multiple-files-variant-e'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs with timestamps in their own markdown code blocks', () => {
      const test_case = 'diff-multiple-files-variant-f'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs concatenated within a single markdown code block', () => {
      const test_case = 'diff-multiple-files-variant-g'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs concatenated without a markdown code block', () => {
      const test_case = 'diff-multiple-files-variant-h'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs with quoted file paths in separate markdown code blocks', () => {
      const test_case = 'diff-multiple-files-variant-i'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses multiple diffs without a/ b/ prefixes in a single markdown code block', () => {
      const test_case = 'diff-multiple-files-variant-j'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses a mix of a new file in a code block and a diff in a diff block', () => {
      const test_case = 'diff-multiple-files-variant-k'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.html')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses a mix of a new file in file-xml format and a diff in a diff block', () => {
      const test_case = 'diff-multiple-files-variant-l'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.html')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses a mix of a file deletion diff and a new file diff', () => {
      const test_case = 'diff-multiple-files-variant-m'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('parses a mix of a new file from heading and code block, and a separate diff block', () => {
      const test_case = 'diff-multiple-files-variant-n'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.html')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
      expect(result.patches![1].content).toBe(
        load_test_case_file(test_case, 'file-2.txt')
      )
    })

    it('merges a new file and a diff for the same file path into one patch', () => {
      const test_case = 'diff-multiple-files-variant-o'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)

      expect(result.patches![0].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff correctly when content contains nested backticks', () => {
      const test_case = 'diff-inner-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff for a markdown file that contains a code block', () => {
      const test_case = 'diff-inner-triple-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)

      expect(result.patches![0].file_path).toBe('README.md')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })

    it('parses diff inside a markdown block that is not properly closed', () => {
      const test_case = 'diff-markdown-missing-ending'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(
        load_test_case_file(test_case, 'file-1.txt')
      )
    })
  })
})
