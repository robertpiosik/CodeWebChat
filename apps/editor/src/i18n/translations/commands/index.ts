import { checkpoints } from './checkpoints'
import { generate_commit_message } from './generate-commit-message'
import { code_at_cursor } from './code-at-cursor'

export const commands = {
  ...checkpoints,
  ...generate_commit_message,
  ...code_at_cursor
}
