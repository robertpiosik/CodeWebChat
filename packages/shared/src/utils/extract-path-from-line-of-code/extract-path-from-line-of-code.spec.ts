import { extract_path_from_line_of_code } from './extract-path-from-line-of-code'

describe('extract_path_from_line_of_code', () => {
  it('should extract filename from // comment', () => {
    expect(extract_path_from_line_of_code('// path/to/file.ts')).toBe(
      'path/to/file.ts'
    )
  })

  it('should extract filename from // comment with back slashes', () => {
    expect(extract_path_from_line_of_code('// path\\to\\file.ts')).toBe(
      'path/to/file.ts'
    )
  })

  it('should extract filename with special characters in path components', () => {
    expect(extract_path_from_line_of_code('// [path]/(to)/file.ts')).toBe(
      '[path]/(to)/file.ts'
    )
  })

  it('should extract only the path when extra text precedes', () => {
    expect(
      extract_path_from_line_of_code('// lorem ipsum path/to/file.ts')
    ).toBe('path/to/file.ts')
  })

  it('should extract only the path when extra text follows', () => {
    expect(
      extract_path_from_line_of_code('// path/to/file.ts lorem ipsum')
    ).toBe('path/to/file.ts')
  })

  it('should extract filename from // comment starting with dot', () => {
    expect(extract_path_from_line_of_code('// .gitignore')).toBe('.gitignore')
  })

  it('should extract filename from # comment', () => {
    expect(extract_path_from_line_of_code('# path/to/script.py')).toBe(
      'path/to/script.py'
    )
  })

  it('should extract filename from -- comment', () => {
    expect(extract_path_from_line_of_code('-- path/to/query.sql')).toBe(
      'path/to/query.sql'
    )
  })

  it('should extract filename from * comment line', () => {
    expect(extract_path_from_line_of_code(' * path/to/component.jsx')).toBe(
      'path/to/component.jsx'
    )
  })

  it('should extract filename from /* comment line', () => {
    expect(extract_path_from_line_of_code('/* path/to/styles.css')).toBe(
      'path/to/styles.css'
    )
  })

  it('should extract filename from <!-- comment line', () => {
    expect(extract_path_from_line_of_code('<!-- path/to/template.html')).toBe(
      'path/to/template.html'
    )
  })

  it('should handle leading/trailing spaces', () => {
    expect(extract_path_from_line_of_code('  //   spaced/path/file.go  ')).toBe(
      'spaced/path/file.go'
    )
  })

  it('should extract filename without directory', () => {
    expect(extract_path_from_line_of_code('// simple_file.txt')).toBe(
      'simple_file.txt'
    )
  })

  it('should extract filename with ./ prefix', () => {
    expect(extract_path_from_line_of_code('# ./relative/path.yaml')).toBe(
      './relative/path.yaml'
    )
  })

  it('should extract filename with ../ prefix', () => {
    expect(extract_path_from_line_of_code('// ../parent/dir/file.json')).toBe(
      '../parent/dir/file.json'
    )
  })

  it('should extract only the path when extra text follows', () => {
    expect(
      extract_path_from_line_of_code('// src/main.go and some other text')
    ).toBe('src/main.go')
  })

  it('should extract path containing hyphens and dots', () => {
    expect(
      extract_path_from_line_of_code('// src/my-component.v1.test.js')
    ).toBe('src/my-component.v1.test.js')
  })

  it('should return null if no valid path is found', () => {
    expect(extract_path_from_line_of_code('// This is just a comment')).toBe(
      null
    )
  })

  it('should return null if no extension is present', () => {
    expect(
      extract_path_from_line_of_code('// path/to/file_without_extension')
    ).toBe(null)
  })

  it('should return null for empty comment', () => {
    expect(extract_path_from_line_of_code('//')).toBe(null)
    expect(extract_path_from_line_of_code('# ')).toBe(null)
  })

  it('should return null for whitespace only comment', () => {
    expect(extract_path_from_line_of_code('//    ')).toBe(null)
  })

  it('should return null for non-comment line starting with path', () => {
    // The function expects the line to start with a comment marker to strip
    expect(extract_path_from_line_of_code('path/to/file.ts')).toBe(null)
  })

  it('should return null for empty string', () => {
    expect(extract_path_from_line_of_code('')).toBe(null)
  })

  it('should return null for just whitespace string', () => {
    expect(extract_path_from_line_of_code('   ')).toBe(null)
  })

  it('should extract path from XML-style file tag', () => {
    expect(
      extract_path_from_line_of_code('<file path="path/to/file.ts">')
    ).toBe('path/to/file.ts')
  })

  it('should extract path from XML-style file tag with single quotes', () => {
    expect(
      extract_path_from_line_of_code("<file path='path/to/file.ts'>")
    ).toBe('path/to/file.ts')
  })

  it('should extract path from XML-style file tag with attributes after path', () => {
    expect(
      extract_path_from_line_of_code('<file path="path/to/file.ts" active>')
    ).toBe('path/to/file.ts')
  })
})
