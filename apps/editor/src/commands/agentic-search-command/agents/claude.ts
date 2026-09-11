import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

const report_tool_progress = (
  tool_name: string,
  input: any,
  report_progress: (msg: string) => void
) => {
  const formatted_name = tool_name.toLowerCase()
  let msg: string | undefined

  if (
    formatted_name.includes('bash') ||
    formatted_name.includes('command') ||
    formatted_name.includes('run')
  ) {
    msg = input?.command || input?.cmd || input?.CommandLine
  } else if (
    formatted_name.includes('read') ||
    formatted_name.includes('write') ||
    formatted_name.includes('edit') ||
    formatted_name.includes('list')
  ) {
    msg = input?.file_path || input?.path
  } else if (
    formatted_name.includes('grep') ||
    formatted_name.includes('search') ||
    formatted_name.includes('find')
  ) {
    msg = input?.pattern || input?.query
  } else {
    msg = input?.file_path || input?.path || tool_name
  }

  if (msg) {
    report_progress(msg)
  }
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
          report_tool_progress(tool.name, tool.input, report_progress)
        }
      }
    } else if (parsed.type == 'assistant' && parsed.message?.content) {
      const content = Array.isArray(parsed.message.content)
        ? parsed.message.content
        : []

      for (const block of content) {
        if (block?.type == 'tool_use' && block.name) {
          report_tool_progress(block.name, block.input, report_progress)
        }
      }
    } else if (parsed.type == 'result' && parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    } else if (parsed.result) {
      return {
        output:
          typeof parsed.result == 'string'
            ? parsed.result
            : parsed.result.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
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
