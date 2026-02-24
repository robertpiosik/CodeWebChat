import { checkpoints } from './checkpoints'
import { generate_commit_message } from './generate-commit-message'

export const commands = {
  ...checkpoints,
  ...generate_commit_message
}
