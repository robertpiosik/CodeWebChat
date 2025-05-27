import {
  parse_clipboard_multiple_files,
  parse_file_content_only,
  parse_clipboard_content
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

  describe('parse_clipboard_content', () => {
    it('should parse direct diff format in variant a', () => {
      const text = load_clipboard_text('diff-direct-variant-a.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse direct diff format in variant b', () => {
      const text = load_clipboard_text('diff-direct-variant-b.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse direct diff format in variant c', () => {
      const text = load_clipboard_text('diff-direct-variant-c.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse direct diff format in variant d', () => {
      const text = load_clipboard_text('diff-direct-variant-d.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse direct diff format in variant e', () => {
      const text = load_clipboard_text('diff-direct-variant-e.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- /dev/null
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse direct diff format in variant f', () => {
      const text = load_clipboard_text('diff-direct-variant-f.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse multiple diff files format in variant a', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-a.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant b', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-b.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant c', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-c.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant d', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-d.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant e', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-e.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- /dev/null
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- /dev/null
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant f', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-f.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant g', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-g.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })

    it('should parse multiple diff files format in variant h', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-h.txt')
      const result = parse_clipboard_content(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(2)

      expect(result.patches![0].file_path).toBe('src/lorem.ts')
      expect(result.patches![1].file_path).toBe('src/ipsum.ts')

      expect(result.patches![0].content).toBe(`--- a/src/lorem.ts
+++ b/src/lorem.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old lorem")
+console.log("new lorem")
`)
      expect(result.patches![1].content).toBe(`--- a/src/ipsum.ts
+++ b/src/ipsum.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old ipsum")
+console.log("new ipsum")
`)
    })
  })
})
