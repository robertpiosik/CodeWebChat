import {
  extract_extension_variations,
  should_ignore_file
} from './should-ignore-file'

describe('extract_extension_variations', () => {
  it('should return an empty array for a file with no extension', () => {
    expect(extract_extension_variations('file')).toEqual([])
  })

  it('should return an empty array for an empty path', () => {
    expect(extract_extension_variations('')).toEqual([])
  })

  it('should extract a single extension', () => {
    expect(extract_extension_variations('file.ts')).toEqual(['ts'])
  })

  it('should extract multiple extensions in order', () => {
    expect(extract_extension_variations('file.d.ts')).toEqual(['ts', 'd.ts'])
    expect(extract_extension_variations('archive.tar.gz')).toEqual([
      'gz',
      'tar.gz'
    ])
    expect(extract_extension_variations('file.scss.d.ts')).toEqual([
      'ts',
      'd.ts',
      'scss.d.ts'
    ])
  })

  it('should handle file paths with directories', () => {
    expect(extract_extension_variations('path/to/file.d.ts')).toEqual([
      'ts',
      'd.ts'
    ])
    expect(extract_extension_variations('path\\to\\file.d.ts')).toEqual([
      'ts',
      'd.ts'
    ])
  })

  it('should handle hidden files with extensions', () => {
    expect(extract_extension_variations('.env.local')).toEqual([
      'local',
      'env.local'
    ])
  })

  it('should handle hidden files with a single extension-like part', () => {
    expect(extract_extension_variations('.gitignore')).toEqual(['gitignore'])
  })

  it('should handle filename that is just an extension', () => {
    expect(extract_extension_variations('.ts')).toEqual(['ts'])
  })
})

describe('should_ignore_file', () => {
  it('should return true if a simple extension is in the ignored set', () => {
    const ignored = new Set(['log', 'tmp'])
    expect(should_ignore_file('file.log', ignored)).toBe(true)
  })

  it('should return false if the extension is not in the ignored set', () => {
    const ignored = new Set(['log', 'tmp'])
    expect(should_ignore_file('file.txt', ignored)).toBe(false)
  })

  it('should return true if a compound extension is in the ignored set', () => {
    const ignored = new Set(['tar.gz'])
    expect(should_ignore_file('archive.tar.gz', ignored)).toBe(true)
  })

  it('should return true if a partial compound extension is in the ignored set', () => {
    const ignored = new Set(['gz'])
    expect(should_ignore_file('archive.tar.gz', ignored)).toBe(true)
  })

  it('should return true for complex extensions like .d.ts', () => {
    const ignored = new Set(['d.ts'])
    expect(should_ignore_file('types.d.ts', ignored)).toBe(true)
  })

  it('should return true if the shortest extension part is ignored', () => {
    const ignored = new Set(['ts'])
    expect(should_ignore_file('types.d.ts', ignored)).toBe(true)
  })

  it('should return false for files with no extension', () => {
    const ignored = new Set(['log', 'tmp'])
    expect(should_ignore_file('Makefile', ignored)).toBe(false)
  })

  it('should return false for an empty ignore set', () => {
    const ignored = new Set<string>()
    expect(should_ignore_file('file.log', ignored)).toBe(false)
  })

  it('should handle file paths with directories', () => {
    const ignored = new Set(['map'])
    expect(should_ignore_file('dist/js/app.js.map', ignored)).toBe(true)
  })

  it('should handle hidden files', () => {
    const ignored = new Set(['local'])
    expect(should_ignore_file('.env.local', ignored)).toBe(true)
  })

  it('should handle hidden files with compound extension match', () => {
    const ignored = new Set(['env.local'])
    expect(should_ignore_file('.env.local', ignored)).toBe(true)
  })
})
