import { translations as generate_commit_message_command } from './generate-commit-message-command'
import { translations as code_at_cursor_command } from './code-at-cursor-command'
import { translations as apply_response_command } from './apply-response-command'
import { translations as restore_file_selection_command } from './restore-file-selection-command'
import { translations as save_file_selection_command } from './save-file-selection-command'
import { translations as select_workspace_file_command } from './select-workspace-file-command'
import { translations as select_definition_file_command } from './select-definition-file-command'
import { translations as select_referencing_files_command } from './select-referencing-files-command'
import { translations as search_files_command } from './search-files-command'
import { translations as set_ranges_command } from './set-ranges-command'
import { translations as new_file_command } from './new-file-command'
import { translations as new_folder_command } from './new-folder-command'
import { translations as rename_command } from './rename-command'
import { translations as rate_extension_command } from './rate-extension-command'
import { translations as install_browser_extension_command } from './install-browser-extension-command'
import { translations as select_modified_files_command } from './select-modified-files-command'
import { translations as select_files_of_commit_command } from './select-files-of-commit-command'
import { translations as history_command } from './history-command'
import { translations as select_clipboard_paths_command } from './select-clipboard-paths-command'
import { translations as select_imported_files_command } from './select-imported-files-command'
import { translations as copy_paths_command } from './copy-paths-command'
import { translations as copy_markdown_command } from './copy-markdown-command'
import { translations as copy_merge_commit_details_command } from './copy-merge-commit-details-command'
import { translations as reference_in_prompt_command } from './reference-in-prompt-command'

export const translations = {
  ...generate_commit_message_command,
  ...code_at_cursor_command,
  ...apply_response_command,
  ...restore_file_selection_command,
  ...save_file_selection_command,
  ...select_workspace_file_command,
  ...select_definition_file_command,
  ...select_referencing_files_command,
  ...search_files_command,
  ...set_ranges_command,
  ...new_file_command,
  ...new_folder_command,
  ...rename_command,
  ...rate_extension_command,
  ...install_browser_extension_command,
  ...select_modified_files_command,
  ...select_files_of_commit_command,
  ...history_command,
  ...select_clipboard_paths_command,
  ...select_imported_files_command,
  ...copy_paths_command,
  ...copy_markdown_command,
  ...copy_merge_commit_details_command,
  ...reference_in_prompt_command
}
