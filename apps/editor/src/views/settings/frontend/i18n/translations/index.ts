import { actions } from './actions'
import { code_at_cursor } from './code-at-cursor'
import { commit_messages } from './commit-messages'
import { edit_context } from './edit-context'
import { general } from './general'
import { intelligent_update } from './intelligent-update'
import { model_providers } from './model-providers'
import { find_relevant_files } from './find-relevant-files'
import { sidebar } from './sidebar'
import { voice_input } from './voice-input'

export const translations = {
  ...sidebar,
  ...actions,
  ...general,
  ...model_providers,
  ...edit_context,
  ...intelligent_update,
  ...find_relevant_files,
  ...code_at_cursor,
  ...voice_input,
  ...commit_messages
}
