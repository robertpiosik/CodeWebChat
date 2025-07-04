export type SupportedTool =
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'
  | 'commit-messages'

export const DEFAULT_TEMPERATURE: { [key in SupportedTool]: number } = {
  'code-completions': 0.3,
  'edit-context': 0.3,
  'intelligent-update': 0,
  'commit-messages': 0.3
}
