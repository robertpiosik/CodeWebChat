import { parse_response } from '../../../response-parser'
import * as fs from 'fs'
import * as path from 'path'

describe('diff-parser', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'cases', test_case, filename),
      'utf-8'
    )
  }

  it('parses diff format without markdown code block or git header', () => {
    const test_case = 'no-markdown-or-git-header'
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

  it('parses diff format with git header but no markdown code block', () => {
    const test_case = 'with-git-header-no-markdown'
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
    const test_case = 'with-git-header-no-file-lines'
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
    const test_case = 'git-and-hunk-header-same-line'
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
    const test_case = 'new-file-with-git-header'
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
    const test_case = 'with-timestamps'
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
    const test_case = 'with-quoted-paths'
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
    const test_case = 'no-prefix'
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
    const test_case = 'file-deletion'
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
    const test_case = 'rename'
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
    const test_case = 'multiple-files-separate-markdown-blocks'
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
    const test_case = 'multiple-files-with-git-headers-separate-markdown-blocks'
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
    const test_case = 'multiple-files-with-git-headers-no-file-lines'
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
    const test_case = 'multiple-files-git-and-hunk-header-same-line'
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
    const test_case = 'multiple-new-files-separate-markdown-blocks'
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
    const test_case = 'multiple-files-with-timestamps'
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
    const test_case = 'multiple-files-same-line-backticks'
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
    const test_case = 'multiple-files-single-markdown-block'
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
    const test_case = 'multiple-files-no-markdown-block'
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

  it('merges multiple diffs for the same file into a single diff item', () => {
    const test_case = 'multiple-edits-for-the-same-file'
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
      type: 'diff',
      file_path: 'src/ipsum.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })

  it('parses multiple diffs with quoted file paths in separate markdown code blocks', () => {
    const test_case = 'multiple-files-with-quoted-paths'
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
    const test_case = 'multiple-files-no-prefix-single-markdown-block'
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

  it('parses a mix of a new file in file-xml format and a diff in a diff block variant-1', () => {
    const test_case = 'mix-new-file-xml-and-diff-variant-1'
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

  it('parses a mix of a new file in file-xml format and a diff in a diff block variant-2', () => {
    const test_case = 'mix-new-file-xml-and-diff-variant-2'
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
    const test_case = 'mix-delete-and-new-file'
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

  it('parses diff and deletion via header', () => {
    const test_case = 'deletion-via-header'
    const text = load_test_case_file(test_case, `${test_case}.txt`)
    const result = parse_response({
      response: text,
      is_single_root_folder_workspace: true
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'diff',
      file_path: 'src/old.ts',
      content: load_test_case_file(test_case, '1-file.txt')
    })
    expect(result[1]).toMatchObject({
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })

  it('parses diff and deletion via redundant header', () => {
    const test_case = 'deletion-via-redundant-header'
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

  it('parses a mix of a new file from heading and code block, and a separate diff block', () => {
    const test_case = 'mix-new-file-from-heading-and-diff'
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

  it('parses a mix of a new file from an XML tag heading and code block, and a separate diff block', () => {
    const test_case = 'mix-new-file-from-xml-tag-heading-and-diff'
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

  it('parses a mix of text, non-diff code blocks, and diff blocks', () => {
    const test_case = 'non-diff-code-blocks'
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
      type: 'inline-file',
      content: load_test_case_file(test_case, '2-inline-file.txt')
    })
    expect(result[2]).toMatchObject({
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '3-file.txt')
    })
  })

  it('parses a mix of a rename one-liner and a diff', () => {
    const test_case = 'mix-rename-one-liner-and-diff'
    const text = load_test_case_file(test_case, `${test_case}.txt`)
    const result = parse_response({
      response: text,
      is_single_root_folder_workspace: true
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'diff',
      file_path: 'src/old.ts',
      new_file_path: 'src/new.ts',
      content: load_test_case_file(test_case, '1-file.txt')
    })
    expect(result[1]).toMatchObject({
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })

  it('parses a mix of a rename heading and an update diff for the same file', () => {
    const test_case = 'mix-rename-and-update'
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

  it('parses multiple diffs with text between the markdown code blocks', () => {
    const test_case = 'multiple-files-text-between'
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

  it('parses a diff patch where the file path is specified using an XML tag preceding the diff block', () => {
    const test_case = 'with-xml-file-path'
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
    const test_case = 'inner-backticks'
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
    const test_case = 'inner-triple-backticks'
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
    const test_case = 'markdown-missing-ending'
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
    const test_case = 'git-two-header-types'
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
    const test_case = 'markdown-path-above'
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

  it('parses diff format with file path specified in plain text above and inside a markdown code block', () => {
    const test_case = 'markdown-repeated-path-above'
    const text = load_test_case_file(test_case, `${test_case}.txt`)
    const result = parse_response({
      response: text,
      is_single_root_folder_workspace: true
    })

    expect(result).toHaveLength(4)
    expect(result[0]).toMatchObject({
      type: 'text',
      content: 'Lorem ipsum.'
    })
    expect(result[1]).toMatchObject({
      type: 'inline-file',
      content: 'pnpm add -D prettier',
      language: 'bash'
    })
    expect(result[2]).toMatchObject({
      type: 'text',
      content: 'Lorem ipsum.'
    })
    expect(result[3]).toMatchObject({
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })

  it('parses diff format with file path in heading, with intermediate text before the code block', () => {
    const test_case = 'markdown-path-above-with-text-containing-path'
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
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })

  it('parses diff with broken hunk header after git header', () => {
    const test_case = 'git-broken-hunk-header'
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

  it('parses diff within XML tags', () => {
    const test_case = 'within-xml-tags'
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

  it('parses diff within XML tags with unquoted path', () => {
    const test_case = 'within-xml-tags-unquoted-path'
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

  it('parses diff format when the file path is specified in a markdown heading above a diff block that lacks hunk headers', () => {
    const test_case = 'markdown-path-above-no-hunk-header'
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

  it('parses diff with empty lines interspersed between headers and content', () => {
    const test_case = 'with-empty-lines-between'
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

  it('parses diff format with redundant closing backticks', () => {
    const test_case = 'markdown-redundant-closing-backticks'
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

  it('parses diff format with unnecessary empty lines', () => {
    const test_case = 'markdown-unnecessary-empty-lines'
    const text = load_test_case_file(test_case, 'markdown-path-above.txt')
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

  it('does not treat spread operators (...) as file paths', () => {
    const test_case = 'ignore-ellipsis'
    const text = load_test_case_file(test_case, `${test_case}.txt`)
    const result = parse_response({
      response: text,
      is_single_root_folder_workspace: true
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      type: 'diff',
      file_path: 'src/index.ts',
      content: load_test_case_file(test_case, '1-file.txt')
    })
    expect(result[1]).toMatchObject({
      type: 'diff',
      file_path: 'src/test.ts',
      content: load_test_case_file(test_case, '2-file.txt')
    })
  })
})
