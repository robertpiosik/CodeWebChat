import { parse_response } from '../../..'

describe('patch-repair-parser', () => {
  describe('parse_response', () => {
    it('parses patch repair format with file path', () => {
      const text = '### Patch repair: `src/index.ts`\n\n```typescript\nconsole.log("hello");\n```\n'
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'patch-repair',
        file_path: 'src/index.ts',
        content: 'console.log("hello");'
      })
    })

    it('parses patched file format with file path and surrounding text', () => {
      const text = 'Before.\n\n### Patched file: `src/index.ts`\n\n```typescript\nconsole.log("hello");\n```\n\nAfter.'
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        type: 'text',
        content: 'Before.'
      })
      expect(result[1]).toMatchObject({
        type: 'patch-repair',
        file_path: 'src/index.ts',
        content: 'console.log("hello");'
      })
      expect(result[2]).toMatchObject({
        type: 'text',
        content: 'After.'
      })
    })
  })
})
