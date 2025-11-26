import { parse_response } from './clipboard-parser'
import * as fs from 'fs'
import * as path from 'path'
import { parse_file_content_only, parse_multiple_files } from './parsers'

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
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple files including one with empty content', () => {
      const test_case = 'empty-file'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/hello.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file when using file-xml format within a markdown code block', () => {
      const test_case = 'file-xml'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when using file-xml format with CDATA outside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when using file-xml format with a non-standard tag', () => {
      const test_case = 'file-xml-non-standard-tag'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when CDATA is present inside a markdown code block with a comment filename', () => {
      const test_case = 'cdata-inside-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when using file-xml format with CDATA inside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata-inside-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file-xml content is wrapped in its own markdown code block', () => {
      const test_case = 'file-xml-inner-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file path is in an HTML-style comment inside a code block', () => {
      const test_case = 'html-comment-style'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from HTML comment inside a markdown heading', () => {
      const test_case = 'html-comment-in-markdown-heading'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'README.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple files when file paths are in HTML-style comments outside of code blocks', () => {
      const test_case = 'html-comment-filename-outside-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/hello-world.html',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/lorem.css',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('extracts workspace name from file path when in a multi-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        workspace_name: 'frontend',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('treats workspace name as part of the file path when in a single-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('file_path', 'frontend/src/index.ts')
    })

    it('merges content when the same file path appears in multiple code blocks', () => {
      const test_case = 'duplicate-files'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file paths that use backslashes as separators', () => {
      const test_case = 'backslash-paths'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses code blocks where a curly brace is on the same line as closing backticks', () => {
      const test_case = 'curly-on-same-line-as-closing-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file when file path is the first line of a code block without comments', () => {
      const test_case = 'uncommented-filename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('handles nested code blocks with language identifiers inside a code block', () => {
      const test_case = 'inner-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('handles nested code blocks without language identifiers inside a code block', () => {
      const test_case = 'inner-backticks-raw'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses markdown files with nested code blocks correctly', () => {
      const test_case = 'markdown-with-nested-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/test.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses markdown files with nested markdown code blocks', () => {
      const test_case = 'markdown-inside-markdown'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file path is in a comment inside a code block of markdown type', () => {
      const test_case = 'markdown-code-block-with-code'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/main.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple files when each is wrapped in its own outer markdown code block', () => {
      const test_case = 'markdown-wrappers'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple files when wrapped in a single outer markdown code block', () => {
      const test_case = 'unclosed-markdown-wrapper'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses PHP files when the opening tag appears before the file path comment', () => {
      const test_case = 'php-opening-tag'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.php',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file path comment and opening backticks are on the same line', () => {
      const test_case = 'filename-comment-and-backticks-on-same-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from code block language identifier', () => {
      const test_case = 'language-and-path'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from code block arguments', () => {
      const test_case = 'path-in-markdown-argument'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from markdown heading preceding a code block', () => {
      const test_case = 'path-above-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path when it is included immediately after the opening code block backticks', () => {
      const test_case = 'markdown-backticks-file-path-in-one-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from plain text with colon preceding a code block', () => {
      const test_case = 'path-above-code-block-raw'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        file_path: 'src/hello-world.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
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
          load_test_case_file(test_case, '1-file.txt')
        )
      }
    })

    it('parses file content when file path is in a multi-line comment', () => {
      const test_case = 'path-in-multi-line-comment'
      const text = load_test_case_file(
        test_case,
        `path-in-multi-line-comment.txt`
      )
      const result = parse_file_content_only({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.file_path).toBe('src/index.ts')
        expect(result.content).toBe(
          load_test_case_file(test_case, '1-file.txt')
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
      const test_case = 'diff-no-markdown-or-git-header'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses code completion format with file path, line, and character', () => {
      const test_case = 'code-completion'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'completion',
        file_path: 'src/index.ts',
        line: 25,
        character: 5,
        content: 'console.log("completion");'
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
        type: 'completion',
        file_path: 'src/index.ts',
        line: 25,
        character: 5,
        content: 'console.log("completion");'
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '2-text.txt')
      })
    })

    it('parses diff format with git header but no markdown code block', () => {
      const test_case = 'diff-with-git-header-no-markdown'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format with git header but no ---/+++ lines', () => {
      const test_case = 'diff-with-git-header-no-file-lines'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format with git header and hunk header on same line', () => {
      const test_case = 'diff-git-and-hunk-header-same-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff for a new file with git header', () => {
      const test_case = 'diff-new-file-with-git-header'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format with timestamps in ---/+++ lines', () => {
      const test_case = 'diff-with-timestamps'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format with quoted file paths in ---/+++ lines', () => {
      const test_case = 'diff-with-quoted-paths'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format where file paths lack a/ and b/ prefixes', () => {
      const test_case = 'diff-no-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses a diff inside a non-diff code block', () => {
      const test_case = 'diff-in-non-diff-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format for a file deletion', () => {
      const test_case = 'diff-file-deletion'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format for a file rename', () => {
      const test_case = 'diff-rename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/old.ts',
        new_file_path: 'src/new.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple diffs each in their own markdown code block', () => {
      const test_case = 'diff-multiple-files-separate-markdown-blocks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs with git headers each in their own markdown code block', () => {
      const test_case =
        'diff-multiple-files-with-git-headers-separate-markdown-blocks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs with git headers and no ---/+++ lines in markdown code blocks', () => {
      const test_case = 'diff-multiple-files-with-git-headers-no-file-lines'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs with hunk header on same line as git header in markdown code blocks', () => {
      const test_case = 'diff-multiple-files-git-and-hunk-header-same-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple new file diffs in their own markdown code blocks', () => {
      const test_case = 'diff-multiple-new-files-separate-markdown-blocks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs with timestamps in their own markdown code blocks', () => {
      const test_case = 'diff-multiple-files-with-timestamps'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs where code blocks end and start on the same line', () => {
      const test_case = 'diff-multiple-files-same-line-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs concatenated within a single markdown code block', () => {
      const test_case = 'diff-multiple-files-single-markdown-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs concatenated without a markdown code block', () => {
      const test_case = 'diff-multiple-files-no-markdown-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs with quoted file paths in separate markdown code blocks', () => {
      const test_case = 'diff-multiple-files-with-quoted-paths'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple diffs without a/ b/ prefixes in a single markdown code block', () => {
      const test_case = 'diff-multiple-files-no-prefix-single-markdown-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses a mix of a new file in a code block and a diff in a diff block', () => {
      const test_case = 'diff-mix-new-file-and-diff'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.html',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses a mix of a new file in file-xml format and a diff in a diff block', () => {
      const test_case = 'diff-mix-new-file-xml-and-diff'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.html',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses a mix of a file deletion diff and a new file diff', () => {
      const test_case = 'diff-mix-delete-and-new-file'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses a mix of a new file from heading and code block, and a separate diff block', () => {
      const test_case = 'diff-mix-new-file-from-heading-and-diff'
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
        type: 'diff',
        file_path: 'src/lorem.html',
        content: load_test_case_file(test_case, '2-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '3-file.txt')
      })
    })

    it('parses multiple files with text between the markdown code blocks', () => {
      const test_case = 'text-between'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '3-text.txt')
      })
      expect(result[3]).toMatchObject({
        type: 'file',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '4-file.txt')
      })
      expect(result[4]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '5-text.txt')
      })
    })

    it('parses multiple diffs with text between the markdown code blocks', () => {
      const test_case = 'diff-multiple-files-text-between'
      const text = load_test_case_file(
        test_case,
        'diff-multiple-files-text-between.txt'
      )
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(5)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'diff',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '3-text.txt')
      })
      expect(result[3]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '4-file.txt')
      })
      expect(result[4]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '5-text.txt')
      })
    })

    it('merges a new file and a diff for the same file path into one patch', () => {
      const test_case = 'diff-merge-new-file-and-diff-same-path'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses a diff patch where the file path is specified using an XML tag preceding the diff block', () => {
      const test_case = 'diff-with-xml-file-path'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff correctly when content contains nested backticks', () => {
      const test_case = 'diff-inner-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff for a markdown file that contains a code block', () => {
      const test_case = 'diff-inner-triple-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'README.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff inside a markdown block that is not properly closed', () => {
      const test_case = 'diff-markdown-missing-ending'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff with both git header and traditional ---/+++ headers', () => {
      const test_case = 'diff-git-two-header-types'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses diff format with file path specified in plain text above a markdown code block', () => {
      const test_case = 'diff-markdown-path-above'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'diff',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })
  })
})
