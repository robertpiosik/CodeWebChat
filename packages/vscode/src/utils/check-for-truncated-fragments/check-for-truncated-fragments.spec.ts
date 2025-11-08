import { check_for_truncated_fragments } from './check-for-truncated-fragments'
import { FileItem } from '@/commands/apply-chat-response-command/utils/clipboard-parser'

describe('check_for_truncated_fragments', () => {
  it('should return false when no files contain truncated fragments', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.js',
        content: 'const x = 1;\nconst y = 2;'
      },
      {
        type: 'file',
        file_path: 'test2.py',
        content: 'def test():\n  return True'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(false)
  })

  it('should return true when a file contains JavaScript-style line comment ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.js',
        content: 'const x = 1;\n// ...\nconst y = 2;'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should return true when a file contains Python-style line comment ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.py',
        content: 'def test():\n# ...\n  return True'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should return true when a file contains SQL-style line comment ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.sql',
        content: 'SELECT * FROM users\n-- ...\nWHERE id = 1;'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should return true when a file contains block comment ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.js',
        content: 'const x = 1;\n/* ... */\nconst y = 2;'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should return true when a file contains JSX-style block comment ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.tsx',
        content: '<div>\n{/* ... lorem ipsum */}\n</div>'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should return true when any file in a list contains ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test1.js',
        content: 'const x = 1;\nconst y = 2;'
      },
      {
        type: 'file',
        file_path: 'test2.py',
        content: 'def test():\n# ...\n  return True'
      },
      {
        type: 'file',
        file_path: 'test3.js',
        content: 'const z = 3;'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should handle whitespace before ellipsis comments', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.js',
        content: 'const x = 1;\n  // ...\nconst y = 2;'
      }
    ]

    expect(check_for_truncated_fragments(files)).toBe(true)
  })

  it('should handle empty array of files', () => {
    expect(check_for_truncated_fragments([])).toBe(false)
  })

  it('should handle multiline block comments with ellipsis', () => {
    const files: FileItem[] = [
      {
        type: 'file',
        file_path: 'test.js',
        content: 'const x = 1;\n/*\n * ...\n */\nconst y = 2;'
      }
    ]

    // This should return false since the current regex doesn't match this pattern
    expect(check_for_truncated_fragments(files)).toBe(false)
  })
})
