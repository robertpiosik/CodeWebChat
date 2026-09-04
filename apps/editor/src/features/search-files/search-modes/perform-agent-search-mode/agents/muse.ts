import { CodingAgent } from '../types'
import { build_agent_prompt, check_command_exists } from '../utils'

let accumulated_output = ''

export const muse_agent: CodingAgent = {
  id: 'muse',
  label: 'Muse Code',
  cmd: 'muse',
  is_installed: () => check_command_exists('muse'),
  get_documentation_url: () => 'https://dev.meta.ai/docs/muse-code/extending#headless',
  get_args: (query: string) => {
    accumulated_output = ''
    return [
      'exec',
      '--json',
      '--yolo',
      build_agent_prompt(query)
    ]
  },
  parse_stream_line: (parsed, report_progress) => {
    const payload = parsed.payload || parsed

    if (
      parsed.type === 'tool.result' ||
      parsed.type === 'tool_call' ||
      payload.type === 'tool_call'
    ) {
      const tool = payload.tool_name || payload.tool || payload.name
      if (tool) report_progress(typeof tool === 'string' ? tool : JSON.stringify(tool))
    } else if (
      parsed.type === 'status' ||
      payload.type === 'status' ||
      parsed.type === 'run.model.configured'
    ) {
      const msg = payload.message || payload.status || parsed.type
      if (msg) report_progress(msg)
    } else if (payload.tool) {
      report_progress(payload.tool.name || payload.tool)
    }

    if (parsed.type === 'streamed' || payload.type === 'streamed') {
      if (payload.text) {
        accumulated_output += payload.text
        return { output: accumulated_output }
      }
    } else if (parsed.type === 'result' || payload.type === 'result') {
      const res = payload.result || payload
      if (res) {
        return {
          output: typeof res === 'string' ? res : res.text || res.response || ''
        }
      }
    }

    if (payload.text && typeof payload.text === 'string') {
      return { output: payload.text }
    } else if (payload.output) {
      return {
        output:
          typeof payload.output === 'string'
            ? payload.output
            : payload.output.text || ''
      }
    }
  },
  parse_final_output: (parsed, current_output) => {
    const payload = parsed.payload || parsed
    if (parsed.type === 'result' || payload.type === 'result') {
      const res = payload.result || payload
      if (res) {
        return typeof res === 'string' ? res : res.text || res.response || ''
      }
    } else if (payload.text) {
      return payload.text
    } else if (payload.output) {
      return typeof payload.output === 'string'
        ? payload.output
        : payload.output.text || ''
    }
    return current_output || accumulated_output
  }
}