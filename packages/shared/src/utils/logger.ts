export namespace Logger {
  const LOG_PREFIX = '[CWC]'

  export function log(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const function_name = params.function_name
      ? `[${params.function_name}] `
      : ''
    console.log(
      `${LOG_PREFIX}${function_name}${params.message}`,
      params.data ? params.data : undefined
    )
  }

  export function warn(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''
    console.warn(`${LOG_PREFIX}${prefix}${params.message}`, params.data)
  }

  export function error(params: {
    function_name?: string
    message: string
    data?: any
  }): void {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''
    console.error(`${LOG_PREFIX}${prefix}${params.message}`, params.data)
  }
}
