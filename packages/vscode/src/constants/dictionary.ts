export const DICTIONARY = {
  WAITING_FOR_API_RESPONSE: 'Waiting for API response',

  // ChatInput.tsx
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
  approximate_token_count: 'Approximate message length in tokens',

  // Configurations.tsx
  my_configurations: 'MY CONFIGURATIONS',

  // Presets.tsx
  my_chat_presets: 'MY CHAT PRESETS',
  duplicate: 'Duplicate',
  edit: 'Edit',
  delete: 'Delete',
  set_as_selected: 'Set as selected',
  unset_as_selected: 'Unset as selected',
  collapse_group: 'Collapse',
  expand_group: 'Expand',

  // Warning/Error messages
  API_PROVIDER_NOT_FOUND:
    'API provider for the selected API tool configuration was not found.',
  NO_RESPONSE_TEXT: 'No response text provided and clipboard is empty.',
  NO_WORKSPACE_FOLDER_OPEN: 'No workspace folder open.',
  NO_VALID_CODE_BLOCKS_IN_CLIPBOARD:
    'Unable to find valid code blocks in the clipboard.',
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
  CONTEXT_NAME_NOT_PROVIDED: 'Context name was not provided.',
  NO_FILES_OR_WEBSITES_SELECTED: 'No files or websites selected or open.',
  NO_OPEN_EDITORS_SELECTED: 'No open editors selected.',
  CODE_COMPLETION_ERROR:
    'An error occurred during code completion. See console for details.',
  NO_EDITOR_OPEN: 'No editor is open.',
  CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITH_SELECTION:
    'Cannot copy prompt in code completion mode with an active selection.',
  CANNOT_COPY_PROMPT_IN_EDIT_CONTEXT_WITHOUT_CONTEXT:
    'Cannot copy prompt in edit context mode without any context. Please add files to the context.',
  CANNOT_COPY_PROMPT_IN_CODE_COMPLETION_WITHOUT_EDITOR:
    'Cannot copy prompt in code completion mode without an active editor.',
  UNABLE_TO_WORK_WITH_EMPTY_CONTEXT: 'Unable to work with empty context.',
  INSTRUCTION_CANNOT_BE_EMPTY: 'Instruction cannot be empty',
  REFACTOR_ERROR:
    'An error occurred during refactor task. See console for details.',
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
  NO_MODEL_PROVIDERS_CONFIGURED:
    'No model providers configured. Please add a model provider first on the "Model Providers" page.',
  CONFIGURATION_ALREADY_EXISTS:
    'A configuration with these properties already exists.',
  CONFIGURATION_NOT_FOUND: 'Configuration not found.'
}
