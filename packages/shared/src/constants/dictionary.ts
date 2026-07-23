export const dictionary = {
  api_call: {
    WAITING_FOR_RESPONSE: 'Waiting for response...',
    THINKING: 'Thinking...'
  },

  information_message: {
    TASK_DELETED: 'Task deleted.',
    ALL_CHECKED_FILES_UNCAHNGED_SINCE_COMMIT: (
      folder_name: string,
      commit_hash: string
    ) =>
      `All checked files in "${folder_name}" are unchanged since commit ${commit_hash}.`,
    NO_INTELLIGENT_UPDATE_CONFIGURATIONS_FOUND:
      'No "Intelligent Update" configurations found. Please add one in settings.',
    NO_ACTIVE_EDITOR_FOUND: 'No active editor found.',
    CLIPBOARD_IS_EMPTY: 'Clipboard is empty.',
    COPIED_TO_CLIPBOARD: 'Message copied to the clipboard.',
    NO_SAVED_CONTEXTS_IN_WORKSPACE_STATE:
      'No saved contexts remaining in the Workspace State.',
    COMMIT_SEEMS_EMPTY: (commit_hash: string) =>
      `Commit ${commit_hash} seems empty.`,
    NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND:
      'No "Code at Cursor" configurations found. Please add one in settings.',
    NO_FIND_RELEVANT_FILES_CONFIGURATIONS_FOUND:
      'No "Find Relevant Files" configurations found. Please add one in settings.',
    NO_RECENT_CHANGES_TO_UNDO:
      'No recent changes found to undo or changes were already undone.',
    CONTEXT_COPIED_TO_CLIPBOARD: 'Context copied to clipboard.',
    CONTEXT_FROM_OPEN_EDITORS_COPIED_TO_CLIPBOARD:
      'Context from open editors copied to clipboard.',
    CONTEXT_ALREADY_SET: 'Context already set.',
    CONTEXT_UPDATED_SUCCESSFULLY: 'Updated successfully.',
    NO_SAVED_CONTEXTS_FOUND: 'No saved contexts found.',
    NO_COMMIT_MESSAGES_CONFIGURATIONS_FOUND:
      'No "Commit Messages" configurations found. Please add one in settings.',
    NO_CHANGES_TO_COMMIT: 'No changes to commit.',
    MODELS_ROUTE_NOT_FOUND: (provider_name: string) =>
      `The '/models' route was not found for ${provider_name}. This might mean the provider does not support listing models.`,
    MODELS_ROUTE_NOT_FOUND_MANUAL_ENTRY: (provider_name: string) =>
      `The '/models' route was not found for ${provider_name}. This might mean the provider does not support listing models. You can enter model name manually.`,
    NAMED_TEMPLATE_DELETED: (template_name: string) =>
      `Template "${template_name}" has been deleted.`,
    NO_CHANGES_FOUND_BETWEEN_BRANCHES: (branch_name: string) =>
      `No changes found between current branch and ${branch_name}.`,
    NO_CHANGES_FOUND_BETWEEN_BRANCHES_IN_FOLDER: (
      branch_name: string,
      folder_name: string
    ) =>
      `No changes found between current branch and ${branch_name} in ${folder_name}.`,
    NO_CHECKED_FILES_IN_REPO_FOR_COMMIT: (
      folder_name: string,
      commit_hash: string
    ) =>
      `No checked files in the "${folder_name}" repository for commit ${commit_hash}.`,
    NO_EDIT_FILES_CONFIGURATIONS_FOUND:
      'No "Edit Files" configurations found. Please add one in settings.',
    NO_TEXT_SELECTED_FOR_SELECTION_PLACEHOLDER:
      'No text selected for #Selection placeholder.',
    RESTORED_CONTEXT: (context_name: string) =>
      `Restored context "${context_name}".`,
    NO_GIT_REPOSITORY_FOUND_IN_WORKSPACE:
      'No Git repository found in the workspace.',
    NO_UNSTAGED_FILES_FOUND: 'No unstaged files found.',
    NO_ACTIONABLE_UNSTAGED_FILES_FOUND:
      'No actionable unstaged files found (e.g. only deletions).',
    ADDED_FILES_TO_CONTEXT: (count: number) =>
      `Added ${count} file${count == 1 ? '' : 's'} to context.`,
    SELECTED_FILES: (count: number) =>
      `Selected ${count} file${count == 1 ? '' : 's'}.`,
    DELETED_CONTEXT_FROM_WORKSPACE_STATE: 'Deleted context.',
    CONTEXT_SAVED_SUCCESSFULLY: 'Saved successfully.',
    FILES_REMAIN_CHECKED: (count: number) =>
      `${count} file${count == 1 ? '' : 's'} remain${
        count == 1 ? 's' : ''
      } checked.`,
    CRUNCHING_TOKEN_COUNTS: 'Please wait, crunching token counts...',
    TEMPLATE_RESTORED: 'Template has been restored.',
    UNNAMED_TEMPLATE_DELETED: 'Unnamed template has been deleted.'
  },

  warning_message: {
    PLEASE_CONFIRM: 'Please confirm',
    CODE_AT_CURSOR_NO_SELECTION:
      'Code completions are not supported with active text selection.',
    CANNOT_REFERENCE_FILE_OUTSIDE_WORKSPACE:
      'Cannot reference file outside of the workspace.',
    NOTHING_IN_CONTEXT_TO_SAVE: 'There is nothing in your context to save.',
    NO_OPEN_EDITORS_SELECTED: 'No open editors selected.',
    NO_EDITOR_OPEN: 'No editor is open.',
    CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION:
      'Cannot copy prompt in code at cursor mode with an active selection.',
    CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITHOUT_EDITOR:
      'Cannot copy prompt in code at cursor mode without an active editor.',
    CANNOT_PREVIEW_IN_CODE_COMPLETION_WITHOUT_EDITOR:
      'Cannot preview in code at cursor mode without an active editor.',
    BROWSER_EXTENSION_NOT_CONNECTED:
      'Browser extension is not connected. Please install or reload it.',
    URL_OVERRIDE_DIFFERENT_DOMAIN: (preset_name: string) =>
      `URL override for preset "${preset_name}" was discarded because it uses a different domain.`,
    COULD_NOT_DELETE_FILE: (file_path: string) =>
      `Could not delete file: ${file_path}.`,
    COULD_NOT_RECREATE_FILE: (file_path: string) =>
      `Could not recreate file: ${file_path}.`,
    COULD_NOT_UNDO_FILE_MAYBE_CLOSED: (file_path: string) =>
      `Could not undo file: ${file_path}. It might have been closed or deleted.`,
    CONFIRM_CLEAR_API_KEY: (provider_name: string) =>
      `Are you sure you want to clear the API key for ${provider_name}? This action cannot be undone.`,
    CONFIRM_DELETE_ITEM: (
      item_type: 'file' | 'folder' | 'group' | 'configuration'
    ) => `Are you sure you want to delete this ${item_type}?`,
    CONFIRM_DELETE_NAMED_ITEM: (item_type: string, name: string) =>
      `Are you sure you want to delete ${item_type} "${name}"?`,
    CONFIRM_DELETE_CONFIGURATION: (model: string, provider: string) =>
      `Are you sure you want to delete the configuration for model "${model}" provided by ${provider}?`,
    CONFIRM_DELETE_MODEL_PROVIDER: (provider_name: string) =>
      `Are you sure you want to delete the model provider "${provider_name}"?`,
    NO_MODELS_FOUND_MANUAL_ENTRY: (provider_name: string) =>
      `No models found for ${provider_name}. You can enter model name manually.`,
    REASONING_EFFORT_NOT_SUPPORTED:
      'The selected reasoning effort is not supported by the model.'
  },

  error_message: {
    API_PROVIDER_FOR_CONFIG_NOT_FOUND:
      'API provider for the selected API tool configuration was not found.',
    FILE_NOT_FOUND: (file_path: string) => `File not found: ${file_path}.`,
    INVALID_POSITION_FOR_CODE_COMPLETION: (file_path: string) =>
      `Invalid position for code completion in ${file_path}.`,
    UNSAFE_FILE_PATHS_SKIPPED: (count: number, list: string) =>
      `Detected ${count} unsafe file path(s) that may attempt directory traversal:\n${list}\n\nThese files will be skipped.`,
    FAILED_TO_CREATE_DIRECTORY: (dir_path: string) =>
      `Failed to create directory: ${dir_path}.`,
    FAILED_TO_WRITE_FILE: (file_path: string) =>
      `Failed to write file: ${file_path}.`,
    ERROR_PROCESSING_FILE: (file_path: string, message: string) =>
      `Error processing file ${file_path}: ${message}.`,
    ERROR_REPLACING_FILES: (message: string) =>
      `An error occurred while replacing files: ${message}.`,
    ERROR_APPLYING_CHANGES: (message: string) =>
      `An error occurred while applying changes (${message}).`,
    INVALID_FILE_PATH_TRAVERSAL: (file_path: string) =>
      `Invalid file path: ${file_path}. Path may contain traversal attempts.`,
    FAILED_TO_UNDO_CHANGES: (message: string) =>
      `Failed to undo changes: ${message}.`,
    ERROR_SELECTING_SAVED_CONTEXT: (message: string) =>
      `Error selecting saved context: ${message}.`,
    FAILED_TO_SELECT_UNSTAGED_FILES: (message: string) =>
      `Failed to select unstaged files: ${message}.`,
    FAILED_TO_DELETE: (message: string) => `Failed to delete: ${message}.`,
    COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FILE:
      'Could not determine location to create file.',
    INVALID_FILE_NAME: (name: string) => `Invalid file name: '${name}'.`,
    FILE_ALREADY_EXISTS: (name: string) => `File '${name}' already exists.`,
    FAILED_TO_CREATE_FILE: (message: string) =>
      `Failed to create file: ${message}.`,
    COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FOLDER:
      'Could not determine location to create folder.',
    INVALID_FOLDER_NAME: (name: string) => `Invalid folder name: '${name}'.`,
    FOLDER_ALREADY_EXISTS: (name: string) => `Folder '${name}' already exists.`,
    FAILED_TO_CREATE_FOLDER: (message: string) =>
      `Failed to create folder: ${message}.`,
    FAILED_TO_OPEN_URL: 'Failed to open url in a web browser.',
    INVALID_NAME: (name: string) => `Invalid name: '${name}'.`,
    FILE_OR_FOLDER_ALREADY_EXISTS: (name: string) =>
      `A file or folder named '${name}' already exists.`,
    FAILED_TO_RENAME: (message: string) => `Failed to rename: ${message}.`,
    ERROR_COLLECTING_FILES: (message: string) =>
      `Error collecting files: ${message}.`,
    ERROR_READING_FILE: (file_path: string, message: string) =>
      `Error reading file ${file_path}: ${message}.`,
    FAILED_TO_INITIALIZE_WEBSOCKET_SERVER: (error: any) =>
      `Failed to initialize WebSocket server: ${error}.`,
    NO_WORKSPACE_FOLDERS_FOUND: 'No workspace folders found.',
    FAILED_TO_GET_GIT_BRANCHES:
      'Failed to get Git branches. Make sure you are in a Git repository.',
    GIT_EXTENSION_NOT_FOUND: 'Git extension not found.',
    NO_GIT_REPOSITORY_FOUND: 'No Git repository found.',
    RESPONSE_TEXT_MISSING: 'Response text to apply is missing.',
    API_RATE_LIMIT_EXCEEDED: 'API request failed. Rate limit exceeded.',
    API_PAYLOAD_TOO_LARGE: 'API request failed. The context is too large.',
    API_BAD_REQUEST: 'API request failed. Bad request.',
    API_INVALID_KEY: 'API request failed. Invalid API key.',
    API_REQUEST_FAILED: 'API request failed. Check console for details.',
    FAILED_TO_DELETE_ITEM: (item_type: string, error: any) =>
      `Failed to delete ${item_type}: ${error}.`,
    WORKSPACE_NOT_FOUND_FOR_FILE: (file_path: string) =>
      `Workspace not found for file: ${file_path}.`,
    WORKSPACE_FOLDER_NOT_FOUND: (folder_name: string) =>
      `Workspace folder "${folder_name}" not found.`,
    COULD_NOT_OPEN_FILE: (file_path: string) =>
      `Could not open file: ${file_path}.`,
    COULD_NOT_GET_GIT_API: 'Could not get Git API.',
    INTELLIGENT_UPDATE_CONTEXT_NOT_FOUND:
      'Could not find the context for intelligent update. Please apply the changes again.',
    ORIGINAL_STATE_FOR_FILE_NOT_FOUND: (file_name: string) =>
      `Could not find original state for file: ${file_name}.`,
    UPDATE_INSTRUCTIONS_FOR_FILE_NOT_FOUND: (file_name: string) =>
      `Could not find update instructions for file: ${file_name}.`,
    FAILED_TO_FETCH_OPEN_ROUTER_MODELS:
      'Failed to fetch Open Router models. Please check your connection.',
    FAILED_TO_GET_CHANGES_FROM_BRANCH: (branch_name: string) =>
      `Failed to get changes from branch ${branch_name}. Make sure the branch exists.`,
    FAILED_TO_GET_CHANGES_FROM_BRANCH_IN_FOLDER: (
      branch_name: string,
      folder_name: string
    ) =>
      `Failed to get changes from branch ${branch_name} in ${folder_name}. Make sure the branch exists.`,
    FAILED_TO_GET_DIFF_FOR_COMMIT: (commit_hash: string) =>
      `Failed to get diff for commit ${commit_hash}.`,
    COULD_NOT_UPDATE_ITEM_NOT_FOUND: (item_type: string, name: string) =>
      `Could not update ${item_type}: Original ${item_type} "${name}" not found.`,
    ERROR_HANDLING_MESSAGE: (message: string) =>
      `Error handling message: ${message}.`,
    FAILED_TO_FETCH_MODELS: (message: string) =>
      `Failed to fetch models: ${message}.`,
    BASE_URL_NOT_FOUND_FOR_PROVIDER: (name: string) =>
      `Base URL not found for provider ${name}.`,
    MODEL_PROVIDER_NOT_FOUND_BY_NAME: (name: string) =>
      `Model provider "${name}" not found.`,
    API_PROVIDER_NOT_FOUND:
      'API provider for the selected API tool configuration was not found.',
    NO_WORKSPACE_FOLDER_OPEN: 'No workspace folder open.',
    CANNOT_PROCESS_MULTIPLE_FILES_WITHOUT_WORKSPACE:
      'Cannot process multiple files without an open workspace folder.',
    NO_VALID_FILE_CONTENT_IN_CLIPBOARD:
      'No valid file content found in clipboard.',
    NO_WORKSPACE_ROOT: 'No workspace root found.',
    API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR:
      'API provider is not specified for Code at Cursor tool.',
    MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR:
      'Model is not specified for Code at Cursor tool.',
    CODE_COMPLETION_ERROR:
      'An error occurred during code at cursor operation. See console for details.',
    EDIT_FILES_ERROR:
      'An error occurred during file editing. See console for details.',
    CONFIGURATION_ALREADY_EXISTS: 'Identical configuration already exists.',
    APPLYING_CHANGES_GENERIC_ERROR: (msg: string) =>
      `An error occurred while applying changes (${msg}).`
  }
}
