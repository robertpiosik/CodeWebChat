import { generate_commit_message } from './generate-commit-message'
import { code_at_cursor } from './code-at-cursor'
import { apply_chat_response } from './apply-chat-response'
import { context_restoration } from './context-restoration'
import { add_file_to_context } from './add-file-to-context'
import { select_definition_file } from './select-definition-file'
import { select_referencing_files } from './select-referencing-files'
import { remove_file_from_context } from './remove-file-from-context'
import { search_files } from './search-files'
import { set_ranges } from './set-ranges'
import { new_file } from './new-file'
import { new_folder } from './new-folder'
import { rename } from './rename'
import { rate } from './rate'

export const commands = {
  ...generate_commit_message,
  ...code_at_cursor,
  ...apply_chat_response,
  ...context_restoration,
  ...add_file_to_context,
  ...select_definition_file,
  ...select_referencing_files,
  ...remove_file_from_context,
  ...search_files,
  ...set_ranges,
  ...new_file,
  ...new_folder,
  ...rename,
  ...rate
}
