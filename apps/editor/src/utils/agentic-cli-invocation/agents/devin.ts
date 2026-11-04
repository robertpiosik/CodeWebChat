import { CodingAgent } from '../types'
import { check_command_exists } from '../utils/check-command-exists'
import { AGENTS } from '../../../constants/agents'

const agent_name = 'Devin'

export const devin_agent: CodingAgent = {
  id: 'devin',
  label: agent_name,
  cmd: 'devin',
  is_installed: () => check_command_exists('devin'),
  get_documentation_url: () => AGENTS[agent_name].docs_url,
  get_isolated_dir_args: () => [
    '--print',
    '--respect-workspace-trust',
    'false'
  ],
  get_integrated_terminal_args: () => [],
  get_prompt_file_args: (temp_prompt_path: string) => [
    '--prompt-file',
    temp_prompt_path
  ]
}
