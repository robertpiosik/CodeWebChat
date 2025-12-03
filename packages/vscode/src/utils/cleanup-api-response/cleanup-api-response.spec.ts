import { cleanup_api_response } from './cleanup-api-response'
import * as fs from 'fs'
import * as path from 'path'

describe('cleanup_api_response', () => {
  const load_test_case_file = (test_case: string, filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-cases', test_case, filename),
      'utf-8'
    )
  }

  it('should return plain text as is', () => {
    const test_case = 'plain-text'
    const content = load_test_case_file(test_case, 'input.txt')
    const expected = load_test_case_file(test_case, 'expected.txt')
    expect(cleanup_api_response({ content })).toBe(expected)
  })

  it('should handle a complex file without modification', () => {
    const test_case = 'complex-file'
    const content = load_test_case_file(test_case, 'input.txt')
    const expected = load_test_case_file(test_case, 'expected.txt')
    expect(cleanup_api_response({ content })).toBe(expected)
  })

  it('should trim whitespace from the final result', () => {
    const test_case = 'trim-whitespace'
    const content = load_test_case_file(test_case, 'input.txt')
    const expected = load_test_case_file(test_case, 'expected.txt')
    expect(cleanup_api_response({ content })).toBe(expected)
  })

  it('should handle empty string input', () => {
    const content = ''
    expect(cleanup_api_response({ content })).toBe('')
  })

  describe('wrapper removal', () => {
    it('should remove markdown code block wrappers', () => {
      const test_case = 'remove-markdown-wrapper'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove markdown code block wrappers with language specifier', () => {
      const test_case = 'remove-markdown-wrapper-with-lang'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should extract a markdown code block with surrounding text', () => {
      const test_case = 'extract-markdown-with-surrounding-text'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove <file> tags', () => {
      const test_case = 'remove-file-tags'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove <files> tags', () => {
      const test_case = 'remove-files-tags'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove CDATA wrappers', () => {
      const test_case = 'remove-cdata-wrapper'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove DOCTYPE declaration', () => {
      const test_case = 'remove-doctype'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should handle nested wrappers iteratively', () => {
      const test_case = 'nested-wrappers'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should handle content with only wrappers', () => {
      const test_case = 'only-wrappers'
      const content = load_test_case_file(test_case, 'input.txt')
      expect(cleanup_api_response({ content })).toBe('')
    })

    it('should extract content from a code block surrounded by text', () => {
      const test_case = 'extract-code-block-surrounded-by-text'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })
  })

  describe('special tag removal', () => {
    it('should remove <think> block from the beginning', () => {
      const test_case = 'remove-think-block-at-start'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should remove <thought> block from the beginning', () => {
      const test_case = 'remove-thought-block-at-start'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should handle <think> block with newlines', () => {
      const test_case = 'remove-think-block-with-newlines'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })

    it('should only remove <think> block if it is at the start', () => {
      const test_case = 'keep-think-block-not-at-start'
      const content = load_test_case_file(test_case, 'input.txt')
      const expected = load_test_case_file(test_case, 'expected.txt')
      expect(cleanup_api_response({ content })).toBe(expected)
    })
  })
})
