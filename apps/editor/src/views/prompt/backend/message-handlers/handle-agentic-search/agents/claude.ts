import { CodingAgent } from '../types'
import {
  build_agent_prompt,
  check_command_exists,
  get_progress_dots
} from '../utils'

let last_action_name = ''
let action_count = 0

const report_tool_progress = (
  tool_name: string,
  report_progress: (msg: string) => void
) => {
  const action_name = tool_name.replace(/_/g, ' ').toLowerCase()

  if (action_name === last_action_name) {
    action_count++
  } else {
    last_action_name = action_name
    action_count = 1
  }

  report_progress(`${action_name}${get_progress_dots(action_count)}`)
}

export const claude_agent: CodingAgent = {
  id: 'claude',
  label: 'Claude Code',
  cmd: 'claude',
  is_installed: () => check_command_exists('claude'),
  get_documentation_url: () => 'https://code.claude.com/docs/en/headless',
  get_args: (query: string) => [
    '-p',
    build_agent_prompt(query),
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode',
    'auto'
  ],
  parse_stream_line: (parsed, report_progress) => {
    if (parsed.type == 'stream_event' && parsed.event) {
      if (
        parsed.event.type == 'content_block_start' &&
        parsed.event.content_block?.type == 'tool_use'
      ) {
        const tool = parsed.event.content_block
        if (tool.name) {
          report_tool_progress(tool.name, report_progress)
        }
      }
    } else if (parsed.type == 'assistant' && parsed.message?.content) {
      const content = Array.isArray(parsed.message.content)
        ? parsed.message.content
        : []

      for (const block of content) {
        if (block?.type == 'tool_use' && block.name) {
          report_tool_progress(block.name, report_progress)
        }
      }
    } else if (parsed.type == 'result' && parsed.result) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    } else if (parsed.result) {
      last_action_name = ''
      action_count = 0
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
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
    } else if (parsed.result) {
      return typeof parsed.result == 'string'
        ? parsed.result
        : parsed.result.text || ''
    }
    return current_output
  }
}
