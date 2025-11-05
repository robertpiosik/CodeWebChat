import { search_paths } from './search-paths'

describe('search_paths', () => {
  const paths = ['src/index.ts', 'src/routes/HomePage.tsx', 'src/utils.py']

  it('should return all paths for an empty search', () => {
    expect(search_paths({ paths, search_value: '' })).toEqual(paths)
  })

  it('should find "src/index.ts" with query "index"', () => {
    const result = search_paths({ paths, search_value: 'index' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/index.ts')
  })

  it('should find "src/index.ts" with query "indexts"', () => {
    const result = search_paths({ paths, search_value: 'indexts' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/index.ts')
  })

  it('should find "src/index.ts" with query "srcindex"', () => {
    const result = search_paths({ paths, search_value: 'srcindex' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/index.ts')
  })

  it('should find "src/routes/HomePage.tsx" with query "srcpagetsx"', () => {
    const result = search_paths({ paths, search_value: 'srcpagetsx' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should find "src/routes/HomePage.tsx" with query "srcroutepagetsx"', () => {
    const result = search_paths({ paths, search_value: 'srcroutepagetsx' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should not find "src/routes/HomePage.tsx" with query "srcagetsx"', () => {
    const result = search_paths({ paths, search_value: 'srcagetsx' })
    expect(result).toHaveLength(0)
  })

  it('should return an empty array if no match is found', () => {
    const result = search_paths({ paths, search_value: 'nomatch' })
    expect(result).toHaveLength(0)
  })

  it('should be case-insensitive', () => {
    const result = search_paths({ paths, search_value: 'INDEX.TS' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/index.ts')
  })
})
