export namespace Logger {
  const LOG_PREFIX = '[CWC]'

  const sanitize_data = (data: any, seen = new WeakSet()): any => {
    if (data === null || data === undefined) return data

    if (typeof data === 'string') {
      return data
        .replace(/(Authorization:\s*Bearer\s+)[^\r\n]+/gi, '$1[REDACTED]')
        .replace(/(x-api-key:\s*)[^\r\n]+/gi, '$1[REDACTED]')
    }

    if (typeof data !== 'object') return data

    if (seen.has(data)) return '[Circular]'
    seen.add(data)

    if (Array.isArray(data)) {
      return data.map((item) => sanitize_data(item, seen))
    }

    const sanitized: any = {}

    if (data instanceof Error) {
      sanitized.name = data.name
      sanitized.message = data.message
      sanitized.stack = data.stack
    }

    for (const key of Object.keys(data)) {
      const lower_key = key.toLowerCase()
      if (lower_key === 'authorization' || lower_key === 'x-api-key') {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitize_data(data[key], seen)
      }
    }

    return sanitized
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
