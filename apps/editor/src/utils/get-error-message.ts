export const get_error_message = (error: unknown): string =>
  error instanceof Error ? error.message || error.name : String(error)