import { CodingAgent } from '../types'
import { check_command_exists } from '../utils/check-command-exists'
import { get_progress_dots } from '../utils/get-progress-dots'
import { AGENTS } from '../../../constants/agents'

let last_action_name = ''
let action_count = 0

const agent_name = 'Cursor'

export const cursor_agent: CodingAgent = {
  id: 'cursor',
  label: agent_name,
  cmd: 'agent',
  is_installed: () => check_command_exists('agent'),
  get_documentation_url: () => AGENTS[agent_name].docs_url,
  get_isolated_dir_args: () => ['--force', '--output-format', 'stream-json'],
  get_integrated_terminal_args: () => ['--force'],
  get_post_integrated_terminal_args: () => ['--continue', '--trust'],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'tool_call') {
      if (parsed.subtype == 'started' || !parsed.subtype) {
        const tool_call = parsed.tool_call
        if (tool_call) {
          let action_name = ''
          const key = Object.keys(tool_call)[0]
          if (key) {
            const raw_name = key.replace(/ToolCall$/, '')
            action_name = raw_name
              .replace(/([A-Z])/g, ' $1')
              .toLowerCase()
              .trim()
          }

          if (action_name) {
            if (action_name === last_action_name) {
              action_count++
            } else {
              last_action_name = action_name
              action_count = 1
            }
            report_progress(`${action_name}${get_progress_dots(action_count)}`)
          }
        }
      }
    } else if (parsed.type == 'result' && parsed.result) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || parsed.result.response || ''
      }
    } else if (parsed.result) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || parsed.result.response || ''
      }
    } else if (parsed.type == 'assistant' && parsed.message) {
      const is_delta = parsed.timestamp_ms && !parsed.model_call_id
      if (!is_delta) {
        last_action_name = ''
        action_count = 0
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
    last_action_name = ''
    action_count = 0
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
