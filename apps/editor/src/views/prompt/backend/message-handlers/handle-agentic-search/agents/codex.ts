import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists, get_progress_dots } from '../utils'

let last_action_name = ''
let action_count = 0

export const codex_agent: CodingAgent = {
  id: 'codex',
  label: 'Codex',
  cmd: 'codex',
  is_installed: () => check_command_exists('codex'),
  get_documentation_url: () =>
    'https://learn.chatgpt.com/docs/non-interactive-mode',
  get_args: (query: string) => ['exec', build_agent_prompt(query), '--json'],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'item.started' && parsed.item) {
      const item = parsed.item
      let action_name = ''

      if (item.type == 'command_execution' && item.command) {
        const cmd = item.command
        if (
          cmd.includes('rg --files') ||
          cmd.includes('find ') ||
          cmd.includes('fd ')
        ) {
          action_name = 'search files'
        } else if (cmd.includes('rg ') || cmd.includes('grep ')) {
          action_name = 'search in files'
        } else if (
          cmd.includes('sed ') ||
          cmd.includes('cat ') ||
          cmd.includes('head ') ||
          cmd.includes('tail ')
        ) {
          action_name = 'read file'
        } else if (cmd.includes('ls ')) {
          action_name = 'list files'
        } else {
          action_name = 'run command'
        }
      } else if (item.type) {
        action_name = item.type.replace(/_/g, ' ')
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
    } else if (parsed.type == 'item.completed' && parsed.item) {
      if (parsed.item.type == 'agent_message' && parsed.item.text) {
        last_action_name = ''
        action_count = 0
        return { output: parsed.item.text }
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    last_action_name = ''
    action_count = 0
    if (
      parsed.type == 'item.completed' &&
      parsed.item?.type == 'agent_message' &&
      parsed.item.text
    ) {
      return parsed.item.text
    }
    return current_output
  }
}
