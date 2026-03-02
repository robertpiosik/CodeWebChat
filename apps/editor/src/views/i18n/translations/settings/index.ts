import { sidebar } from './sidebar'
import { actions } from './actions'
import { general } from './general'
import { model_providers } from './model-providers'
import { edit_context } from './edit-context'
import { intelligent_update } from './intelligent-update'
import { prune_context } from './prune-context'
import { code_at_cursor } from './code-at-cursor'
import { voice_input } from './voice-input'
import { commit_messages } from './commit-messages'

export const settings = {
  ...sidebar,
  ...actions,
  ...general,
  ...model_providers,
  ...edit_context,
  ...intelligent_update,
  ...prune_context,
  ...code_at_cursor,
  ...voice_input,
  ...commit_messages
}
