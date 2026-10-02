import * as vscode from 'vscode'
import { t } from '@/i18n'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { invoke_agentic_cli } from '@/utils/agentic-cli-invocation'
import { build_cli_prompt } from './utils/build-cli-prompt'
import {
  get_last_used_cli_configuration_key,
  LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY
} from '@/constants/state-keys'
import { InvokeAgenticCliMessage } from '@/views/prompt/types/messages'

export const handle_invoke_agentic_cli = async (
  prompt_view_provider: PromptViewProvider,
  message: InvokeAgenticCliMessage
): Promise<void> => {
  const current_instructions = prompt_view_provider.current_instructions.trim()

  if (!current_instructions) {
    vscode.window.showWarningMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
    )
    return
  }

  if (
    prompt_view_provider.cli_prompt_type == 'edit' &&
    !prompt_view_provider.workspace_provider.get_selected_files().length
  ) {
    vscode.window.showWarningMessage(
      t('views.common.handlers.common.context-cannot-be-empty')
    )
    return
  }

  const prompt_type = prompt_view_provider.cli_prompt_type
  const last_used_key = get_last_used_cli_configuration_key(prompt_type)

  const result = await invoke_agentic_cli({
    workspace_provider: prompt_view_provider.workspace_provider,
    extension_context: prompt_view_provider.extension_context,
    notification_title: t(
      'views.prompt.handlers.handle-invoke-agentic-cli.title'
    ),
    agent_state_key: last_used_key,
    last_selected_workspace_state_key:
      LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY,
    isolate_in_temp_dir: true,
    copy_selected_files: prompt_type == 'edit',
    generate_diff_for_temp_dir: prompt_type == 'edit',
    execution_mode: prompt_type == 'edit' ? 'headless' : 'interactive-terminal',
    cli_configuration_name: message.cli_configuration_name,
    use_quick_pick: message.use_quick_pick,
    on_agent_selected: (name: string) => {
      prompt_view_provider.send_message({
        command: 'SELECTED_CLI_CONFIGURATION_CHANGED',
        prompt_type,
        name
      })
    },
    build_prompt: async (selected_root: string) => {
      return build_cli_prompt({
        prompt_view_provider,
        selected_root
      })
    }
  })

  if (!result || result === 'back') {
    return
  }

  const { agent_output } = result

  if (agent_output && prompt_view_provider.cli_prompt_type == 'edit') {
    vscode.commands.executeCommand('codeWebChat.applyResponse', {
      response: agent_output,
      raw_instructions: current_instructions
    })
  }
}
