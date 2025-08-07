import { extract_file_paths_from_instruction } from './extract-file-paths-from-instruction'

describe('extract_file_paths_from_instruction', () => {
  it('should extract path from @File: keyword', () => {
    expect(extract_file_paths_from_instruction('@File:path/to/file.ts')).toEqual(
      ['path/to/file.ts']
    )
  })

  it('should extract path from backtick', () => {
    expect(extract_file_paths_from_instruction('`path/to/file.ts`')).toEqual(
      ['path/to/file.ts']
    )
  })
})