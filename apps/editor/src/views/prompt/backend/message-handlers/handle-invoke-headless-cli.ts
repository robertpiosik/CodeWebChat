import * as vscode from 'vscode'
import { t } from '@/i18n'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { invoke_headless_cli } from '@/utils/headless-cli-invocation'
import { build_cli_prompt } from './utils/build-cli-prompt'

const LAST_USED_HEADLESS_CLI_AGENT_STATE_KEY =
  'last_used_headless_cli_agent_state_key'
const LAST_SELECTED_WORKSPACE_IN_HEADLESS_CLI_STATE_KEY =
  'last_selected_workspace_in_headless_cli_state_key'

export const handle_invoke_headless_cli = async (
  prompt_view_provider: PromptViewProvider
): Promise<void> => {
  const current_instructions = prompt_view_provider.current_instructions.trim()

  if (!current_instructions) {
    vscode.window.showInformationMessage(
      t('views.common.handlers.common.instructions-cannot-be-empty')
    )
    return
  }

  const result = await invoke_headless_cli({
    workspace_provider: prompt_view_provider.workspace_provider,
    extension_context: prompt_view_provider.extension_context,
    title: t('views.prompt.handlers.handle-invoke-headless-cli.title'),
    waiting_message: t('utils.headless-cli-invocation.agent.waiting-for-agent'),
    last_used_agent_state_key: LAST_USED_HEADLESS_CLI_AGENT_STATE_KEY,
    last_selected_workspace_state_key:
      LAST_SELECTED_WORKSPACE_IN_HEADLESS_CLI_STATE_KEY,
    config_key_prefix: 'headlessCli',
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

  if (agent_output && prompt_view_provider.cli_prompt_type === 'edit-files') {
    vscode.commands.executeCommand('codeWebChat.applyResponse', {
      response: agent_output,
      raw_instructions: current_instructions,
      edit_format: prompt_view_provider.edit_format
    })
  }
}
