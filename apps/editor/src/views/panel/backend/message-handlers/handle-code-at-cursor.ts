import * as vscode from 'vscode'
import axios from 'axios'
import { code_at_cursor_instructions_for_panel } from '@/constants/instructions'
import { FilesCollector } from '@/utils/files-collector'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { PROVIDERS } from '@shared/constants/providers'
import { RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { CodeAtCursorMessage } from '@/views/panel/types/messages'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { dictionary } from '@shared/constants/dictionary'
import { randomUUID } from 'crypto'
import { replace_selection_symbol } from '../utils/replace-selection-symbol'
import {
  replace_changes_symbol,
  replace_commit_symbol,
  replace_context_at_commit_symbol
} from '../utils/replace-git-symbols'
import { replace_saved_context_symbol } from '@/views/panel/backend/utils/replace-saved-context-symbol'
import { replace_skill_symbol } from '../utils/replace-skill-symbol'
import { replace_image_symbol } from '../utils/replace-image-symbol'
import { replace_document_symbol } from '../utils/replace-document-symbol'
import { replace_website_symbol } from '../utils/replace-website-symbol'

const get_code_at_cursor_config = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  config_id?: string
): Promise<{ provider: any; config: any } | undefined> => {
  const code_completions_configs =
    await api_providers_manager.get_code_completions_tool_configs()

  if (code_completions_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_AT_CURSOR_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (config_id !== undefined) {
    selected_config =
      code_completions_configs.find(
        (c) => get_tool_config_id(c) == config_id
      ) || null
    if (selected_config && panel_provider) {
      panel_provider.send_message({
        command: 'SELECTED_CONFIGURATION_CHANGED',
        prompt_type: 'code-at-cursor',
        id: config_id
      })
    }
  } else if (!show_quick_pick) {
    const recents = context.workspaceState.get<string[]>(
      RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]
    if (last_selected_id) {
      selected_config =
        code_completions_configs.find(
          (c) => get_tool_config_id(c) === last_selected_id
        ) || null
    }

    if (!selected_config && code_completions_configs.length > 0) {
      selected_config = code_completions_configs[0]
    }
  }

  if (!selected_config || show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      code_completions_configs.forEach((config) => {
        const id = get_tool_config_id(config)
        if (recent_ids.includes(id)) {
          matched_recent_configs.push(config)
        } else {
          remaining_configs.push(config)
        }
      })

      matched_recent_configs.sort((a, b) => {
        const idA = get_tool_config_id(a)
        const idB = get_tool_config_id(b)
        return recent_ids.indexOf(idA) - recent_ids.indexOf(idB)
      })

      const recent_configs = matched_recent_configs
      const other_configs = remaining_configs

      const map_config_to_item = (config: ToolConfig) => {
        const description_parts = [config.provider_name]
        if (config.temperature != null) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }

        const buttons: vscode.QuickInputButton[] = []

        return {
          label: config.model,
          description: description_parts.join(' · '),
          buttons,
          config,
          id: get_tool_config_id(config)
        }
      }

      const items: (vscode.QuickPickItem & {
        config?: ToolConfig
        id?: string
      })[] = []

      if (recent_configs.length > 0) {
        items.push({
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...recent_configs.map(map_config_to_item))
      }

      if (other_configs.length > 0) {
        if (recent_configs.length > 0) {
          items.push({
            label: 'other configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...other_configs.map(map_config_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_items()
    quick_pick.placeholder = 'Select code completions configuration'
    quick_pick.matchOnDescription = true

    const items = quick_pick.items as (vscode.QuickPickItem & { id: string })[]
    if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind != vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected || !selected.config) {
            resolve(undefined)
            return
          }

          let recents =
            context.workspaceState.get<string[]>(
              RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [selected.id, ...recents.filter((id) => id != selected.id)]
          context.workspaceState.update(
            RECENTLY_USED_CODE_AT_CURSOR_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (panel_provider) {
            panel_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              prompt_type: 'code-at-cursor',
              id: selected.id
            })
          }

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            provider,
            config: selected.config
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (panel_provider) {
            panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })
          }
          resolve(undefined)
        })

        quick_pick.show()
      }
    )
  }

  const provider = await api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_code_at_cursor_config',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

export const handle_code_at_cursor = async (
  panel_provider: PanelProvider,
  message: CodeAtCursorMessage
): Promise<void> => {
  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )
  const completion_instructions =
    panel_provider.current_code_at_cursor_instruction

  const config_result = await get_code_at_cursor_config(
    api_providers_manager,
    message.use_quick_pick,
    panel_provider.context,
    panel_provider,
    message.config_id
  )

  if (!config_result) {
    return
  }

  const { provider, config: code_completions_config } = config_result

  if (!code_completions_config.provider_name) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_config.model) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
    )
    Logger.warn({
      function_name: 'handle_code_at_cursor',
      message: 'Model is not specified for Code Completions tool.'
    })
    return
  }

  let endpoint_url = ''
  if (provider.type == 'built-in') {
    const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
    if (!provider_info) {
      vscode.window.showErrorMessage(
        dictionary.error_message.BUILT_IN_PROVIDER_NOT_FOUND(provider.name)
      )
      Logger.warn({
        function_name: 'handle_code_at_cursor',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  const editor = vscode.window.activeTextEditor
  if (editor) {
    await editor.document.save()

    if (!editor.selection.isEmpty) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.CODE_AT_CURSOR_NO_SELECTION
      )
      return
    }
    const document = editor.document
    const position = editor.selection.active

    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const relative_path = vscode.workspace.asRelativePath(document.uri)
    const main_instructions = code_at_cursor_instructions_for_panel({
      file_path: relative_path,
      row: position.line,
      column: position.character
    })

    let processed_completion_instructions = completion_instructions
    let skill_definitions = ''

    if (processed_completion_instructions.includes('#Selection')) {
      processed_completion_instructions = replace_selection_symbol(
        processed_completion_instructions
      )
    }

    if (processed_completion_instructions.includes('#Changes(')) {
      const result = await replace_changes_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.changes_definitions
    }

    if (processed_completion_instructions.includes('#Commit(')) {
      const result = await replace_commit_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.commit_definitions
    }

    if (processed_completion_instructions.includes('#ContextAtCommit(')) {
      processed_completion_instructions =
        await replace_context_at_commit_symbol({
          instruction: processed_completion_instructions,
          workspace_provider: panel_provider.workspace_provider
        })
    }

    if (processed_completion_instructions.includes('#SavedContext(')) {
      const result = await replace_saved_context_symbol({
        instruction: processed_completion_instructions,
        context: panel_provider.context,
        workspace_provider: panel_provider.workspace_provider
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.context_definitions
    }

    if (processed_completion_instructions.includes('#Skill(')) {
      const result = await replace_skill_symbol({
        instruction: processed_completion_instructions
      })
      processed_completion_instructions = result.instruction
      skill_definitions += result.skill_definitions
    }

    if (processed_completion_instructions.includes('#Image(')) {
      processed_completion_instructions = await replace_image_symbol({
        instruction: processed_completion_instructions
      })
    }

    if (processed_completion_instructions.includes('#Document(')) {
      processed_completion_instructions = await replace_document_symbol({
        instruction: processed_completion_instructions
      })
    }

    if (processed_completion_instructions.includes('#Website(')) {
      processed_completion_instructions = await replace_website_symbol({
        instruction: processed_completion_instructions
      })
    }

    const files_collector = new FilesCollector({
      workspace_provider: panel_provider.workspace_provider,
      open_editors_provider: panel_provider.open_editors_provider
    })

    const context_text = await files_collector.collect_files()

    const payload = {
      before: `<files>\n${context_text}<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const content = `${payload.before}${
      processed_completion_instructions
        ? `<missing_text>${processed_completion_instructions}</missing_text>`
        : '<missing_text>'
    }${payload.after}\n${skill_definitions}${main_instructions}`

    let user_content: any = content

    if (content.includes('<cwc-image>')) {
      user_content = []
      const parts = content.split(/<cwc-image>([\s\S]*?)<\/cwc-image>/)

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (i % 2 == 0) {
          if (part.length > 0) {
            user_content.push({ type: 'text', text: part.trim() })
          }
        } else {
          user_content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${part}`
            }
          })
        }
      }
    }

    const messages = [
      {
        role: 'user',
        content: user_content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: code_completions_config.model,
      temperature: code_completions_config.temperature
    }

    apply_reasoning_effort({
      body,
      provider,
      reasoning_effort: code_completions_config.reasoning_effort
    })

    let error_occurred = false

    const promises = Array.from({ length: message.invocation_count }).map(
      async () => {
        const request_id = randomUUID()

        try {
          const result = await panel_provider.api_manager.get({
            endpoint_url,
            api_key: provider.api_key,
            body,
            request_id,
            provider_name: code_completions_config.provider_name,
            model: code_completions_config.model,
            reasoning_effort: code_completions_config.reasoning_effort
          })

          if (result) {
            await vscode.commands.executeCommand(
              'codeWebChat.applyChatResponse',
              {
                response: result.response,
                raw_instructions: processed_completion_instructions,
                original_editor_state: {
                  file_path: document.uri.fsPath,
                  position: {
                    line: position.line,
                    character: position.character
                  }
                }
              }
            )
          }
        } catch (err: any) {
          if (axios.isCancel(err)) {
            return
          }
          Logger.error({
            function_name: 'handle_code_at_cursor',
            message: 'code completion error',
            data: err
          })
          if (!error_occurred) {
            vscode.window.showErrorMessage(
              dictionary.error_message.CODE_COMPLETION_ERROR
            )
            error_occurred = true
          }
        }
      }
    )

    await Promise.all(promises)
  } else {
    vscode.window.showWarningMessage(dictionary.warning_message.NO_EDITOR_OPEN)
  }
}
