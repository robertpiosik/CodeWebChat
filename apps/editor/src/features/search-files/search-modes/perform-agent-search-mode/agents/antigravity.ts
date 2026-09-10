import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

let last_action_name = ''
let action_count = 0

export const antigravity_agent: CodingAgent = {
  id: 'antigravity',
  label: 'Antigravity',
  cmd: 'agy',
  is_installed: () => check_command_exists('agy'),
  get_documentation_url: () => 'https://antigravity.google/docs/cli/headless/',
  get_args: (query: string) => [
    '-p',
    build_agent_prompt(query),
    '--output-format',
    'stream-json',
    '--dangerously-skip-permissions'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.event == 'step_update' && parsed.step_update) {
      const step = parsed.step_update
      let action_name = ''
      let has_dots = false

      if (step.step_type == 'tool') {
        if (step.tool_name) {
          action_name = step.tool_name.replace(/_/g, ' ')
          has_dots = true
        }
      } else if (step.subagent_info?.subagents?.length > 0) {
        const subagent = step.subagent_info.subagents[0]
        action_name = subagent.role || subagent.type_name
      }

      if (action_name) {
        if (action_name === last_action_name) {
          action_count++
        } else {
          last_action_name = action_name
          action_count = 1
        }
        const extra_dots =
          action_count > 1
            ? (has_dots ? ' ' : '') + '.'.repeat(action_count - 1)
            : ''
        report_progress(`${action_name}${has_dots ? '...' : ''}${extra_dots}`)
      }
    } else if (parsed.event == 'result' && parsed.result) {
      last_action_name = ''
      action_count = 0
      return { output: parsed.result.response || '' }
    }
  },
  parse_final_output: (parsed, current_output) => {
    last_action_name = ''
    action_count = 0
    if (parsed.event == 'result' && parsed.result) {
      return parsed.result.response || ''
    } else if (parsed.response) {
      return parsed.response || ''
    }
    return current_output
  }
}
