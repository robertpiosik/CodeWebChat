export namespace Logger {
  const LOG_PREFIX = '[CWC]'

  const sanitize_data = (data: any) => {
    if (!data || typeof data !== 'object') return data

    if (data.isAxiosError) {
      const sanitized = {
        name: data.name,
        message: data.message,
        stack: data.stack,
        ...data
      }

      if (sanitized.config?.headers) {
        sanitized.config = {
          ...sanitized.config,
          headers: { ...sanitized.config.headers }
        }
        for (const key in sanitized.config.headers) {
          if (key.toLowerCase() === 'authorization') {
            sanitized.config.headers[key] = '[REDACTED]'
          }
        }
      }

      if (sanitized.response?.config?.headers) {
        sanitized.response = {
          ...sanitized.response,
          config: {
            ...sanitized.response.config,
            headers: { ...sanitized.response.config.headers }
          }
        }
        for (const key in sanitized.response.config.headers) {
          if (key.toLowerCase() === 'authorization') {
            sanitized.response.config.headers[key] = '[REDACTED]'
          }
        }
      }

      return sanitized
    }

    return data
  }

  export function info(params: {
    function_name?: string
    message: string
    data?: any
  }) {
    const function_name = params.function_name
      ? `[${params.function_name}] `
      : ''
    if (params.data !== undefined) {
      console.log(
        `${LOG_PREFIX}${function_name}${params.message}`,
        sanitize_data(params.data)
      )
    } else {
      console.log(`${LOG_PREFIX}${function_name}${params.message}`)
    }
  }

  export function warn(params: {
    function_name?: string
    message: string
    data?: any
  }) {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''
    if (params.data !== undefined) {
      console.warn(
        `${LOG_PREFIX}${prefix}${params.message}`,
        sanitize_data(params.data)
      )
    } else {
      console.warn(`${LOG_PREFIX}${prefix}${params.message}`)
    }
  }

  export function error(params: {
    function_name?: string
    message: string
    data?: any
  }) {
    const prefix = params.function_name ? `[${params.function_name}] ` : ''
    if (params.data !== undefined) {
      console.error(
        `${LOG_PREFIX}${prefix}${params.message}`,
        sanitize_data(params.data)
      )
    } else {
      console.error(`${LOG_PREFIX}${prefix}${params.message}`)
    }
  }
}
