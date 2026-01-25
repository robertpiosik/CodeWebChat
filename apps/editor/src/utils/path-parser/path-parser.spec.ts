import { extract_paths_from_text } from './path-parser'

describe('extract_paths_from_text', () => {
  it('should extract simple unquoted path', () => {
    const text = 'src/utils/file.ts'
    const result = extract_paths_from_text(text)
    expect(result).toEqual([text])
  })

  it('should extract multiple unquoted paths', () => {
    const text = 'src/utils/file.ts src/components/button.js'
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/utils/file.ts', 'src/components/button.js'])
  })

  it('should extract a single quoted path', () => {
    const text = "'src/utils/file.ts'"
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/utils/file.ts'])
  })

  it('should extract a double quoted path', () => {
    const text = '"src/utils/file.ts"'
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/utils/file.ts'])
  })

  it('should extract a backtick quoted path', () => {
    const text = '`src/utils/file.ts`'
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/utils/file.ts'])
  })

  it('should handle mixed quotes in text', () => {
    const text = `Check these files: 'file1.ts', "file2.js", \`file3.py\``
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['file1.ts', 'file2.js', 'file3.py'])
  })

  it('should filter out non-path strings', () => {
    const text = 'lorem src/utils/file.ts ipsum'
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/utils/file.ts'])
  })

  it('should handle paths with special characters', () => {
    const text = 'src/@types/file.d.ts'
    const result = extract_paths_from_text(text)
    expect(result).toEqual(['src/@types/file.d.ts'])
  })

  it('should handle paths in complex text', () => {
    const text = `Here are some files:
      - 'src/app.ts'
      - "src/components/header.jsx"
      - \`src/styles/main.css\`
      And some text in between.
      file.py
    `
    const result = extract_paths_from_text(text)
    expect(result).toEqual([
      'src/app.ts',
      'src/components/header.jsx',
      'src/styles/main.css',
      'file.py'
    ])
  })
})
