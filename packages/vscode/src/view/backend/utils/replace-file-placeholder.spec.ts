import { replace_file_placeholder } from './replace-file-placeholder'

describe('replace_file_placeholder', () => {
  it('should replace @File: keyword with backtick', () => {
    expect(replace_file_placeholder('@File:path/to/file.ts')).toEqual(
      '`path/to/file.ts`'
    )
  })
})
