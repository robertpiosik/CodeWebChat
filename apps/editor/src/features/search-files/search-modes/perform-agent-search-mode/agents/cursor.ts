import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

export const cursor_agent: CodingAgent = {
  id: 'cursor',
  label: 'Cursor',
  cmd: 'agent',
  is_installed: () => check_command_exists('agent'),
  get_documentation_url: () => 'https://cursor.com/docs/cli/headless',
  get_args: (query: string) => [
    '-p',
    `${agentic_file_search_instructions}\n\n${query}`,
    '--output-format',
    'stream-json',
    '--force'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'tool_call') {
      if (parsed.subtype == 'started' || !parsed.subtype) {
        const tool_call = parsed.tool_call
        if (tool_call) {
          let msg = ''
          if (tool_call.readToolCall?.args?.path) {
            msg = tool_call.readToolCall.args.path
          } else if (tool_call.writeToolCall?.args?.path) {
            msg = tool_call.writeToolCall.args.path
          } else {
            const key = Object.keys(tool_call)[0]
            if (key) {
              const call = tool_call[key]
              const args = call?.args
              const raw_name = key.replace(/ToolCall$/, '')
              const formatted_name = raw_name
                .replace(/([A-Z])/g, '_$1')
                .toLowerCase()
                .replace(/^_/, '')

              if (
                (formatted_name.includes('run') ||
                  formatted_name.includes('command') ||
                  formatted_name.includes('bash')) &&
                (args?.command || args?.cmd || args?.CommandLine)
              ) {
                msg = args.command || args.cmd || args.CommandLine
              } else if (
                (formatted_name.includes('search') ||
                  formatted_name.includes('grep') ||
                  formatted_name.includes('find')) &&
                (args?.query || args?.pattern)
              ) {
                msg = args.query || args.pattern
              } else if (
                formatted_name.includes('list') &&
                args?.path
              ) {
                msg = args.path
              } else if (args?.path) {
                msg = args.path
              } else {
                msg = key
              }
            }
          }

          if (msg) {
            report_progress(msg)
          }
        }
      }
    } else if (parsed.type == 'result' && parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || parsed.result.response || ''
      }
    } else if (parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || parsed.result.response || ''
      }
    } else if (parsed.type == 'assistant' && parsed.message) {
      const is_delta = parsed.timestamp_ms && !parsed.model_call_id
      if (!is_delta) {
        if (Array.isArray(parsed.message.content)) {
          const text = parsed.message.content
            .map((item: any) =>
              typeof item === 'string' ? item : item?.text || ''
            )
            .join('')
          if (text) {
            return { output: text }
          }
        } else if (typeof parsed.message.content === 'string') {
          return { output: parsed.message.content }
        } else if (typeof parsed.message === 'string') {
          return { output: parsed.message }
        }
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (parsed.type == 'result' && parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || parsed.result.response || ''
    } else if (parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || parsed.result.response || ''
    } else if (parsed.type == 'assistant' && parsed.message) {
      if (Array.isArray(parsed.message.content)) {
        return (
          parsed.message.content
            .map((item: any) =>
              typeof item === 'string' ? item : item?.text || ''
            )
            .join('') || current_output
        )
      } else if (typeof parsed.message.content === 'string') {
        return parsed.message.content
      } else if (typeof parsed.message === 'string') {
        return parsed.message
      }
    } else if (parsed.response) {
      return parsed.response
    } else if (parsed.text) {
      return parsed.text
    }
    return current_output
  }
}
