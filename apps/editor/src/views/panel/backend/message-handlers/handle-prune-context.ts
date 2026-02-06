import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import {
  ModelProvidersManager,
  get_tool_config_id,
  Provider,
  ToolConfig
} from '@/services/model-providers-manager'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY } from '@/constants/state-keys'
import {
  replace_changes_symbol,
  replace_commit_symbol,
  replace_context_at_commit_symbol
} from '@/views/panel/backend/utils/replace-git-symbols'
import { replace_saved_context_symbol } from '@/views/panel/backend/utils/replace-saved-context-symbol'
import { replace_selection_symbol } from '@/views/panel/backend/utils/replace-selection-symbol'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { replace_skill_symbol } from '@/views/panel/backend/utils/replace-skill-symbol'
import { replace_image_symbol } from '@/views/panel/backend/utils/replace-image-symbol'
import { replace_document_symbol } from '@/views/panel/backend/utils/replace-document-symbol'
import { replace_website_symbol } from '@/views/panel/backend/utils/replace-website-symbol'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { PruneContextMessage } from '@/views/panel/types/messages'
import { dictionary } from '@shared/constants/dictionary'
import {
  prune_context_instructions_prefix,
  prune_context_format
} from '@/constants/instructions'

const get_prune_context_config = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  panel_provider: PanelProvider,
  config_id?: string
): Promise<{ provider: Provider; config: ToolConfig } | undefined> => {
  const prune_context_configs =
    await api_providers_manager.get_prune_context_tool_configs()

  if (prune_context_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_PRUNE_CONTEXT_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (config_id !== undefined) {
    selected_config =
      prune_context_configs.find((c) => get_tool_config_id(c) == config_id) ||
      null
    if (selected_config) {
      let recents =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || []
      recents = [config_id, ...recents.filter((id) => id != config_id)]
      context.workspaceState.update(
        RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY,
        recents
      )

      if (panel_provider) {
        panel_provider.send_message({
          command: 'SELECTED_CONFIGURATION_CHANGED',
          prompt_type: 'prune-context',
          id: config_id
        })
      }
    }
  } else if (!show_quick_pick) {
    const recents = context.workspaceState.get<string[]>(
      RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]

    if (last_selected_id) {
      selected_config =
        prune_context_configs.find(
          (c) => get_tool_config_id(c) == last_selected_id
        ) || null
    }
  }

  if (!selected_config || show_quick_pick) {
    type Item = vscode.QuickPickItem & {
      config?: ToolConfig
      id?: string
    }
    const create_items = async (): Promise<Item[]> => {
      const recent_ids =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      prune_context_configs.forEach((config) => {
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

      const items: Item[] = []

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

    const quick_pick = vscode.window.createQuickPick<Item>()
    quick_pick.items = await create_items()
    quick_pick.placeholder = 'Select configuration'
    quick_pick.matchOnDescription = true

    const recents = context.workspaceState.get<string[]>(
      RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]
    const items = quick_pick.items
    const last_selected_item = items.find((item) => item.id == last_selected_id)

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    } else if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind != vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ provider: Provider; config: ToolConfig } | undefined>(
      (resolve) => {
        let accepted = false

        quick_pick.onDidAccept(async () => {
          accepted = true
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()

          if (!selected || !selected.config) {
            resolve(undefined)
            return
          }

          let recents =
            context.workspaceState.get<string[]>(
              RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY
            ) || []
          recents = [
            selected.id!,
            ...recents.filter((id) => id !== selected.id)
          ]
          context.workspaceState.update(
            RECENTLY_USED_PRUNE_CONTEXT_CONFIG_IDS_STATE_KEY,
            recents
          )

          if (panel_provider) {
            panel_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              prompt_type: 'prune-context',
              id: selected.id!
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
          if (!accepted) {
            resolve(undefined)
          }
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
      function_name: 'get_prune_context_config',
      message: 'API provider not found for Prune Context tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

export const handle_prune_context = async (
  panel_provider: PanelProvider,
  message: PruneContextMessage
): Promise<void> => {
  await vscode.workspace.saveAll()

  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )

  const editor = vscode.window.activeTextEditor

  const files_collector = new FilesCollector(
    panel_provider.workspace_provider,
    panel_provider.open_editors_provider
  )

  let instructions = panel_provider.prune_context_instructions

  if (!instructions) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.INSTRUCTIONS_CANNOT_BE_EMPTY
    )
    return
  }

  const has_selection =
    !!editor && !editor.selection.isEmpty && instructions.includes('#Selection')

  if (has_selection) {
    instructions = replace_selection_symbol(instructions)
  }

  let processed_instructions = instructions
  let skill_definitions = ''

  if (processed_instructions.includes('#Changes(')) {
    const result = await replace_changes_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.changes_definitions
  }

  if (processed_instructions.includes('#Commit(')) {
    const result = await replace_commit_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.commit_definitions
  }

  if (processed_instructions.includes('#ContextAtCommit(')) {
    processed_instructions = await replace_context_at_commit_symbol({
      instruction: processed_instructions,
      workspace_provider: panel_provider.workspace_provider
    })
  }

  if (processed_instructions.includes('#SavedContext(')) {
    const result = await replace_saved_context_symbol({
      instruction: processed_instructions,
      context: panel_provider.context,
      workspace_provider: panel_provider.workspace_provider
    })
    processed_instructions = result.instruction
    skill_definitions += result.context_definitions
  }

  if (processed_instructions.includes('#Skill(')) {
    const result = await replace_skill_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.skill_definitions
  }

  if (processed_instructions.includes('#Image(')) {
    processed_instructions = await replace_image_symbol({
      instruction: processed_instructions
    })
  }

  if (processed_instructions.includes('#Document(')) {
    processed_instructions = await replace_document_symbol({
      instruction: processed_instructions
    })
  }

  if (processed_instructions.includes('#Website(')) {
    processed_instructions = await replace_website_symbol({
      instruction: processed_instructions
    })
  }

  const collected_files = await files_collector.collect_files({
    compact: true
  })

  if (!collected_files) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.CONTEXT_CANNOT_BE_EMPTY
    )
    return
  }

  let current_config_id = message.config_id
  let should_show_quick_pick = message.use_quick_pick

  while (true) {
    const config_result = await get_prune_context_config(
      api_providers_manager,
      should_show_quick_pick,
      panel_provider.context,
      panel_provider,
      current_config_id
    )

    if (!config_result) {
      return
    }

    panel_provider.send_message({ command: 'FOCUS_PROMPT_FIELD' })

    const { provider, config: prune_context_config } = config_result

    let endpoint_url = ''
    if (provider.type == 'built-in') {
      const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
      if (!provider_info) {
        vscode.window.showErrorMessage(
          dictionary.error_message.BUILT_IN_PROVIDER_NOT_FOUND(provider.name)
        )
        Logger.warn({
          function_name: 'handle_prune_context',
          message: `Built-in provider "${provider.name}" not found.`
        })
        should_show_quick_pick = true
        current_config_id = undefined
        continue
      }
      endpoint_url = provider_info.base_url
    } else {
      endpoint_url = provider.base_url
    }

    const files = `<files>${collected_files}\n</files>`

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const config_prune_instructions_prefix = config.get<string>(
      'pruneContextInstructionsPrefix'
    )
    const instructions_to_use =
      config_prune_instructions_prefix || prune_context_instructions_prefix
    const system_instructions_xml = `${instructions_to_use}\n${prune_context_format}`

    const content = `${system_instructions_xml}\n${skill_definitions}${files}\n${system_instructions_xml}\n${processed_instructions}`

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
      model: prune_context_config.model,
      temperature: prune_context_config.temperature
    }

    apply_reasoning_effort(
      body,
      provider,
      prune_context_config.reasoning_effort
    )

    try {
      const result = await panel_provider.api_manager.get({
        endpoint_url,
        api_key: provider.api_key,
        body,
        provider_name: prune_context_config.provider_name,
        model: prune_context_config.model,
        reasoning_effort: prune_context_config.reasoning_effort
      })

      if (result) {
        vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
          response: result.response,
          raw_instructions: instructions
        })
        return
      }
    } catch (error) {
      if (axios.isCancel(error)) {
        return
      }
      Logger.error({
        function_name: 'handle_prune_context',
        message: 'prune context task error',
        data: error
      })
      vscode.window.showErrorMessage(
        'Prune context error. See console for details.'
      )
      return
    }

    should_show_quick_pick = true
    current_config_id = undefined
  }
}
