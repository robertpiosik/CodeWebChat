export type CommitMessageItem = {
  type: 'commit-message'
  message: string
}

export const parse_commit_message = (
  response: string
): CommitMessageItem | null => {
  const trimmed = response.trim()
  if (trimmed.startsWith('**Commit message:**')) {
    const message = trimmed.substring('**Commit message:**'.length).trim()
    return {
      type: 'commit-message',
      message
    }
  }
  return null
}
