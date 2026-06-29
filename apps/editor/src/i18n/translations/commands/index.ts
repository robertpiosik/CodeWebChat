import { generate_commit_message } from './generate-commit-message'
import { code_at_cursor } from './code-at-cursor'
import { apply_chat_response } from './apply-chat-response'
import { context_selection } from './context-selection'
import { add_file_to_context } from './add-file-to-context'
import { check_definition_file_for_context } from './check-definition-file-for-context'
import { check_referencing_files_for_context } from './check-referencing-files-for-context'
import { remove_file_from_context } from './remove-file-from-context'
import { search_files_for_context } from './search-files-for-context'
import { set_ranges } from './set-ranges'
import { new_file } from './new-file'
import { new_folder } from './new-folder'
import { rename } from './rename'
import { rate } from './rate'
import { find_relevant_files } from './find-relevant-files'

export const commands = {
  ...generate_commit_message,
  ...code_at_cursor,
  ...apply_chat_response,
  ...context_selection,
  ...add_file_to_context,
  ...check_definition_file_for_context,
  ...check_referencing_files_for_context,
  ...remove_file_from_context,
  ...search_files_for_context,
  ...set_ranges,
  ...new_file,
  ...new_folder,
  ...rename,
  ...rate,
  ...find_relevant_files
}
