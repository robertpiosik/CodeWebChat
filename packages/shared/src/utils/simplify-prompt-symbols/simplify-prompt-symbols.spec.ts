import { simplify_prompt_symbols } from './simplify-prompt-symbols'

describe('simplify_prompt_symbols', () => {
  it('should return plain text as is', () => {
    const prompt = 'This is a plain text prompt.'
    expect(simplify_prompt_symbols({ prompt })).toBe(
      'This is a plain text prompt.'
    )
  })

  it('should replace #Fragment', () => {
    const prompt = 'Fix this code: #Fragment(test.ts:1:1-2:2) please'
    expect(simplify_prompt_symbols({ prompt })).toBe(
      'Fix this code: [Fragment] please'
    )
  })

  it('should replace #Selection', () => {
    const prompt = 'What about #Selection?'
    expect(simplify_prompt_symbols({ prompt })).toBe('What about [Selection]?')
  })

  it('should replace #Changes', () => {
    const prompt = 'Review #Changes(main)'
    expect(simplify_prompt_symbols({ prompt })).toBe('Review [Changes]')
  })

  it('should replace #SavedContext', () => {
    const prompt = 'Use #SavedContext(JSON "My Context")'
    expect(simplify_prompt_symbols({ prompt })).toBe('Use [Saved context]')
  })

  it('should replace #Commit', () => {
    const prompt = 'Check #Commit(repo:hash "message")'
    expect(simplify_prompt_symbols({ prompt })).toBe('Check [Commit]')
  })

  it('should replace #Skill', () => {
    const prompt = 'Run #Skill(agent:repo:skill)'
    expect(simplify_prompt_symbols({ prompt })).toBe('Run [Skill]')
  })

  it('should replace #Image', () => {
    const prompt = 'Look at #Image(1234567890abcdef)'
    expect(simplify_prompt_symbols({ prompt })).toBe('Look at [Image]')
  })

  it('should replace #PastedText', () => {
    const prompt = 'Analyze #PastedText(abcdef:123)'
    expect(simplify_prompt_symbols({ prompt })).toBe('Analyze [Pasted text]')
  })

  it('should replace #Website', () => {
    const prompt = 'Read #Website(https://example.com)'
    expect(simplify_prompt_symbols({ prompt })).toBe('Read [Website]')
  })

  it('should handle multiple replacements', () => {
    const prompt =
      '#Selection and #Fragment(a.ts:1:1-2:2) with #Changes(dev)'
    expect(simplify_prompt_symbols({ prompt })).toBe(
      '[Selection] and [Fragment] with [Changes]'
    )
  })
})
