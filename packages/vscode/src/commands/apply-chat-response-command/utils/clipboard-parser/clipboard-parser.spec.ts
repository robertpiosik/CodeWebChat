import {
  parse_multiple_files,
  parse_file_content_only,
  parse_response
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
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe(
        'console.log("hello")\n\nconsole.log("world")\n'
      )
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(`print("hello")`)
    })

    it('should parse file-xml format', () => {
      const text = load_clipboard_text('file-xml.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse file-xml format with CDATA', () => {
      const text = load_clipboard_text('file-xml-with-cdata.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse file-xml with CDATA inside a code block', () => {
      const text = load_clipboard_text(
        'file-xml-with-cdata-without-code-blocks.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse file-xml with inner code block', () => {
      const text = load_clipboard_text('file-xml-inner-code-block.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should parse html comment filename format', () => {
      const text = load_clipboard_text('html-comment-style.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should handle workspace prefixes', () => {
      const text = load_clipboard_text('with-workspace-prefix.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: false
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].workspace_name).toBe('frontend')
      expect(result[0].content).toBe('console.log("hello")')
    })

    it('should ignore workspace prefixes when has_single_root=true', () => {
      const text = load_clipboard_text('with-workspace-prefix.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('frontend/src/index.ts')
      expect(result[0].workspace_name).toBeUndefined()
    })

    it('should merge content for duplicate files', () => {
      const text = load_clipboard_text('duplicate-files.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('First part\n\nSecond part')
    })

    it('should parse paths with backslashes', () => {
      const text = load_clipboard_text('backslash-paths.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('console.log("hello")')
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe(`print("hello")`)
    })

    it('should parse with curly brace on same line as closing backticks', () => {
      const text = load_clipboard_text(
        'curly-on-same-line-as-closing-backticks.txt'
      )
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(2)
      expect(result[0].file_path).toBe('src/index.ts')
      expect(result[0].content).toBe('{\n  console.log("hello")\n}')
      expect(result[1].file_path).toBe('src/utils.py')
      expect(result[1].content).toBe('print("world")')
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
      const text = load_clipboard_text('uncommented-filename.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/utils.py')
      expect(result[0].content).toBe(`def add(a, b):
    return a + b`)
    })

    it('should handle inner backticks within a diff block', () => {
      const text = load_clipboard_text('diff-inner-backticks.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ b/src/index.ts
@@ -1,5 +1,7 @@
 console.log("hello")
-console.log("old message")
+\`\`\`
+console.log("inner backticks")
+\`\`\`
+console.log("new message")
`)
    })

    it('should handle inner backticks within a code block', () => {
      const text = load_clipboard_text('inner-backticks.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      const expected_content = `\`\`\`text
Lorem ipsum.
\`\`\`
console.log('outer');`
      expect(result[0].content).toBe(expected_content)
    })

    it('should handle raw inner backticks within a code block', () => {
      const text = load_clipboard_text('inner-backticks-raw.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/index.js')
      const expected_content = `\`\`\`
Lorem ipsum.
\`\`\`
console.log('outer');`
      expect(result[0].content).toBe(expected_content)
    })

    it('should handle nested code blocks in markdown', () => {
      const text = load_clipboard_text('markdown-with-nested-code-block.txt')
      const result = parse_multiple_files({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0].file_path).toBe('src/test.md')
      const expected_content = `Test

\`\`\`
test
\`\`\`
\`\`\`
test
\`\`\`
test`
      expect(result[0].content).toBe(expected_content)
    })
  })

  describe('parse_file_content_only', () => {
    it('should parse file content without code blocks', () => {
      const text = load_clipboard_text('file-content-only.txt')
      const result = parse_file_content_only({
        response: text,
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
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toBeNull()
    })
  })

  describe('parse_clipboard_content', () => {
    it('should parse direct diff format in variant a', () => {
      const text = load_clipboard_text('diff-direct-variant-a.txt')
      const result = parse_response(text, true)

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

    it('should parse code-completion format', () => {
      const text =
        '```typescript\n// src/index.ts 25:5\nconsole.log("completion");\n```'
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
      const text = load_clipboard_text('diff-direct-variant-b.txt')
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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

    it('should parse direct diff format in variant g', () => {
      const text = load_clipboard_text('diff-direct-variant-g.txt')
      const result = parse_response(text, true)

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

    it('should parse direct diff format without a/ b/ prefixes', () => {
      const text = `--- src/index.ts
+++ src/index.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`
      const result = parse_response(text, true)

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

    it('should parse direct diff format for file deletion', () => {
      const text = load_clipboard_text('diff-direct-variant-deletion.txt')
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/index.ts')
      expect(result.patches![0].content).toBe(`--- a/src/index.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-console.log("hello")
-console.log("old message")
`)
    })

    it('should parse direct diff format for file rename', () => {
      const text = `--- a/src/old.ts
+++ b/src/new.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`
      const result = parse_response(text, true)

      expect(result.type).toBe('patches')
      expect(result.patches).toHaveLength(1)
      expect(result.patches![0].file_path).toBe('src/old.ts')
      expect(result.patches![0].new_file_path).toBe('src/new.ts')
      expect(result.patches![0].content).toBe(`--- a/src/old.ts
+++ b/src/old.ts
@@ -1,3 +1,3 @@
 console.log("hello")
-console.log("old message")
+console.log("new message")
`)
    })

    it('should parse multiple diff files format in variant a', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-a.txt')
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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
      const result = parse_response(text, true)

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

    it('should parse multiple diff files format in variant i', () => {
      const text = load_clipboard_text('diff-multiple-files-variant-i.txt')
      const result = parse_response(text, true)

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
