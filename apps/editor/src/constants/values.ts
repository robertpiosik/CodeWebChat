export const CHECKPOINT_DEFAULT_LIFESPAN = 24
export const MAX_FILE_TOKENS_FOR_COMMIT_MESSAGE = 20000
export const MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE = 1000
export const GIT_LOG_SINCE_DURATION = '6 months ago'
export const SYMBOL_CACHE_DURATION = 5 * 60 * 1000

export const MAX_CLI_PROMPT_TOTAL_INLINED_CHARS = 20000
export const MAX_CLI_PROMPT_FILE_INLINED_CHARS = 1000

export const DIFF_PLACEHOLDERS = {
  FILE_CREATED: 'File created',
  FILE_DELETED: 'File deleted',
  FILE_RENAMED: 'File renamed',
  FILE_MODIFIED: 'File modified',
  BINARY_FILE_CREATED: 'Binary file created',
  BINARY_FILE_DELETED: 'Binary file deleted',
  BINARY_FILE_MODIFIED: 'Binary file modified',
  BINARY_FILE_ADDED: 'Binary file added'
}
