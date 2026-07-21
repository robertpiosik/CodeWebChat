import { extract_paths_from_text } from './extract-paths-from-text'

describe('extract_paths_from_text', () => {
  it('extracts paths from a bullet list', () => {
    const text = `**Relevant files:**

* \`src/hello.ts\`
- src/welcome.ts

Lorem ipsum.`

    const result = extract_paths_from_text(text)

    expect(result).toContain('src/hello.ts')
    expect(result).toContain('src/welcome.ts')
  })

  it('extracts paths from inline text', () => {
    const text = `\`src/hello.ts\`, src/welcome.ts \`src/main.ts\`

Lorem ipsum.`

    const result = extract_paths_from_text(text)

    expect(result).toContain('src/hello.ts')
    expect(result).toContain('src/welcome.ts')
    expect(result).toContain('src/main.ts')
  })

  it('handles paths with ./ prefix', () => {
    const text = 'Please check ./src/main.ts and ./tests/main.spec.ts.'
    const result = extract_paths_from_text(text)

    expect(result).toContain('./src/main.ts')
    expect(result).toContain('src/main.ts')
    expect(result).toContain('./tests/main.spec.ts')
    expect(result).toContain('tests/main.spec.ts')
  })

  it('strips trailing punctuation', () => {
    const text = 'Look at src/utils.ts, src/types.ts! Also see src/index.ts.'
    const result = extract_paths_from_text(text)

    expect(result).toContain('src/utils.ts')
    expect(result).toContain('src/types.ts')
    expect(result).toContain('src/index.ts')
  })
})
