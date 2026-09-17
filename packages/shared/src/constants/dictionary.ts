export const dictionary = {
  error_message: {
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
    FAILED_TO_INITIALIZE_WEBSOCKET_SERVER: (error: any) =>
      `Failed to initialize WebSocket server: ${error}.`,
    NO_WORKSPACE_FOLDERS_FOUND: 'No workspace folders found.',
    FAILED_TO_GET_GIT_BRANCHES:
      'Failed to get Git branches. Make sure you are in a Git repository.',
    NO_GIT_REPOSITORY_FOUND: 'No Git repository found.',
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
    PATCH_REPAIR_CONTEXT_NOT_FOUND:
      'Could not find the context for patch repair. Please apply the changes again.',
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
    BASE_URL_NOT_FOUND_FOR_PROVIDER: (name: string) =>
      `Base URL not found for provider ${name}.`,
    PROVIDER_NOT_FOUND_BY_NAME: (name: string) =>
      `Provider "${name}" not found.`,
    NO_WORKSPACE_FOLDER_OPEN: 'No workspace folder open.',
    NO_WORKSPACE_ROOT: 'No workspace root found.',
    API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR:
      'API provider is not specified for Code at Cursor tool.',
    MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR:
      'Model is not specified for Code at Cursor tool.',
    EDIT_FILES_ERROR:
      'An error occurred during file editing. See console for details.',
    CONFIGURATION_ALREADY_EXISTS: 'Identical configuration already exists.',
    APPLYING_CHANGES_GENERIC_ERROR: (msg: string) =>
      `An error occurred while applying changes (${msg}).`
  }
}
