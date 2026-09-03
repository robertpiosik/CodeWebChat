import { agentic_file_search_instructions } from '@/constants/instructions'
import { CodingAgent } from '../types'
import { check_command_exists } from '../utils'

export const antigravity_agent: CodingAgent = {
  id: 'antigravity',
  label: 'Antigravity',
  cmd: 'agy',
  executable: 'agy',
  is_installed: () => check_command_exists('agy'),
  get_documentation_url: () => 'https://antigravity.google/docs/cli/headless/',
  get_args: (query: string) => [
    '-p',
    `${agentic_file_search_instructions}\n\n${query}`,
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
          let msg = `Using ${tool_name.replace(/_/g, ' ')}...`
          const params = step.tool_info?.parameters

          if (params) {
            if (
              tool_name == 'run_command' &&
              (params.CommandLine || params.command)
            ) {
              msg = `Running: ${params.CommandLine || params.command}`
            } else if (tool_name == 'read_file' && params.path) {
              msg = `Reading: ${params.path}`
            } else if (
              (tool_name == 'write_file' || tool_name == 'write_to_file') &&
              params.path
            ) {
              msg = `Writing: ${params.path}`
            } else if (tool_name == 'list_directory' && params.path) {
              msg = `Listing: ${params.path}`
            } else if (
              tool_name == 'search_files' &&
              (params.query || params.pattern)
            ) {
              msg = `Searching: ${params.query || params.pattern}`
            }
          }

          if (msg.length > 60) {
            msg = msg.substring(0, 57) + '...'
          }
          report_progress(msg)
        }
      } else if (step.subagent_info?.subagents?.length > 0) {
        const subagent = step.subagent_info.subagents[0]
        report_progress(
          `Delegating to ${subagent.role || subagent.type_name}...`
        )
      } else if (step.step_type == 'agent_response') {
        report_progress('Synthesizing results...')
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
