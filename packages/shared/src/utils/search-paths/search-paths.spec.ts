import { search_paths } from './search-paths'

describe('search_paths', () => {
  const paths = [
    'src/index.ts',
    'src/routes/HomePage.tsx',
    'src/test.spec.ts',
    'src/test.ts',
    'src/utils.py'
  ]

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

  it('should find "src/test.spec.ts" with query "indexts"', () => {
    const result = search_paths({ paths, search_value: 'srcspec' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/test.spec.ts')
  })

  it('should find "src/test.ts" with query "testts"', () => {
    const result = search_paths({ paths, search_value: 'testts' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/test.ts')
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

  it('should find "src/routes/HomePage.tsx" with query "page.tsx"', () => {
    const result = search_paths({ paths, search_value: 'page.tsx' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should find "src/routes/HomePage.tsx" with query "rout."', () => {
    const result = search_paths({ paths, search_value: 'rout.' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should find "src/routes/HomePage.tsx" with query "pag."', () => {
    const result = search_paths({ paths, search_value: 'pag.' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should find "src/routes/HomePage.tsx" with query "hom."', () => {
    const result = search_paths({ paths, search_value: 'hom.' })
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('src/routes/HomePage.tsx')
  })

  it('should not find "src/routes/HomePage.tsx" with query "src-page"', () => {
    const result = search_paths({ paths, search_value: 'src-page' })
    expect(result).toHaveLength(0)
  })

  it('should not find "src/routes/HomePage.tsx" with query "pagesrc"', () => {
    const result = search_paths({ paths, search_value: 'pagesrc' })
    expect(result).toHaveLength(0)
  })

  it('should not find "src/routes/HomePage.tsx" with query "src/"', () => {
    const result = search_paths({ paths, search_value: 'src/' })
    expect(result).toHaveLength(0)
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
