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
    vscode.window.showInformationMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
    )
    return
  }

  const prompt_type = prompt_view_provider.cli_prompt_type
  const last_used_key = get_last_used_cli_configuration_key(prompt_type)
  const last_used_agent_config_name =
    prompt_view_provider.extension_context.workspaceState.get<string>(
      last_used_key
    ) ??
    prompt_view_provider.extension_context.globalState.get<string>(
      last_used_key
    )

  const result = await invoke_agentic_cli({
    workspace_provider: prompt_view_provider.workspace_provider,
    extension_context: prompt_view_provider.extension_context,
    title: t('views.prompt.handlers.handle-invoke-agentic-cli.title'),
    waiting_message: t('utils.agentic-cli-invocation.agent.waiting-for-agent'),
    last_used_agent_config_name,
    last_selected_workspace_state_key:
      LAST_SELECTED_WORKSPACE_IN_AGENTIC_CLI_STATE_KEY,
    panel_prompt_type: prompt_type,
    cli_configuration_name: message.cli_configuration_name,
    use_quick_pick: message.use_quick_pick,
    on_agent_selected: (name: string) => {
      prompt_view_provider.extension_context.workspaceState.update(
        last_used_key,
        name
      )
      prompt_view_provider.extension_context.globalState.update(
        last_used_key,
        name
      )

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

  if (agent_output && prompt_view_provider.cli_prompt_type == 'edit-files') {
    vscode.commands.executeCommand('codeWebChat.applyResponse', {
      response: agent_output,
      raw_instructions: current_instructions,
      edit_format: prompt_view_provider.edit_format
    })
  }
}
