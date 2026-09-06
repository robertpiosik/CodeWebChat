import { parse_response } from '../../..'
import { parse_commit_message } from '../commit-message-parser'

describe('commit-message-parser', () => {
  describe('parse_commit_message', () => {
    it('parses a valid commit message response', () => {
      const text = '**Commit message:**\nfeat: add commit message parser'
      const result = parse_commit_message(text)

      expect(result).toMatchObject({
        type: 'commit-message',
        message: 'feat: add commit message parser'
      })
    })

    it('returns null if response does not start with the prefix', () => {
      const text =
        'Some text before\n**Commit message:**\nfeat: add commit message parser'
      const result = parse_commit_message(text)

      expect(result).toBeNull()
    })

    it('trims whitespace around the message', () => {
      const text = '   **Commit message:**   \n\n  fix: whitespace issues  \n\n'
      const result = parse_commit_message(text)

      expect(result).toMatchObject({
        type: 'commit-message',
        message: 'fix: whitespace issues'
      })
    })
  })

  describe('parse_response integration', () => {
    it('returns a commit message item when parsing a valid commit message response', () => {
      const text = '**Commit message:**\nchore: update dependencies'
      const result = parse_response({
        response: text,
        is_single_root_folder_workspace: true
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'commit-message',
        message: 'chore: update dependencies'
      })
    })
  })
})