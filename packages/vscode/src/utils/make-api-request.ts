import * as vscode from 'vscode'
import axios, { AxiosResponse } from 'axios'
import { dictionary } from '@/constants/dictionary'
import { Logger } from '@shared/utils/logger'

type StreamCallback = (tokens_per_second: number, total_tokens: number) => void

type InternalStreamCallback = (chunk: string) => void

const DATA_PREFIX = 'data: '
const DONE_TOKEN = '[DONE]'
const THINK_OPEN = '<think>'
const THINK_CLOSE = '</think>'

async function process_stream_chunk(
  chunk: string,
  buffer: string,
  accumulated_content: string,
  last_log_time: number,
  logged_content_length: number,
  think_buffer: string,
  in_think_block: boolean,
  think_block_ended: boolean,
  on_chunk?: InternalStreamCallback
): Promise<{
  updated_buffer: string
  updated_accumulated_content: string
  updated_last_log_time: number
  updated_logged_content_length: number
  updated_think_buffer: string
  updated_in_think_block: boolean
  updated_think_block_ended: boolean
}> {
  let updated_buffer = buffer
  let updated_accumulated_content = accumulated_content
  let updated_last_log_time = last_log_time
  let updated_logged_content_length = logged_content_length
  let updated_think_buffer = think_buffer
  let updated_in_think_block = in_think_block
  let updated_think_block_ended = think_block_ended

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
            const new_content = json_data.choices[0].delta.content
            updated_accumulated_content += new_content

            // --- Think block handling logic ---
            if (updated_think_block_ended) {
              // If the first think block has already ended, stream all new content
              if (on_chunk) {
                on_chunk(new_content)
              }
            } else {
              // We are either before, or inside, the first think block
              updated_think_buffer += new_content

              if (!updated_in_think_block) {
                // We are currently *not* in a think block (haven't seen <think> yet)
                const think_open_index =
                  updated_think_buffer.indexOf(THINK_OPEN)
                if (think_open_index != -1) {
                  // <think> tag found!
                  updated_in_think_block = true
                  // Stream content *before* <think>
                  const pre_think_content = updated_think_buffer.substring(
                    0,
                    think_open_index
                  )
                  if (pre_think_content && on_chunk) {
                    on_chunk(pre_think_content)
                  }
                  // The remaining part of updated_think_buffer now starts with <think>
                  updated_think_buffer =
                    updated_think_buffer.substring(think_open_index)
                } else {
                  // No <think> tag found yet, stream this content
                  if (on_chunk) {
                    on_chunk(new_content)
                  }
                }
              }

              // Now, if we are in a think block (either just entered or already were)
              if (updated_in_think_block) {
                const think_close_index =
                  updated_think_buffer.indexOf(THINK_CLOSE)
                if (think_close_index != -1) {
                  // </think> tag found!
                  updated_in_think_block = false
                  updated_think_block_ended = true
                  // Stream content *after* </think>
                  const post_think_content = updated_think_buffer.substring(
                    think_close_index + THINK_CLOSE.length
                  )
                  if (post_think_content && on_chunk) {
                    on_chunk(post_think_content)
                  }
                  // Clear the think buffer as the first think block is fully processed
                  updated_think_buffer = ''
                }
                // If </think> not found, we remain in_think_block and do not stream.
              }
            }
            // --- End think block handling logic ---

            const current_time = Date.now()
            if (current_time - updated_last_log_time >= 1000) {
              Logger.info({
                function_name: 'process_stream_chunk',
                message: 'Streaming tokens',
                data: `\n${updated_accumulated_content.substring(
                  updated_logged_content_length
                )}`
              })
              updated_last_log_time = current_time
              updated_logged_content_length = updated_accumulated_content.length
            }
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
    updated_accumulated_content,
    updated_last_log_time,
    updated_logged_content_length,
    updated_think_buffer,
    updated_in_think_block,
    updated_think_block_ended
  }
}

export async function make_api_request(params: {
  endpoint_url: string
  api_key: string
  body: any
  cancellation_token: any
  on_chunk?: StreamCallback
}): Promise<string | null> {
  Logger.info({
    function_name: 'make_api_request',
    message: 'API Request Body',
    data: params.body
  })

  let stream_start_time = 0
  let last_on_chunk_time = 0
  let total_tokens = 0
  let internal_on_chunk: InternalStreamCallback | undefined

  if (params.on_chunk) {
    internal_on_chunk = (chunk: string) => {
      if (stream_start_time == 0) {
        stream_start_time = Date.now()
        last_on_chunk_time = stream_start_time
      }
      total_tokens += Math.ceil(chunk.length / 4)

      const current_time = Date.now()
      if (current_time - last_on_chunk_time >= 1000) {
        last_on_chunk_time = current_time

        const elapsed_seconds = (current_time - stream_start_time) / 1000
        const tokens_per_second =
          elapsed_seconds > 0 ? Math.round(total_tokens / elapsed_seconds) : 0

        params.on_chunk!(tokens_per_second, total_tokens)
      }
    }
  }

  const MAX_RETRIES = 3
  const RETRY_DELAYS = [2000, 5000, 10000]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const request_body = { ...params.body, stream: true }

      let accumulated_content = ''
      let last_log_time = Date.now()
      let logged_content_length = 0
      let buffer = ''
      let think_buffer = ''
      let in_think_block = false
      let think_block_ended = false

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
                  'X-Title': 'Code Web Chat (CWC)'
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
          const processing_result = await process_stream_chunk(
            chunk,
            buffer,
            accumulated_content,
            last_log_time,
            logged_content_length,
            think_buffer,
            in_think_block,
            think_block_ended,
            internal_on_chunk
          )
          buffer = processing_result.updated_buffer
          accumulated_content = processing_result.updated_accumulated_content
          last_log_time = processing_result.updated_last_log_time
          logged_content_length =
            processing_result.updated_logged_content_length
          think_buffer = processing_result.updated_think_buffer
          in_think_block = processing_result.updated_in_think_block
          think_block_ended = processing_result.updated_think_block_ended
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
                    accumulated_content += json_data.choices[0].delta.content
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

          Logger.info({
            function_name: 'make_api_request',
            message: 'Combined code received:',
            data: accumulated_content
          })

          resolve(accumulated_content)
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
