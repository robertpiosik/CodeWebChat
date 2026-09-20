import { translations as handle_delete_task } from './handle-delete-task'
import { translations as handle_hash_sign_quick_pick } from './handle-hash-sign-quick-pick'
import { translations as handle_make_api_call } from './handle-make-api-call'
import { translations as handle_select_edit_format_instructions } from './handle-select-edit-format-instructions'
import { translations as handle_voice_input } from './handle-voice-input'
import { translations as handle_copy_prompt } from './handle-copy-prompt'
import { translations as handle_undo } from './handle-undo'
import { translations as utils } from './utils'
import { translations as handle_template_quick_pick } from './handle-template-quick-pick'
import { translations as handle_patch_repair } from './handle-patch-repair'
import { translations as handle_agentic_search } from './handle-agentic-search'
import { translations as handle_autofill } from './handle-autofill'

export const translations = {
  ...handle_delete_task,
  ...handle_hash_sign_quick_pick,
  ...handle_make_api_call,
  ...handle_select_edit_format_instructions,
  ...handle_voice_input,
  ...handle_copy_prompt,
  ...handle_undo,
  ...utils,
  ...handle_template_quick_pick,
  ...handle_patch_repair,
  ...handle_agentic_search,
  ...handle_autofill
}
