import { translations as generate_commit_message } from './generate-commit-message'
import { translations as code_at_cursor } from './code-at-cursor'
import { translations as apply_response } from './apply-response'
import { translations as restore_file_selection } from './restore-file-selection'
import { translations as save_file_selection } from './save-file-selection'
import { translations as select_workspace_file } from './select-workspace-file'
import { translations as select_definition_file } from './select-definition-file'
import { translations as select_referencing_files } from './select-referencing-files'
import { translations as search_files } from './search-files'
import { translations as set_ranges } from './set-ranges'
import { translations as new_file } from './new-file'
import { translations as new_folder } from './new-folder'
import { translations as rename } from './rename'
import { translations as rate_extension } from './rate-extension'
import { translations as select_unstaged_files } from './select-unstaged-files'
import { translations as select_files_of_commit } from './select-files-of-commit'
import { translations as history } from './history'
import { translations as select_clipboard_paths } from './select-clipboard-paths'
import { translations as select_imported_files } from './select-imported-files'
import { translations as copy_paths } from './copy-paths'
import { translations as copy_markdown } from './copy-markdown'
import { translations as copy_merge_commit_details } from './copy-merge-commit-details'

export const translations = {
  ...generate_commit_message,
  ...code_at_cursor,
  ...apply_response,
  ...restore_file_selection,
  ...save_file_selection,
  ...select_workspace_file,
  ...select_definition_file,
  ...select_referencing_files,
  ...search_files,
  ...set_ranges,
  ...new_file,
  ...new_folder,
  ...rename,
  ...rate_extension,
  ...select_unstaged_files,
  ...select_files_of_commit,
  ...history,
  ...select_clipboard_paths,
  ...select_imported_files,
  ...copy_paths,
  ...copy_markdown,
  ...copy_merge_commit_details
}
