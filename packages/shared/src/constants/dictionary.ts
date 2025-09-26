export const dictionary = {
  api_call: {
    WAITING_FOR_API_RESPONSE: 'Waiting for API response',
    THINKING: 'Thinking'
  },

  // ChatInput.tsx
  'ChatInput.tsx': {
    type_something: 'Type something',
    completion_instructions: 'Completion instructions',
    use_last_choice: 'Use last choice',
    select: 'Select...',
    code_completions_mode_unavailable_with_text_selection:
      'Remove text selection',
    code_completions_mode_unavailable_without_active_editor:
      'Place cursor in editor',
    search: 'Search history',
    websocket_not_connected: 'Install or reload the browser extension',
    for_history_hint: '(⇅ for history)',
    copy_to_clipboard: 'Copy to clipboard',
    insert_symbol: 'Insert symbol',
    prompt_templates: 'Prompt templates',
    approximate_token_count: 'Approximate message length in tokens'
  },

  // Configurations.tsx
  'Configurations.tsx': {
    my_configurations: 'MY CONFIGURATIONS'
  },

  // Presets.tsx
  'Presets.tsx': {
    my_chat_presets: 'MY CHAT PRESETS',
    duplicate: 'Duplicate',
    edit: 'Edit',
    delete: 'Delete',
    set_as_selected: 'Set as selected',
    unset_as_selected: 'Unset as selected',
    collapse_group: 'Collapse',
    expand_group: 'Expand',
    copy_to_clipboard: 'Copy to clipboard'
  },

  information_message: {
    NO_INTELLIGENT_UPDATE_CONFIGURATIONS_FOUND:
      'No "Intelligent Update" configurations found. Please add one in the settings.',
    NO_SAFE_FILE_PATHS_REMAINING:
      'No safe file paths remaining. Operation cancelled.',
    NO_ACTIVE_EDITOR_FOUND: 'No active editor found.',
    CLIPBOARD_IS_EMPTY: 'Clipboard is empty.',
    CLIPBOARD_CONTENT_APPLIED_SUCCESSFULLY:
      'Clipboard content applied successfully.',
    NO_SAVED_CONTEXTS_IN_WORKSPACE_STATE:
      'No saved contexts remaining in the Workspace State.',
    NO_SAVED_CONTEXTS_IN_JSON_FILE:
      'No saved contexts remaining in the JSON file.',
    NO_FILE_PATHS_FOUND_IN_CLIPBOARD: 'No file paths found in the clipboard.',
    NO_MATCHING_FILES_FOUND_FOR_CLIPBOARD_PATHS:
      'No matching files found in workspace for the paths in clipboard.',
    NO_CODE_COMPLETIONS_CONFIGURATIONS_FOUND:
      'No "Code Completions" configurations found. Please add one in the settings.',
    NO_RECENT_CHANGES_TO_UNDO:
      'No recent changes found to undo or changes were already undone.',
    CONTEXT_COPIED_TO_CLIPBOARD: 'Context copied to clipboard.',
    CONTEXT_FROM_OPEN_EDITORS_COPIED_TO_CLIPBOARD:
      'Context from open editors copied to clipboard.',
    NO_SAVED_CONTEXTS_FOUND: 'No saved contexts found.',
    NO_COMMIT_MESSAGES_CONFIGURATIONS_FOUND:
      'No "Commit Messages" configurations found. Please add one in the settings.',
    NO_FILES_SELECTED_FOR_COMMIT_MESSAGE_GENERATION:
      'No files selected for commit message generation.',
    COMMIT_MESSAGE_GENERATION_CANCELLED: 'Commit message generation cancelled.',
    NO_CHANGES_TO_COMMIT: 'No changes to commit.',
    NO_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION:
      'No default "Intelligent Update" configuration found. Please set one as default in the settings.',
    NO_EDIT_CONTEXT_CONFIGURATIONS_FOUND:
      'No "Edit Context" configurations found. Please add one in the settings.'
  },

  warning_message: {
    REVIEW_ONGOING_DISCARD:
      'A review is currently ongoing. Would you like to discard it?',
    SKIPPING_INVALID_PATH: (file_path: string) =>
      `Skipping applying change to invalid path: ${file_path}`,
    NO_VALID_CODE_BLOCKS_IN_CLIPBOARD:
      'Unable to find valid code blocks in the clipboard.',
    CODE_COMPLETIONS_NO_SELECTION:
      'Code completions are not supported with active text selection.',
    CANNOT_REFERENCE_FILE_OUTSIDE_WORKSPACE:
      'Cannot reference file outside of the workspace.',
    WORKSPACE_PROVIDER_NOT_AVAILABLE_CANNOT_SAVE_CONTEXT:
      'Workspace provider is not available. Cannot save context.',
    NO_WORKSPACE_FOLDER_FOUND_CANNOT_SAVE_CONTEXT:
      'No workspace folder found. Cannot save context.',
    NOTHING_IN_CONTEXT_TO_SAVE: 'There is nothing in your context to save.',
    CONTEXTS_FILE_NOT_VALID_ARRAY:
      'Contexts file is not a valid array. Starting with empty contexts list.',
    NO_FILES_OR_WEBSITES_SELECTED: 'No files or websites selected or open.',
    NO_OPEN_EDITORS_SELECTED: 'No open editors selected.',
    NO_EDITOR_OPEN: 'No editor is open.',
    CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION:
      'Cannot copy prompt in code completion mode with an active selection.',
    CANNOT_COPY_PROMPT_IN_EDIT_CONTEXT_WITHOUT_CONTEXT:
      'Cannot copy prompt in edit context mode without any context. Please add files to the context.',
    CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITHOUT_EDITOR:
      'Cannot copy prompt in code completion mode without an active editor.',
    UNABLE_TO_WORK_WITH_EMPTY_CONTEXT: 'Unable to work with empty context.',
    INSTRUCTIONS_CANNOT_BE_EMPTY: 'Instructions cannot be empty.',
    CANNOT_PREVIEW_IN_CODE_COMPLETION_WITHOUT_EDITOR:
      'Cannot preview in code completion mode without an active editor.',
    BROWSER_EXTENSION_NOT_CONNECTED:
      'Browser extension is not connected. Please install or reload it.',
    TYPE_SOMETHING_TO_USE_PRESET: 'Type something to use this preset.',
    PRESETS_NOT_RUN_DUE_TO_MISSING_INSTRUCTIONS:
      'Some presets were not run due to missing instructions.',
    TYPE_SOMETHING_TO_USE_GROUP: 'Type something to use this group.',
    GROUP_HAS_NO_SELECTED_PRESETS:
      'The chosen group has no selected presets to run.',
    FAILED_TO_CREATE_FILE: (file_path: string) =>
      `Failed to create file: ${file_path}`,
    FAILED_TO_APPLY_CHANGES_TO_FILE: (file_path: string) =>
      `Failed to apply changes to file: ${file_path}`,
    COULD_NOT_DELETE_FILE: (file_path: string) =>
      `Could not delete file: ${file_path}.`,
    COULD_NOT_RECREATE_FILE: (file_path: string) =>
      `Could not recreate file: ${file_path}.`,
    COULD_NOT_UNDO_FILE_MAYBE_CLOSED: (file_path: string) =>
      `Could not undo file: ${file_path}. It might have been closed or deleted.`,
    NO_VALID_PATHS_IN_CONTEXT: (context_name: string) =>
      `No valid paths found in context "${context_name}".`,
    CONFIRM_DELETE_CONTEXT: (context_name: string) =>
      `Are you sure you want to delete context "${context_name}"?`,
    CONFIRM_DELETE_ITEM: (item_type: 'file' | 'folder') =>
      `Are you sure you want to delete this ${item_type}?`,
    SAVED_CONTEXT_NOT_FOUND: (name: string, source: string) =>
      `Saved context "${name}" from ${source} not found.`,
    CONFIRM_DELETE_CONFIGURATION: (model: string, provider: string) =>
      `Are you sure you want to delete the configuration for model "${model}" provided by ${provider}?`,
    CONFIRM_DELETE_MODEL_PROVIDER: (provider_name: string) =>
      `Are you sure you want to delete the model provider "${provider_name}"?`,
    NO_MODELS_FOUND_MANUAL_ENTRY: (provider_name: string) =>
      `No models found for ${provider_name}. You can enter model name manually.`,
    NO_MODEL_PROVIDERS_CONFIGURED:
      'No model providers configured. Please add a model provider first on the "Model Providers" page.'
  },

  error_message: {
    API_PROVIDER_FOR_CONFIG_NOT_FOUND:
      'API provider for the selected API tool configuration was not found.',
    FILE_NOT_FOUND: (file_path: string) => `File not found: ${file_path}`,
    INVALID_POSITION_FOR_CODE_COMPLETION: (file_path: string) =>
      `Invalid position for code completion in ${file_path}.`,
    ERROR_DURING_INTELLIGENT_UPDATE_FIX_ATTEMPT:
      'Error during fix attempt with the intelligent update tool. Would you like to undo the successfully applied patches?',
    UNSAFE_FILE_PATHS_SKIPPED: (count: number, list: string) =>
      `Detected ${count} unsafe file path(s) that may attempt directory traversal:\n${list}\n\nThese files will be skipped.`,
    FAILED_TO_CREATE_DIRECTORY: (dir_path: string) =>
      `Failed to create directory: ${dir_path}`,
    FAILED_TO_WRITE_FILE: (file_path: string) =>
      `Failed to write file: ${file_path}`,
    ERROR_PROCESSING_FILE: (file_path: string, message: string) =>
      `Error processing file ${file_path}: ${message}`,
    ERROR_REPLACING_FILES: (message: string) =>
      `An error occurred while replacing files: ${message}`,
    ERROR_DURING_PROCESSING: (message: string) =>
      `An error occurred during processing: ${message}`,
    ERROR_APPLYING_CHANGES: (message: string) =>
      `An error occurred while applying changes: ${message}`,
    INVALID_FILE_PATH_TRAVERSAL: (file_path: string) =>
      `Invalid file path: ${file_path}. Path may contain traversal attempts.`,
    FAILED_TO_UNDO_CHANGES: (message: string) =>
      `Failed to undo changes: ${message}`,
    FAILED_TO_APPLY_CLIPBOARD_CONTENT: 'Failed to apply clipboard content.',
    ERROR_READING_CONTEXTS_FILE: (message: string) =>
      `Error reading contexts file: ${message}`,
    ERROR_UPDATING_CONTEXT_NAME_IN_FILE: (message: string) =>
      `Error updating context name in file: ${message}`,
    ERROR_DELETING_CONTEXT_FROM_FILE: (message: string) =>
      `Error deleting context from file: ${message}`,
    COULD_NOT_FIND_SELECTED_CONTEXT: (label: string) =>
      `Could not find the selected context "${label}" after potential edits.`,
    ERROR_SELECTING_SAVED_CONTEXT: (message: string) =>
      `Error selecting saved context: ${message}`,
    FAILED_TO_SELECT_FILES_FROM_CLIPBOARD: (message: string) =>
      `Failed to select files from clipboard: ${message}`,
    BUILT_IN_PROVIDER_NOT_FOUND: (name: string) =>
      `Built-in provider "${name}" not found.`,
    FAILED_TO_COMMIT_CHANGES: 'Failed to commit changes.',
    ERROR_COMMITTING_CHANGES:
      'Error committing changes. See console for details.',
    FAILED_TO_DELETE: (message: string) => `Failed to delete: ${message}`,
    ERROR_GENERATING_COMMIT_MESSAGE:
      'Error generating commit message. See console for details.',
    COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FILE:
      'Could not determine location to create file',
    INVALID_FILE_NAME: (name: string) => `Invalid file name: '${name}'`,
    FILE_ALREADY_EXISTS: (name: string) => `File '${name}' already exists.`,
    FAILED_TO_CREATE_FILE: (message: string) =>
      `Failed to create file: ${message}`,
    COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FOLDER:
      'Could not determine location to create folder',
    INVALID_FOLDER_NAME: (name: string) => `Invalid folder name: '${name}'`,
    FOLDER_ALREADY_EXISTS: (name: string) => `Folder '${name}' already exists.`,
    FAILED_TO_CREATE_FOLDER: (message: string) =>
      `Failed to create folder: ${message}`,
    FAILED_TO_OPEN_URL: 'Failed to open url in a web browser.',
    INVALID_NAME: (name: string) => `Invalid name: '${name}'`,
    FILE_OR_FOLDER_ALREADY_EXISTS: (name: string) =>
      `A file or folder named '${name}' already exists.`,
    FAILED_TO_RENAME: (message: string) => `Failed to rename: ${message}`,
    ERROR_SAVING_CONTEXT_TO_FILE: (message: string) =>
      `Error saving context to file: ${message}`,
    CONTEXT_NAME_NOT_PROVIDED: 'Context name was not provided.',
    ERROR_SAVING_CONTEXT_TO_WORKSPACE_STATE: (message: string) =>
      `Error saving context to Workspace State: ${message}`,
    ERROR_COLLECTING_FILES_AND_WEBSITES: (message: string) =>
      `Error collecting files and websites: ${message}`,
    ERROR_READING_FILE: (file_path: string, message: string) =>
      `Error reading file ${file_path}: ${message}`,
    FAILED_TO_INITIALIZE_WEBSOCKET_SERVER: (error: any) =>
      `Failed to initialize WebSocket server: ${error}`,
    CWC_UPDATED_RELOAD_WINDOW:
      'CWC has been updated. To continue using it in this workspace, open the command palette and run "Reload Window".',
    NO_WORKSPACE_FOLDERS_FOUND: 'No workspace folders found',
    NO_GIT_BRANCHES_FOUND_IN_WORKSPACE:
      'No Git branches found in any workspace folder',
    FAILED_TO_GET_GIT_BRANCHES:
      'Failed to get Git branches. Make sure you are in a Git repository.',
    API_KEY_MISSING_FOR_PROVIDER:
      'API key is missing for the selected provider. Please add it in the Settings tab.',
    FAILED_TO_GENERATE_COMMIT_MESSAGE: 'Failed to generate commit message.',
    GIT_EXTENSION_NOT_FOUND: 'Git extension not found.',
    NO_GIT_REPOSITORY_FOUND: 'No Git repository found.',
    REPOSITORY_NOT_FOUND: 'Repository not found.',
    APPLYING_CHANGES_FAILED_EMPTY_RESPONSE: (file_path: string) =>
      `Applying changes to ${file_path} failed. Empty response from API.`,
    ERROR_DURING_REFACTORING: (file_path: string) =>
      `An error occurred during refactoring ${file_path}. See console for details.`,
    API_RATE_LIMIT_EXCEEDED: 'API request failed. Rate limit exceeded.',
    API_BAD_REQUEST: 'API request failed. Bad request.',
    API_ENDPOINT_UNAVAILABLE:
      'Endpoint is currently unable to handle the request. Wait a few moments and retry or use another API provider.',
    API_INVALID_KEY: 'API request failed. Invalid API key.',
    API_REQUEST_FAILED: 'API request failed. Check console for details.',
    FAILED_TO_CREATE_ITEM: (item_id: string, error: any) =>
      `Failed to create ${item_id}: ${error}`,
    FAILED_TO_DELETE_ITEM: (item_type: string, error: any) =>
      `Failed to delete ${item_type}: ${error}`,
    PRESET_NOT_FOUND: (name: string) => `Preset "${name}" not found`,
    FAILED_TO_DUPLICATE_PRESET: (error: any) =>
      `Failed to duplicate preset: ${error}`,
    WORKSPACE_NOT_FOUND_FOR_FILE: (file_path: string) =>
      `Workspace not found for file: ${file_path}`,
    COULD_NOT_OPEN_FILE: (file_path: string) =>
      `Could not open file: ${file_path}`,
    API_PROVIDER_FOR_DEFAULT_CONFIG_NOT_FOUND:
      'API provider for the default API tool configuration was not found.',
    INTELLIGENT_UPDATE_CONTEXT_NOT_FOUND:
      'Could not find the context for intelligent update. Please apply the changes again.',
    ORIGINAL_STATE_FOR_FILE_NOT_FOUND: (file_name: string) =>
      `Could not find original state for file: ${file_name}`,
    UPDATE_INSTRUCTIONS_FOR_FILE_NOT_FOUND: (file_name: string) =>
      `Could not find update instructions for file: ${file_name}`,
    INTELLIGENT_UPDATE_FAILED_FOR_FILE: (file_name: string, message: string) =>
      `Intelligent update failed for ${file_name}: ${message}`,
    FAILED_TO_FETCH_OPEN_ROUTER_MODELS:
      'Failed to fetch Open Router models. Please check your connection.',
    COULD_NOT_UPDATE_ITEM_NOT_FOUND: (item_type: string, name: string) =>
      `Could not update ${item_type}: Original ${item_type} "${name}" not found.`,
    ERROR_HANDLING_MESSAGE: (message: string) =>
      `Error handling message: ${message}`,
    ERROR_CALCULATING_TOKEN_COUNT: (message: string) =>
      `Error calculating token count: ${message}`,
    FAILED_TO_FETCH_MODELS: (message: string) =>
      `Failed to fetch models: ${message}`,
    PROVIDER_NOT_FOUND: (name: string) => `Provider ${name} not found.`,
    BASE_URL_NOT_FOUND_FOR_PROVIDER: (name: string) =>
      `Base URL not found for provider ${name}.`,
    PROVIDER_NOT_FOUND_BY_NAME: (name: string) =>
      `Provider "${name}" not found.`,
    MODEL_PROVIDER_NOT_FOUND_BY_NAME: (name: string) =>
      `Model provider "${name}" not found.`,
    API_PROVIDER_NOT_FOUND:
      'API provider for the selected API tool configuration was not found.',
    NO_RESPONSE_TEXT: 'No response text provided and clipboard is empty.',
    NO_WORKSPACE_FOLDER_OPEN: 'No workspace folder open.',
    CANNOT_PROCESS_MULTIPLE_FILES_WITHOUT_WORKSPACE:
      'Cannot process multiple files without an open workspace folder.',
    NO_VALID_FILE_CONTENT_IN_CLIPBOARD:
      'No valid file content found in clipboard.',
    NO_WORKSPACE_PROVIDER: 'No workspace provider available',
    NO_WORKSPACE_ROOT: 'No workspace root found.',
    API_PROVIDER_NOT_SPECIFIED_FOR_CODE_COMPLETIONS:
      'API provider is not specified for Code Completions tool.',
    MODEL_NOT_SPECIFIED_FOR_CODE_COMPLETIONS:
      'Model is not specified for Code Completions tool.',
    API_KEY_MISSING: 'API key is missing. Please add it in the Settings tab.',
    CODE_COMPLETION_ERROR:
      'An error occurred during code completion. See console for details.',
    REFACTOR_ERROR:
      'An error occurred during refactor task. See console for details.',
    CONFIGURATION_ALREADY_EXISTS:
      'A configuration with these properties already exists.',
    CONFIGURATION_NOT_FOUND: 'Configuration not found.'
  },

  settings: {
    SETTINGS_TITLE: 'Settings',
    MODEL_PROVIDERS_LABEL: 'Model Providers',
    CODE_COMPLETIONS_LABEL: 'Code Completions',
    CODE_COMPLETIONS_SUBTITLE:
      'Get accurate code-at-cursor from state-of-the-art reasoning models.',
    EDIT_CONTEXT_LABEL: 'Edit Context',
    EDIT_CONTEXT_SUBTITLE:
      'Modify files based on natural language instructions.',
    INTELLIGENT_UPDATE_LABEL: 'Intelligent Update',
    INTELLIGENT_UPDATE_SUBTITLE:
      'Integrate truncated code blocks and fix malformed diffs.',
    COMMIT_MESSAGES_LABEL: 'Commit Messages',
    COMMIT_MESSAGES_SUBTITLE:
      'Generate meaningful summaries of changes adhering to your style.',
    SELECT_SETTING_FROM_SIDEBAR: 'Select a setting from the sidebar.',
    ADD_MODEL_PROVIDER_NAME_TITLE: 'Model Provider Name',
    ADD_MODEL_PROVIDER_NAME_PROMPT:
      'Enter a name for the custom model provider',
    NAME_IS_REQUIRED: 'Name is required',
    PROVIDER_WITH_NAME_ALREADY_EXISTS:
      'A provider with this name already exists',
    BASE_URL_TITLE: 'Base URL',
    BASE_URL_PROMPT: 'Enter base URL for the model provider',
    BASE_URL_IS_REQUIRED: 'Base URL is required',
    MODEL_API_KEY_TITLE: 'Model API Key',
    MODEL_API_KEY_PROMPT: 'Enter your model API key',
    API_KEY_IS_REQUIRED: 'API key is required',
    CUSTOM_ENDPOINT_LABEL: '$(edit) Custom endpoint...',
    CUSTOM_ENDPOINT_DESCRIPTION:
      'You can use any OpenAI-API compatible provider',
    PREDEFINED_ENDPOINTS_LABEL: 'Predefined endpoints',
    ADD_NEW_MODEL_PROVIDER_TITLE: 'Add New Model Provider',
    ADD_NEW_MODEL_PROVIDER_PLACEHOLDER:
      'Choose a predefined provider or create a custom one'
  },

  home: {
    header: 'Home',
    new_chat_label: 'Open View: New chat',
    new_chat_description: 'Send prompt with a free chatbot',
    api_call_label: 'Open View: API call',
    api_call_description: 'Send prompt with an API provider',
    license_prefix: 'Released under the',
    license_link_text: 'GPL-3.0 license',
    author: 'Robert Piosik',
    follow_x: 'Follow on X',
    join_reddit: 'Join subreddit',
    join_discord: 'Join Discord server',
    documentation: 'Documentation'
  }
}
