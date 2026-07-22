import { translations as generate_commit_message } from './generate-commit-message'
import { translations as code_at_cursor } from './code-at-cursor'
import { translations as apply_response } from './apply-response'
import { translations as context_restoration } from './context-restoration'
import { translations as select_workspace_file } from './select-workspace-file'
import { translations as select_definition_file } from './select-definition-file'
import { translations as select_referencing_files } from './select-referencing-files'
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
import { translations as select_clipboard_paths } from './select-clipboard-paths'
import { translations as select_imported_files } from './select-imported-files'

export const translations = {
  ...generate_commit_message,
  ...code_at_cursor,
  ...apply_response,
  ...context_restoration,
  ...select_workspace_file,
  ...select_definition_file,
  ...select_referencing_files,
  ...search_files,
  ...set_ranges,
  ...new_file,
  ...new_folder,
  ...rename,
  ...rate,
  ...select_unstaged_files,
  ...select_commit_files,
  ...select_changed_files,
  ...history,
  ...select_clipboard_paths,
  ...select_imported_files
}
