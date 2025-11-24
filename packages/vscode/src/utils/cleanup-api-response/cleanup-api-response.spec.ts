import { cleanup_api_response } from './cleanup-api-response'

describe('cleanup_api_response', () => {
  it('should return plain text as is', () => {
    const content = 'This is some plain text.'
    expect(cleanup_api_response({ content })).toBe('This is some plain text.')
  })

  it('should trim whitespace from the final result', () => {
    const content = '  \n  some text \n  '
    expect(cleanup_api_response({ content })).toBe('some text')
  })

  it('should handle empty string input', () => {
    const content = ''
    expect(cleanup_api_response({ content })).toBe('')
  })

  describe('wrapper removal', () => {
    it('should remove markdown code block wrappers', () => {
      const content = '```\nconst a = 1;\n```'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove markdown code block wrappers with language specifier', () => {
      const content = '```javascript\nconst a = 1;\n```'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should extract a markdown code block with surrounding text', () => {
      const content =
        'Here is the code you requested:\n```javascript\nconst a = 1;\n```\nThanks!'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove <file> tags', () => {
      const content = '<file path="test.ts">\nconst a = 1;\n</file>'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove <files> tags', () => {
      const content = '<files>\nconst a = 1;\n</files>'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove CDATA wrappers', () => {
      const content = '<![CDATA[\nconst a = 1;\n]]>'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove DOCTYPE declaration', () => {
      const content = '<!DOCTYPE html>\n<html></html>'
      expect(cleanup_api_response({ content })).toBe('<html></html>')
    })

    it('should handle nested wrappers iteratively', () => {
      const content =
        '```typescript\n<file path="test.ts">\n<![CDATA[\nconsole.log("hello");\n]]>\n</file>\n```'
      expect(cleanup_api_response({ content })).toBe('console.log("hello");')
    })

    it('should handle content with only wrappers', () => {
      const content = '```\n<file path="test.ts">\n</file>\n```'
      expect(cleanup_api_response({ content })).toBe('')
    })

    it('should extract content from a code block surrounded by text', () => {
      const content = 'Some text\n```\ncode\n```\nSome other text'
      expect(cleanup_api_response({ content })).toBe('code')
    })
  })

  describe('special tag removal', () => {
    it('should remove <think> block from the beginning', () => {
      const content = '<think>I should write some code.</think>\nconst a = 1;'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should remove <thought> block from the beginning', () => {
      const content =
        '<thought>I should write some code.</thought>\nconst a = 1;'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should handle <think> block with newlines', () => {
      const content =
        '<think>\nI should write some code.\n</think>\nconst a = 1;'
      expect(cleanup_api_response({ content })).toBe('const a = 1;')
    })

    it('should only remove <think> block if it is at the start', () => {
      const content = 'const a = 1;\n<think>I should write some code.</think>'
      expect(cleanup_api_response({ content })).toBe(
        'const a = 1;\n<think>I should write some code.</think>'
      )
    })
  })
})
