import { translations as delete_task } from './delete-task'
import { translations as hash_sign } from './hash-sign'
import { translations as make_api_call } from './make-api-call'
import { translations as select_edit_format } from './select-edit-format'
import { translations as voice_input } from './voice-input'
import { translations as copy_prompt } from './copy-prompt'
import { translations as handle_undo } from './handle-undo'
import { translations as utils } from './utils'
import { translations as handle_pick_api_reasoning_effort } from './handle-pick-api-reasoning-effort'

export const translations = {
  ...delete_task,
  ...hash_sign,
  ...make_api_call,
  ...select_edit_format,
  ...voice_input,
  ...copy_prompt,
  ...handle_undo,
  ...utils,
  ...handle_pick_api_reasoning_effort
}
