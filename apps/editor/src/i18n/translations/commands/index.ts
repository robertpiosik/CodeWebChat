import { translations as generate_commit_message } from './generate-commit-message'
import { translations as code_at_cursor } from './code-at-cursor'
import { translations as apply_chat_response } from './apply-chat-response'
import { translations as context_restoration } from './context-restoration'
import { translations as add_file_to_context } from './add-file-to-context'
import { translations as select_definition_file } from './select-definition-file'
import { translations as select_referencing_files } from './select-referencing-files'
import { translations as remove_file_from_context } from './remove-file-from-context'
import { translations as search_files } from './search-files'
import { translations as set_ranges } from './set-ranges'
import { translations as new_file } from './new-file'
import { translations as new_folder } from './new-folder'
import { translations as rename } from './rename'
import { translations as rate } from './rate'
import { translations as select_unstaged_files } from './select-unstaged-files'
import { translations as select_commit_files } from './select-commit-files'
import { translations as select_changed_files } from './select-changed-files'
import { translations as history } from './history'

export const translations = {
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
  ...rate,
  ...select_unstaged_files,
  ...select_commit_files,
  ...select_changed_files,
  ...history
}
