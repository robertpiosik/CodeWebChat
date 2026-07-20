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
    it('parses multiple files when file paths are in comments at the start of code blocks', () => {
      const test_case = 'comment-filename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

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

    it('parses multiple files including one with empty content', () => {
      const test_case = 'empty-file'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/hello.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file when using file-xml format within a markdown code block', () => {
      const test_case = 'file-xml'
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

    it('parses file when using code-block-xml format within a markdown code block', () => {
      const test_case = 'code-block-xml'
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

    it('parses file when using file-xml format with CDATA outside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata'
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

    it('parses file when using file-xml format with a non-standard tag', () => {
      const test_case = 'file-xml-non-standard-tag'
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

    it('parses file when CDATA is present inside a markdown code block with a comment filename', () => {
      const test_case = 'cdata-inside-code-block'
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

    it('parses file when using file-xml format with CDATA inside a markdown code block', () => {
      const test_case = 'file-xml-with-cdata-inside-code-block'
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

    it('parses file when file-xml content is wrapped in its own markdown code block', () => {
      const test_case = 'file-xml-inner-code-block'
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

    it('parses file when file-xml content is wrapped in its own markdown code block but the file tag is not closed', () => {
      const test_case = 'file-xml-inner-code-block-unclosed'
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

    it('parses file when file path is in an HTML-style comment inside a code block', () => {
      const test_case = 'html-comment-style'
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

    it('parses file path from HTML comment inside a markdown heading', () => {
      const test_case = 'html-comment-in-markdown-heading'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'README.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple files when file paths are in HTML-style comments outside of code blocks', () => {
      const test_case = 'html-comment-filename-outside-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/hello-world.html',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.css',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('extracts workspace name from file path when in a multi-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        workspace_name: 'frontend',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('treats workspace name as part of the file path when in a single-root workspace', () => {
      const test_case = 'with-workspace-prefix'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'frontend/src/index.ts'
      })
    })

    it('merges content when the same file path appears in multiple code blocks', () => {
      const test_case = 'duplicate-files'
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

    it('parses file paths that use backslashes as separators', () => {
      const test_case = 'backslash-paths'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses code blocks where a curly brace is on the same line as closing backticks', () => {
      const test_case = 'curly-on-same-line-as-closing-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses file when file path is the first line of a code block without comments', () => {
      const test_case = 'uncommented-filename'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/utils.py',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('handles nested code blocks with language identifiers inside a code block', () => {
      const test_case = 'inner-backticks'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('handles nested code blocks without language identifiers inside a code block', () => {
      const test_case = 'inner-backticks-raw'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses markdown files with nested code blocks correctly', () => {
      const test_case = 'markdown-with-nested-code-block'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/test.md',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses markdown files with nested markdown code blocks', () => {
      const test_case = 'markdown-inside-markdown'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file path is in a comment inside a code block of markdown type', () => {
      const test_case = 'markdown-code-block-with-code'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/main.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses multiple files when each is wrapped in its own outer markdown code block', () => {
      const test_case = 'markdown-wrappers'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses multiple files when wrapped in a single outer markdown code block', () => {
      const test_case = 'unclosed-markdown-wrapper'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '1-file.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'file',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '2-file.txt')
      })
    })

    it('parses PHP files when the opening tag appears before the file path comment', () => {
      const test_case = 'php-opening-tag'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.php',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file when file path comment and opening backticks are on the same line', () => {
      const test_case = 'filename-comment-and-backticks-on-same-line'
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

    it('parses file path from code block language identifier', () => {
      const test_case = 'language-and-path'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
      })
    })

    it('parses file path from code block arguments', () => {
      const test_case = 'path-in-markdown-argument'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.js',
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

    it('parses file path when it is included immediately after the opening code block backticks', () => {
      const test_case = 'markdown-backticks-file-path-in-one-line'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'file',
        file_path: 'src/index.js',
        content: load_test_case_file(test_case, '1-file.txt')
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

    it('parses file path from a code block preceding a content code block', () => {
      const test_case = 'path-above-code-block-enclosed-in-code-block'
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

    it('parses file path from a code block preceding a content code block without blank line', () => {
      const test_case = 'path-above-code-block-enclosed-in-code-block-2'
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

    it('handles path duplicated in empty code block', () => {
      const test_case = 'path-duplicated-in-empty-code-block'
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
        content: load_test_case_file(test_case, '2-text.txt')
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

    it('parses multiple files with text between the markdown code blocks', () => {
      const test_case = 'text-between'
      const text = load_test_case_file(test_case, `${test_case}.txt`)
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(11)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '1-text.txt')
      })
      expect(result[1]).toMatchObject({
        type: 'inline-file',
        content: load_test_case_file(test_case, '2-inline-file.txt')
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '3-text.txt')
      })
      expect(result[3]).toMatchObject({
        type: 'file',
        file_path: 'src/lorem.ts',
        content: load_test_case_file(test_case, '4-file.txt')
      })
      expect(result[4]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '5-text.txt')
      })
      expect(result[5]).toMatchObject({
        type: 'inline-file',
        content: load_test_case_file(test_case, '6-inline-file.txt')
      })
      expect(result[6]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '7-text.txt')
      })
      expect(result[7]).toMatchObject({
        type: 'file',
        file_path: 'src/ipsum.ts',
        content: load_test_case_file(test_case, '8-file.txt')
      })
      expect(result[8]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '9-text.txt')
      })
      expect(result[9]).toMatchObject({
        type: 'inline-file',
        content: load_test_case_file(test_case, '10-inline-file.txt')
      })
      expect(result[10]).toMatchObject({
        type: 'text',
        content: load_test_case_file(test_case, '11-text.txt')
      })
    })
  })

  describe('parse_response fallback to single file without blocks', () => {
    it('parses file content when there are no markdown code blocks', () => {
      const test_case = 'file-content-only'
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

    it('parses file content when file path is in a multi-line comment', () => {
      const test_case = 'path-in-multi-line-comment'
      const text = load_test_case_file(
        test_case,
        `path-in-multi-line-comment.txt`
      )
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
