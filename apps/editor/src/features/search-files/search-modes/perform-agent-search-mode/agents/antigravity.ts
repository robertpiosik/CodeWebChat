import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

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
      if (step.step_type == 'tool') {
        const tool_name = step.tool_name || step.tool_info?.name
        if (tool_name) {
          let msg = tool_name
          const params = step.tool_info?.parameters

          if (params) {
            const formatted_name = tool_name.toLowerCase()
            
            if (
              (formatted_name.includes('run') ||
                formatted_name.includes('command') ||
                formatted_name.includes('bash')) &&
              (params.CommandLine || params.command || params.cmd)
            ) {
              msg = params.CommandLine || params.command || params.cmd
            } else if (formatted_name.includes('read') && params.path) {
              msg = params.path
            } else if (
              (formatted_name.includes('write') || formatted_name.includes('edit')) &&
              params.path
            ) {
              msg = params.path
            } else if (formatted_name.includes('list') && params.path) {
              msg = params.path
            } else if (
              (formatted_name.includes('search') ||
                formatted_name.includes('find') ||
                formatted_name.includes('grep')) &&
              (params.query || params.pattern || params.description || params.keyword)
            ) {
              msg = params.query || params.pattern || params.description || params.keyword
            } else if (params.path) {
              msg = params.path
            } else if (params.command || params.cmd || params.CommandLine) {
              msg = params.command || params.cmd || params.CommandLine
            }
          }

          report_progress(msg)
        }
      } else if (step.subagent_info?.subagents?.length > 0) {
        const subagent = step.subagent_info.subagents[0]
        report_progress(subagent.role || subagent.type_name)
      }
    } else if (parsed.event == 'result' && parsed.result) {
      return { output: parsed.result.response || '' }
    }
  },
  parse_final_output: (parsed, current_output) => {
    if (parsed.event == 'result' && parsed.result) {
      return parsed.result.response || ''
    } else if (parsed.response) {
      return parsed.response || ''
    }
    return current_output
  }
}
