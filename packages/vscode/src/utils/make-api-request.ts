import * as vscode from 'vscode'
import axios, { AxiosResponse } from 'axios'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'

type StreamCallback = (tokens_per_second: number, total_tokens: number) => void
type ThinkingStreamCallback = (text: string) => void

const DATA_PREFIX = 'data: '
const DONE_TOKEN = '[DONE]'

async function process_stream_chunk(
  chunk: string,
  buffer: string
): Promise<{
  updated_buffer: string
  new_content: string
}> {
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
          if (json_data.choices?.[0]?.delta?.content) {
            new_content += json_data.choices[0].delta.content
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

export async function make_api_request(params: {
  endpoint_url: string
  api_key: string
  body: any
  cancellation_token: any
  on_chunk?: StreamCallback
  on_thinking_chunk?: ThinkingStreamCallback
}): Promise<{ response: string; thoughts?: string } | null> {
  Logger.info({
    function_name: 'make_api_request',
    message: 'API Request Body',
    data: params.body
  })

  let stream_start_time = 0
  let last_on_chunk_time = 0
  let last_total_tokens = 0
  let total_tokens = 0
  let first_chunk_reported = false

  const handle_chunk_metrics = (chunk: string) => {
    if (!params.on_chunk || !chunk) return

    total_tokens += Math.ceil(chunk.length / 4)
    if (stream_start_time === 0) {
      stream_start_time = Date.now()
      last_on_chunk_time = stream_start_time
      // Don't calculate TPS on the first chunk, as elapsed time is 0
      return
    }

    const current_time = Date.now()
    const elapsed_since_last = current_time - last_on_chunk_time
    if (elapsed_since_last >= 1000) {
      // Skip the very first report to avoid inflated TPS
      if (!first_chunk_reported) {
        first_chunk_reported = true
        last_on_chunk_time = current_time
        last_total_tokens = total_tokens
        return
      }

      const tokens_since_last = total_tokens - last_total_tokens
      const seconds_since_last = elapsed_since_last / 1000
      const tokens_per_second =
        seconds_since_last > 0
          ? Math.round(tokens_since_last / seconds_since_last)
          : 0
      params.on_chunk(tokens_per_second, total_tokens)
      last_on_chunk_time = current_time
      last_total_tokens = total_tokens
    }
  }

  const handle_thinking_chunk = (chunk: string) => {
    if (!params.on_thinking_chunk || !chunk) return
    params.on_thinking_chunk(chunk)
  }

  const MAX_RETRIES = 3
  const RETRY_DELAYS = [2000, 5000, 10000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const request_body = { ...params.body, stream: true }

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
            const trimmed_response = full_response.trimStart()
            if (trimmed_response.length == 0) {
              return
            }

            const is_think_prefix =
              '<think>'.startsWith(trimmed_response) ||
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

      const response: AxiosResponse<NodeJS.ReadableStream> = await axios.post(
        params.endpoint_url + '/chat/completions',
        request_body,
        {
          headers: {
            ['Authorization']: `Bearer ${params.api_key}`,
            ['Content-Type']: 'application/json',
            ...(params.endpoint_url == 'https://openrouter.ai/api/v1'
              ? {
                  'HTTP-Referer': 'https://codeweb.chat/',
                  'X-Title': 'Code Web Chat'
                }
              : {})
          },
          cancelToken: params.cancellation_token,
          responseType: 'stream'
        }
      )

      response.data.setEncoding('utf8')

      return new Promise((resolve, reject) => {
        response.data.on('data', async (chunk: string) => {
          const { updated_buffer, new_content } = await process_stream_chunk(
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
          if (buffer.trim()) {
            try {
              const trimmed_line = buffer.trim()
              if (trimmed_line.startsWith(DATA_PREFIX)) {
                const json_string = trimmed_line
                  .slice(DATA_PREFIX.length)
                  .trim()
                if (json_string && json_string !== DONE_TOKEN) {
                  const json_data = JSON.parse(json_string)
                  if (json_data.choices?.[0]?.delta?.content) {
                    process_content(json_data.choices[0].delta.content)
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
          const thoughts = thoughts_match ? thoughts_match[1].trim() : undefined

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

          resolve({ response: content_for_client, thoughts })
        })

        response.data.on('error', (error: Error) => {
          Logger.error({
            function_name: 'make_api_request',
            message: 'Stream error',
            data: error
          })
          reject(error)
        })
      })
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        error.response?.status == 503 &&
        attempt < MAX_RETRIES
      ) {
        const delay = RETRY_DELAYS[attempt]
        Logger.warn({
          function_name: 'make_api_request',
          message: `API request failed with status 503. Retrying in ${
            delay / 1000
          }s... (Attempt ${attempt + 1}/${MAX_RETRIES + 1})`
        })
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      if (axios.isCancel(error)) {
        Logger.info({
          function_name: 'make_api_request',
          message: 'Request canceled',
          data: error.message
        })
        return null
      } else if (axios.isAxiosError(error) && error.response?.status == 429) {
        vscode.window.showErrorMessage(
          dictionary.error_message.API_RATE_LIMIT_EXCEEDED
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
  return null
}
