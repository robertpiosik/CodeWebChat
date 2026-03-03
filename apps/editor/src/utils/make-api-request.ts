import * as vscode from 'vscode'
import axios, { AxiosResponse } from 'axios'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'

type StreamCallback = (tokens_per_second: number, total_tokens: number) => void
type ThinkingStreamCallback = (text: string) => void

const DATA_PREFIX = 'data: '
const DONE_TOKEN = '[DONE]'

const process_stream_chunk = (
  chunk: string,
  buffer: string
): {
  updated_buffer: string
  new_content: string
} => {
  let updated_buffer = buffer
  let new_content = ''
  try {
    updated_buffer += chunk
    const lines = updated_buffer.split('\n')
    updated_buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed_line = line.trim()
      if (!trimmed_line || trimmed_line == DONE_TOKEN) continue

      if (trimmed_line.startsWith(DATA_PREFIX)) {
        try {
          const json_string = trimmed_line.slice(DATA_PREFIX.length).trim()
          if (!json_string || json_string == DONE_TOKEN) continue

          const json_data = JSON.parse(json_string)
          let content = json_data.choices?.[0]?.delta?.content

          // Special handling for ChatGPT provider
          if (content === undefined && json_data.type) {
            if (
              [
                'response.text.delta',
                'response.output_text.delta',
                'response.reasoning.delta',
                'response.reasoning_text.delta'
              ].includes(json_data.type)
            ) {
              content = json_data.delta
            } else if (json_data.type === 'response.content_part.added') {
              content =
                typeof json_data.part?.text === 'string'
                  ? json_data.part.text
                  : json_data.part?.text?.value
            } else if (
              json_data.type === 'response.output_item.added' &&
              json_data.item?.type === 'text'
            ) {
              content = json_data.item?.text
            }
          }

          if (typeof content == 'string') {
            new_content += content
          }
        } catch (parse_error) {
          Logger.warn({
            function_name: 'process_stream_chunk',
            message: 'Failed to parse JSON chunk',
            data: { trimmed_line, parse_error }
          })
        }
      }
    }
  } catch (error) {
    Logger.error({
      function_name: 'process_stream_chunk',
      message: 'Error processing stream chunk',
      data: error
    })
  }

  return {
    updated_buffer,
    new_content
  }
}

class StreamAbortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StreamAbortError'
  }
}

export const make_api_request = async (params: {
  endpoint_url: string
  api_key?: string
  body: any
  cancellation_token: any
  on_chunk?: StreamCallback
  on_thinking_chunk?: ThinkingStreamCallback
  rethrow_error?: boolean
}): Promise<{ response: string; thoughts?: string } | null> => {
  let stream_start_time = 0
  let last_on_chunk_time = 0
  let total_tokens = 0

  const handle_chunk_metrics = (chunk: string) => {
    if (!params.on_chunk || !chunk) return

    const chunk_tokens = Math.ceil(chunk.length / 4)
    total_tokens += chunk_tokens

    const current_time = Date.now()

    if (stream_start_time == 0) {
      stream_start_time = current_time
      last_on_chunk_time = current_time
      return
    }

    const elapsed_since_last = current_time - last_on_chunk_time

    if (elapsed_since_last >= 1000) {
      const total_elapsed_seconds = (current_time - stream_start_time) / 1000
      const tokens_per_second =
        total_elapsed_seconds > 0
          ? Math.round(total_tokens / total_elapsed_seconds)
          : 0

      params.on_chunk(tokens_per_second, total_tokens)
      last_on_chunk_time = current_time
    }
  }

  const handle_thinking_chunk = (chunk: string) => {
    if (!params.on_thinking_chunk || !chunk) return
    params.on_thinking_chunk(chunk)
  }

  try {
    const is_chatgpt = params.endpoint_url.includes('chatgpt.com/backend-api')
    const request_url = is_chatgpt
      ? params.endpoint_url + '/responses'
      : params.endpoint_url + '/chat/completions'

    let request_body: any = { ...params.body, stream: true }

    if (is_chatgpt) {
      const system_message = params.body.messages?.find(
        (m: any) => m.role === 'system'
      )
      const other_messages =
        params.body.messages?.filter((m: any) => m.role !== 'system') || []

      const formatted_input = other_messages.map((m: any) => {
        if (m.role == 'user') {
          const content = []
          if (typeof m.content == 'string') {
            content.push({ type: 'input_text', text: m.content })
          } else if (Array.isArray(m.content)) {
            for (const block of m.content) {
              if (block.type == 'text') {
                content.push({ type: 'input_text', text: block.text })
              } else if (block.type == 'image_url') {
                content.push({
                  type: 'input_image',
                  image_url: block.image_url.url
                })
              }
            }
          }
          return { role: 'user', content }
        } else if (m.role == 'assistant') {
          const content = []
          if (typeof m.content == 'string') {
            content.push({ type: 'output_text', text: m.content })
          } else if (Array.isArray(m.content)) {
            for (const block of m.content) {
              if (block.type == 'text') {
                content.push({ type: 'output_text', text: block.text })
              }
            }
          }
          return { role: 'assistant', content }
        }
        return m
      })

      request_body = {
        model: params.body.model,
        input: formatted_input,
        stream: true,
        store: false
      }
      if (system_message) {
        request_body.instructions = system_message.content
      }
      if (params.body.temperature !== undefined) {
        request_body.temperature = params.body.temperature
      }
      if (params.body.reasoning_effort) {
        request_body.reasoning = {
          effort: params.body.reasoning_effort,
          summary: 'auto'
        }
      }
    }

    Logger.info({
      function_name: 'make_api_request',
      message: 'API Request Body',
      data: request_body
    })

    let buffer = ''
    let full_response = ''
    let content_for_client = ''
    let in_think_block = false
    let think_block_closed = false
    let processed_think_content_length = 0

    let last_log_time = Date.now()
    let logged_content_length = 0

    const process_content = (new_content: string) => {
      if (!new_content) return

      full_response += new_content

      if (think_block_closed) {
        content_for_client += new_content
        handle_chunk_metrics(new_content)
        return
      }

      if (!in_think_block) {
        const think_start_regex = /<(think|thought)>/
        const start_match = full_response.match(think_start_regex)

        if (start_match) {
          in_think_block = true
          processed_think_content_length =
            start_match.index! + start_match[0].length
        } else {
          const think_end_regex = /<\/(think|thought)>/
          const end_match = full_response.match(think_end_regex)

          if (end_match) {
            const think_content_chunk = full_response.substring(
              0,
              end_match.index!
            )
            if (think_content_chunk) {
              handle_thinking_chunk(think_content_chunk)
            }

            think_block_closed = true

            const content_after = full_response.substring(
              end_match.index! + end_match[0].length
            )
            content_for_client = content_after
            if (content_after) {
              handle_chunk_metrics(content_after)
            }
            return
          }

          const trimmed_response = full_response.trimStart()
          if (trimmed_response.length == 0) {
            return
          }

          const is_think_prefix =
            '<tool_call>'.startsWith(trimmed_response) ||
            '<thought>'.startsWith(trimmed_response)

          if (!is_think_prefix) {
            think_block_closed = true
            content_for_client = full_response
            handle_chunk_metrics(full_response)
            return
          }
        }
      }

      if (in_think_block) {
        const think_end_regex = /<\/(think|thought)>/
        const end_match = full_response
          .substring(processed_think_content_length)
          .match(think_end_regex)

        let think_content_chunk: string

        if (end_match) {
          const end_match_absolute_index =
            processed_think_content_length + end_match.index!

          think_content_chunk = full_response.substring(
            processed_think_content_length,
            end_match_absolute_index
          )

          think_block_closed = true

          const content_after = full_response.substring(
            end_match_absolute_index + end_match[0].length
          )
          content_for_client = content_after
          if (content_after) {
            handle_chunk_metrics(content_after)
          }
        } else {
          think_content_chunk = full_response.substring(
            processed_think_content_length
          )
        }

        if (think_content_chunk) {
          handle_thinking_chunk(think_content_chunk)
          processed_think_content_length += think_content_chunk.length
        }
      }
    }

    const headers: Record<string, string> = {
      ...(params.api_key
        ? { ['Authorization']: `Bearer ${params.api_key}` }
        : {}),
      ['Content-Type']: 'application/json',
      ...(params.endpoint_url == 'https://openrouter.ai/api/v1'
        ? {
            'HTTP-Referer': 'https://codeweb.chat/',
            'X-Title': 'Code Web Chat'
          }
        : {})
    }

    if (is_chatgpt) {
      headers['originator'] = 'code-web-chat'
    }

    const response: AxiosResponse<NodeJS.ReadableStream> = await axios.post(
      request_url,
      request_body,
      {
        headers,
        cancelToken: params.cancellation_token,
        responseType: 'stream'
      }
    )

    response.data.setEncoding('utf8')

    return await new Promise((resolve, reject) => {
      let stream_closed = false

      response.data.on('data', async (chunk: string) => {
        const { updated_buffer, new_content } = process_stream_chunk(
          chunk,
          buffer
        )
        buffer = updated_buffer
        process_content(new_content)

        const current_time = Date.now()
        if (current_time - last_log_time >= 1000) {
          Logger.info({
            function_name: 'make_api_request',
            message: 'Streaming tokens',
            data: `\n${full_response.substring(logged_content_length)}`
          })
          last_log_time = current_time
          logged_content_length = full_response.length
        }
      })

      response.data.on('end', () => {
        stream_closed = true

        if (buffer.trim()) {
          try {
            const trimmed_line = buffer.trim()
            if (trimmed_line.startsWith(DATA_PREFIX)) {
              const json_string = trimmed_line.slice(DATA_PREFIX.length).trim()
              if (json_string && json_string !== DONE_TOKEN) {
                const json_data = JSON.parse(json_string)
                let content = json_data.choices?.[0]?.delta?.content

                // Special handling for ChatGPT provider
                if (content === undefined && json_data.type) {
                  if (
                    [
                      'response.text.delta',
                      'response.output_text.delta',
                      'response.reasoning.delta',
                      'response.reasoning_text.delta'
                    ].includes(json_data.type)
                  ) {
                    content = json_data.delta
                  } else if (json_data.type === 'response.content_part.added') {
                    content =
                      typeof json_data.part?.text === 'string'
                        ? json_data.part.text
                        : json_data.part?.text?.value
                  } else if (
                    json_data.type === 'response.output_item.added' &&
                    json_data.item?.type === 'text'
                  ) {
                    content = json_data.item?.text
                  }
                }

                if (typeof content == 'string') {
                  process_content(content)
                }
              }
            }
          } catch (error) {
            Logger.warn({
              function_name: 'make_api_request',
              message: 'Failed to parse final buffer',
              data: error
            })
          }
        }

        const thoughts_match = full_response.match(
          /<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/
        )
        let thoughts = thoughts_match ? thoughts_match[1].trim() : undefined
        let final_content = content_for_client

        if (!thoughts_match) {
          const end_match = full_response.match(/<\/(?:think|thought)>/)
          if (end_match) {
            const start_match = full_response.match(/<(?:think|thought)>/)
            if (!start_match) {
              thoughts = full_response.substring(0, end_match.index).trim()
              final_content = full_response
                .substring(end_match.index! + end_match[0].length)
                .trim()
              Logger.info({
                function_name: 'make_api_request',
                message:
                  'Detected closing tag without opening tag, stripped content before  '
              })
            }
          }
        }

        Logger.info({
          function_name: 'make_api_request',
          message: 'Combined code received (full response):',
          data: full_response
        })
        if (in_think_block) {
          Logger.info({
            function_name: 'make_api_request',
            message: 'Combined code received (for client):',
            data: content_for_client
          })
        }

        resolve({ response: final_content, thoughts })
      })

      response.data.on('error', (error: Error) => {
        if (!stream_closed) {
          Logger.error({
            function_name: 'make_api_request',
            message: 'Stream error',
            data: error
          })
          reject(new StreamAbortError(error.message))
        }
      })

      response.data.on('aborted', () => {
        if (!stream_closed) {
          Logger.warn({
            function_name: 'make_api_request',
            message: 'Stream aborted'
          })
          reject(new StreamAbortError('Stream was aborted'))
        }
      })
    })
  } catch (error) {
    if (params.cancellation_token?.reason) {
      throw params.cancellation_token.reason
    }

    if (axios.isCancel(error)) {
      throw error
    }

    if (params.rethrow_error) {
      throw error
    }

    if (axios.isAxiosError(error) && error.response?.status == 429) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_RATE_LIMIT_EXCEEDED
      )
    } else if (axios.isAxiosError(error) && error.response?.status == 413) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_PAYLOAD_TOO_LARGE
      )
    } else if (axios.isAxiosError(error) && error.response?.status == 400) {
      vscode.window.showErrorMessage(dictionary.error_message.API_BAD_REQUEST)
    } else if (axios.isAxiosError(error) && error.response?.status == 503) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_ENDPOINT_UNAVAILABLE
      )
    } else if (axios.isAxiosError(error) && error.response?.status == 401) {
      vscode.window.showErrorMessage(dictionary.error_message.API_INVALID_KEY)
    } else {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_REQUEST_FAILED
      )
    }
    Logger.error({
      function_name: 'make_api_request',
      message: 'API request failed',
      data: error
    })
    return null
  }
}
