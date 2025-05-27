import * as vscode from 'vscode'
import axios, { AxiosResponse } from 'axios'
import { Logger } from './logger'

type StreamCallback = (chunk: string) => void

const DATA_PREFIX = 'data: '
const DONE_TOKEN = '[DONE]'

async function process_stream_chunk(
  chunk: Buffer,
  buffer: string,
  accumulated_content: string,
  last_log_time: number,
  on_chunk?: StreamCallback
): Promise<{
  updated_buffer: string
  updated_accumulated_content: string
  updated_last_log_time: number
}> {
  let updated_buffer = buffer
  let updated_accumulated_content = accumulated_content
  let updated_last_log_time = last_log_time

  try {
    updated_buffer += chunk.toString()
    const lines = updated_buffer.split('\n')
    updated_buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed_line = line.trim()
      if (!trimmed_line || trimmed_line === DONE_TOKEN) continue

      if (trimmed_line.startsWith(DATA_PREFIX)) {
        try {
          const json_string = trimmed_line.slice(DATA_PREFIX.length).trim()
          if (!json_string || json_string === DONE_TOKEN) continue

          const json_data = JSON.parse(json_string)
          if (json_data.choices?.[0]?.delta?.content) {
            const new_content = json_data.choices[0].delta.content
            updated_accumulated_content += new_content

            if (on_chunk) {
              on_chunk(new_content)
            }

            const current_time = Date.now()
            if (current_time - updated_last_log_time >= 1000) {
              Logger.log({
                function_name: 'process_stream_chunk',
                message: `Streaming tokens:`,
                data: updated_accumulated_content
              })
              updated_last_log_time = current_time
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
    updated_last_log_time
  }
}

export async function make_api_request(
  endpoint_url: string,
  api_key: string,
  body: any,
  cancellation_token: any,
  on_chunk?: StreamCallback
): Promise<string | null> {
  try {
    const request_body = { ...body, stream: true }

    let accumulated_content = ''
    let last_log_time = Date.now()
    let buffer = ''

    const response: AxiosResponse<NodeJS.ReadableStream> = await axios.post(
      endpoint_url + '/chat/completions',
      request_body,
      {
        headers: {
          ['Authorization']: `Bearer ${api_key}`,
          ['Content-Type']: 'application/json',
          ...(endpoint_url == 'https://openrouter.ai/api/v1'
            ? {
                'HTTP-Referer': 'https://codeweb.chat/',
                'X-Title': 'Code Web Chat (CWC)'
              }
            : {})
        },
        cancelToken: cancellation_token,
        responseType: 'stream'
      }
    )

    return new Promise((resolve, reject) => {
      response.data.on('data', async (chunk: Buffer) => {
        const processing_result = await process_stream_chunk(
          chunk,
          buffer,
          accumulated_content,
          last_log_time,
          on_chunk
        )
        buffer = processing_result.updated_buffer
        accumulated_content = processing_result.updated_accumulated_content
        last_log_time = processing_result.updated_last_log_time
      })

      response.data.on('end', () => {
        if (buffer.trim()) {
          try {
            const trimmed_line = buffer.trim()
            if (trimmed_line.startsWith(DATA_PREFIX)) {
              const json_string = trimmed_line.slice(DATA_PREFIX.length).trim()
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

        Logger.log({
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
    if (axios.isCancel(error)) {
      Logger.log({
        function_name: 'make_api_request',
        message: 'Request canceled',
        data: error.message
      })
      return null
    } else if (axios.isAxiosError(error) && error.response?.status == 429) {
      vscode.window.showErrorMessage(`API request failed. Rate limit exceeded.`)
    } else if (axios.isAxiosError(error) && error.response?.status == 401) {
      vscode.window.showErrorMessage(`API request failed. Invalid API key.`)
    } else {
      vscode.window.showErrorMessage(
        `API request failed. Check console for details.`
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
