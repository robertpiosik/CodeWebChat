import {
  parse_clipboard_multiple_files,
  parse_file_content_only
} from './clipboard-parser'
import * as fs from 'fs'
import * as path from 'path'

describe('clipboard-parser', () => {
  const load_clipboard_text = (filename: string): string => {
    return fs.readFileSync(
      path.join(__dirname, 'test-clipboards', filename),
      'utf-8'
    )
  }

  describe('parse_clipboard_multiple_files', () => {
    it('should parse comment filename format', () => {
      const text = load_clipboard_text('comment-filename.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(`print("hello")`)
    })

    it('should parse file-xml format', () => {
      const text = load_clipboard_text('file-xml.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse file-xml format with CDATA', () => {
      const text = load_clipboard_text('file-xml-with-cdata.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse html comment filename format', () => {
      const text = load_clipboard_text('html-comment-style.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should handle workspace prefixes', () => {
      const text = load_clipboard_text('with-workspace-prefix.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].workspace_name).toBe('frontend')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should ignore workspace prefixes when has_single_root=true', () => {
      const text = load_clipboard_text('with-workspace-prefix.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('frontend/src/index.ts')
      expect(result[0].workspace_name).toBeUndefined()
    })

    it('should merge content for duplicate files', () => {
      const text = load_clipboard_text('duplicate-files.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('First part\n\nSecond part')
    })

    it('should ignore files without real code', () => {
      const text = load_clipboard_text('empty-file.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      // Should only include the backend file with real code
      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('backend/src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')

      // Should not include the frontend file that has no real code
      const frontendFile = result.find(
        (f) => f.file_path == 'frontend/src/index.ts'
      )
      expect(frontendFile).toBeUndefined()
    })

    it('should parse paths with backslashes', () => {
      const text = load_clipboard_text('backslash-paths.txt')
      const result = parse_clipboard_multiple_files({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(`print("hello")`)
    })
  })

  describe('parse_file_content_only', () => {
    it('should parse file content without code blocks', () => {
      const text = load_clipboard_text('file-content-only.txt')
      const result = parse_file_content_only({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.file_path).toBe('src/index.ts')
        expect(result.content).toBe('console.log("hello")')
      }
    })

    it('should return null for invalid file content format', () => {
      const text = 'This is just regular text without a file path'
      const result = parse_file_content_only({
        clipboard_text: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toBeNull()
    })
  })
})
