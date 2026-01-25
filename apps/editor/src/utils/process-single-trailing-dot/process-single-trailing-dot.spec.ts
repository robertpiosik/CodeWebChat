import { process_single_trailing_dot } from './process-single-trailing-dot'

describe('process_single_trailing_dot', () => {
  it('should remove trailing dot if it is only one dot in the string', () => {
    expect(process_single_trailing_dot('Fix bug.')).toBe('Fix bug')
    expect(process_single_trailing_dot('Fix bug. ')).toBe('Fix bug')
    expect(process_single_trailing_dot('Fix bug. Fix bug.')).toBe(
      'Fix bug. Fix bug.'
    )
    expect(process_single_trailing_dot('Fix bug. Fix bug. ')).toBe(
      'Fix bug. Fix bug.'
    )
    expect(process_single_trailing_dot('Fix bug 1.2.3.')).toBe('Fix bug 1.2.3')
    expect(process_single_trailing_dot('Fix bug 1.2.3. ')).toBe('Fix bug 1.2.3')
  })
})
