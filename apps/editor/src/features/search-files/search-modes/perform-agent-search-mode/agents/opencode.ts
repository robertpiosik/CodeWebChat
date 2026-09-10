import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

let last_action_name = ''
let action_count = 0

export const opencode_agent: CodingAgent = {
  id: 'opencode',
  label: 'OpenCode',
  cmd: 'opencode',
  is_installed: () => check_command_exists('opencode'),
  get_documentation_url: () => 'https://opencode.ai/docs/cli/',
  get_args: (query: string) => [
    'run',
    build_agent_prompt(query),
    '--format',
    'json',
    '--auto'
  ],
  parse_stream_line: (parsed, report_progress) => {
    let action_name = ''
    if (parsed.type == 'tool_use' && parsed.part?.tool) {
      action_name = parsed.part.tool
    } else if (parsed.type == 'tool_call' && parsed.tool) {
      action_name = parsed.tool
    }

    if (action_name) {
      action_name = action_name.replace(/_/g, ' ')
      if (action_name === last_action_name) {
        action_count++
      } else {
        last_action_name = action_name
        action_count = 1
      }
      const extra_dots = action_count > 1 ? '.'.repeat(action_count - 1) : ''
      report_progress(`${action_name}...${extra_dots}`)
    } else if (parsed.type == 'result' && parsed.result) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    } else if (parsed.type == 'text' && parsed.part?.text) {
      last_action_name = ''
      action_count = 0
      return { output: parsed.part.text }
    } else if (parsed.text) {
      last_action_name = ''
      action_count = 0
      return { output: parsed.text }
    } else if (parsed.output) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.output == 'string'
            ? parsed.output
            : parsed.output.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    last_action_name = ''
    action_count = 0
    if (parsed.type == 'result' && parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || ''
    } else if (parsed.type == 'text' && parsed.part?.text) {
      return parsed.part.text
    } else if (parsed.text) {
      return parsed.text
    } else if (parsed.output) {
      return typeof parsed.output == 'string'
        ? parsed.output
        : parsed.output.text || ''
    }
    return current_output
  }
}
