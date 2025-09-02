import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { make_api_request } from './make-api-request'
import { Logger } from './logger'
import { should_ignore_file } from '../context/utils/should-ignore-file'
import { process_single_trailing_dot } from '@/utils/process-single-trailing-dot/process-single-trailing-dot'
import {
  ApiProvidersManager,
  ReasoningEffort
} from '../services/api-providers-manager'
import { ignored_extensions } from '@/context/constants/ignored-extensions'
import { PROVIDERS } from '@shared/constants/providers'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import {
  COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
  LAST_SELECTED_COMMIT_MESSAGES_CONFIG_INDEX_STATE_KEY
} from '../constants/state-keys'
import { GitRepository } from './git-repository-utils'

export interface FileData {
  path: string
  relative_path: string
  content: string
  estimated_tokens: number
  status: number
  is_large_file: boolean
}

export interface CommitMessageConfig {
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: ReasoningEffort
}

export const get_commit_message_config = async (
  context: vscode.ExtensionContext
): Promise<{
  config: CommitMessageConfig
  provider: any
  endpoint_url: string
} | null> => {
  const api_providers_manager = new ApiProvidersManager(context)
  let commit_message_config: CommitMessageConfig | null | undefined =
    await api_providers_manager.get_default_commit_messages_config()

  if (!commit_message_config) {
    const configs =
      await api_providers_manager.get_commit_messages_tool_configs()
    if (configs.length == 1) {
      commit_message_config = configs[0]
    } else if (configs.length > 1) {
      const move_up_button = {
        iconPath: new vscode.ThemeIcon('chevron-up'),
        tooltip: 'Move up'
      }

      const move_down_button = {
        iconPath: new vscode.ThemeIcon('chevron-down'),
        tooltip: 'Move down'
      }

      const set_default_button = {
        iconPath: new vscode.ThemeIcon('star'),
        tooltip: 'Set as default'
      }

      const unset_default_button = {
        iconPath: new vscode.ThemeIcon('star-full'),
        tooltip: 'Unset default'
      }

      const create_items = async () => {
        const default_config =
          await api_providers_manager.get_default_commit_messages_config()

        return configs.map((config, index) => {
          const buttons = []

          const is_default =
            default_config &&
            default_config.provider_name == config.provider_name &&
            default_config.model == config.model &&
            default_config.temperature == config.temperature &&
            default_config.reasoning_effort == config.reasoning_effort

          if (configs.length > 1) {
            if (index > 0) {
              buttons.push(move_up_button)
            }

            if (index < configs.length - 1) {
              buttons.push(move_down_button)
            }
          }

          if (is_default) {
            buttons.push(unset_default_button)
          } else {
            buttons.push(set_default_button)
          }

          const description_parts = [config.provider_name]
          if (config.reasoning_effort) {
            description_parts.push(`${config.reasoning_effort}`)
          }
          if (config.temperature != DEFAULT_TEMPERATURE['commit-messages']) {
            description_parts.push(`${config.temperature}`)
          }

          return {
            label: is_default ? `$(pass-filled) ${config.model}` : config.model,
            description: description_parts.join(' · '),
            config,
            index,
            buttons
          }
        })
      }

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = await create_items()
      quick_pick.placeholder = 'Select configuration for commit message'
      quick_pick.matchOnDescription = true

      const last_selected_index = context.globalState.get<number>(
        LAST_SELECTED_COMMIT_MESSAGES_CONFIG_INDEX_STATE_KEY,
        0
      )

      if (
        last_selected_index >= 0 &&
        last_selected_index < quick_pick.items.length
      ) {
        quick_pick.activeItems = [quick_pick.items[last_selected_index]]
      } else if (quick_pick.items.length > 0) {
        quick_pick.activeItems = [quick_pick.items[0]]
      }

      commit_message_config = await new Promise<
        CommitMessageConfig | undefined
      >((resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_commit_messages_config(
              configs[index]
            )
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_commit_messages_config(
              null as any
            )
          } else if (button.tooltip == 'Move up' && index > 0) {
            const temp = configs[index]
            configs[index] = configs[index - 1]
            configs[index - 1] = temp
            await api_providers_manager.save_commit_messages_tool_configs(
              configs
            )
          } else if (
            button.tooltip == 'Move down' &&
            index < configs.length - 1
          ) {
            const temp = configs[index]
            configs[index] = configs[index + 1]
            configs[index + 1] = temp
            await api_providers_manager.save_commit_messages_tool_configs(
              configs
            )
          }
          quick_pick.items = await create_items()
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (selected) {
            context.globalState.update(
              LAST_SELECTED_COMMIT_MESSAGES_CONFIG_INDEX_STATE_KEY,
              selected.index
            )
            resolve(selected.config)
          } else {
            resolve(undefined)
          }
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          if (quick_pick.selectedItems.length == 0) {
            resolve(undefined)
          }
        })

        quick_pick.show()
      })
    }
  }

  if (!commit_message_config) {
    vscode.commands.executeCommand('codeWebChat.settings.commitMessages')
    vscode.window.showInformationMessage(
      'No "Commit Messages" configurations found. Please add one in the settings.'
    )
    return null
  }

  const provider = await api_providers_manager.get_provider(
    commit_message_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      'API provider for the selected API tool configuration was not found.'
    )
    Logger.warn({
      function_name: 'get_commit_message_config',
      message: 'API provider not found for Commit Messages tool.'
    })
    return null
  }

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing for the selected provider. Please add it in the Settings tab.'
    )
    return null
  }

  let endpoint_url = ''
  if (provider.type === 'built-in') {
    const provider_info = PROVIDERS[provider.name]
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  return {
    config: commit_message_config,
    provider,
    endpoint_url
  }
}

export const get_ignored_extensions = (): Set<string> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_ignored_extensions = new Set(
    config
      .get<string[]>('ignoredExtensions', [])
      .map((ext) => ext.toLowerCase().replace(/^\./, ''))
  )
  return new Set([...ignored_extensions, ...config_ignored_extensions])
}

export const collect_affected_files_with_metadata = async (
  repository: GitRepository,
  ignored_extensions: Set<string>
): Promise<FileData[]> => {
  const staged_files = repository.state.indexChanges || []
  const files_data: FileData[] = []

  for (const change of staged_files) {
    const file_path = change.uri.fsPath
    const relative_path = path.relative(repository.rootUri.fsPath, file_path)

    if (should_ignore_file(relative_path, ignored_extensions)) {
      continue
    }

    let content = ''
    let is_large_file = false
    try {
      const stats = await fs.promises.stat(file_path)
      if (stats.size > 100 * 1024) {
        is_large_file = true
        content = `File content omitted due to large size (${(
          stats.size / 1024
        ).toFixed(2)} KB).`
      } else {
        content = await fs.promises.readFile(file_path, 'utf8')
      }
    } catch (read_error) {
      Logger.warn({
        function_name: 'collect_affected_files_with_metadata',
        message: `Could not read file content for ${relative_path}`,
        data: read_error
      })
      content = `Could not read file content.`
    }

    // Simple token estimation: 1 token per 4 characters
    const estimated_tokens = Math.ceil(content.length / 4)

    files_data.push({
      path: file_path,
      relative_path: relative_path,
      content: content,
      estimated_tokens: estimated_tokens,
      status: change.status,
      is_large_file: is_large_file
    })
  }
  return files_data
}

export const handle_file_selection_if_needed = async (
  context: vscode.ExtensionContext,
  files_data: FileData[]
): Promise<FileData[] | null> => {
  const threshold = context.globalState.get<number>(
    COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
    20000
  )

  const total_tokens = files_data.reduce(
    (sum, file) => sum + file.estimated_tokens,
    0
  )

  if (total_tokens <= threshold) {
    return files_data
  }

  const selected_files = await show_file_selection_dialog(
    files_data,
    threshold,
    total_tokens
  )
  if (!selected_files || selected_files.length == 0) {
    vscode.window.showInformationMessage(
      'No files selected for commit message generation.'
    )
    return null
  }

  return selected_files
}

const show_file_selection_dialog = async (
  files_data: FileData[],
  threshold: number,
  total_tokens: number
): Promise<FileData[] | undefined> => {
  const items = files_data.map((file) => {
    const token_count = file.estimated_tokens
    const formatted_token_count =
      token_count >= 1000
        ? `${Math.floor(token_count / 1000)}k`
        : `${token_count}`

    const relative_path = path.dirname(file.relative_path)

    return {
      label: path.basename(file.relative_path),
      description: `${formatted_token_count} ${
        relative_path != '.' ? relative_path : ''
      }`,
      detail: file.is_large_file ? 'Content omitted (large file)' : '',
      file_data: file,
      picked: true
    }
  })

  const exceeded_by = total_tokens - threshold
  const format_tokens = (tokens: number): string => {
    if (tokens < 1000) {
      return tokens.toString()
    }
    return `${Math.round(tokens / 1000)}k`
  }
  const formatted_total_tokens = format_tokens(total_tokens)
  const formatted_exceeded_by = format_tokens(exceeded_by)

  vscode.window.showInformationMessage(
    `Total tokens in affected files: ${formatted_total_tokens}, exceeds threshold by ${formatted_exceeded_by}.`
  )

  const result = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Review affected files to include'
  })

  if (!result) {
    return undefined
  }

  return result.map((item) => item.file_data)
}

export const build_files_content = (files_data: FileData[]): string => {
  if (!files_data || files_data.length == 0) {
    return 'No relevant files to include.'
  }

  return files_data
    .map((file) => {
      return `File: ${file.relative_path}\nContent:\n${file.content}`
    })
    .join('\n---\n')
}

export const strip_wrapping_quotes = (text: string): string => {
  const trimmed = text.trim()

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.substring(1, trimmed.length - 1).trim()
  }
  return trimmed
}

export const generate_commit_message_with_api = async (
  endpoint_url: string,
  provider: any,
  config: CommitMessageConfig,
  message: string
): Promise<string | null> => {
  const token_count = Math.ceil(message.length / 4)
  const formatted_token_count =
    token_count > 1000 ? Math.ceil(token_count / 1000) + 'k' : token_count

  Logger.log({
    function_name: 'generate_commit_message_with_api',
    message: 'Getting commit message...',
    data: message
  })

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Generating commit message with ~${formatted_token_count} tokens in request...`,
      cancellable: true
    },
    async (_, token) => {
      const messages = [
        {
          role: 'user',
          content: message
        }
      ]

      const body = {
        messages,
        model: config.model,
        temperature: config.temperature
      } as any

      if (config.reasoning_effort) {
        body.reasoning_effort = config.reasoning_effort
      }

      const cancel_token_source = axios.CancelToken.source()

      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Operation cancelled by user')
      })

      try {
        const response = await make_api_request({
          endpoint_url,
          api_key: provider.api_key,
          body,
          cancellation_token: cancel_token_source.token
        })

        if (!response) {
          vscode.window.showErrorMessage('Failed to generate commit message.')
          return null
        } else {
          let commit_message = process_single_trailing_dot(response)
          commit_message = strip_wrapping_quotes(commit_message)
          return commit_message
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          vscode.window.showInformationMessage(
            'Commit message generation cancelled.'
          )
          return null
        }
        Logger.error({
          function_name: 'generate_commit_message_with_api',
          message: 'Error during API request',
          data: error
        })
        throw error
      }
    }
  )
}

export const build_commit_message_prompt = (
  commit_message_prompt: string,
  affected_files: string,
  diff: string
): string => {
  return `${commit_message_prompt}\n${affected_files}\n${diff}\n${commit_message_prompt}`
}

export const generate_commit_message_from_diff = async (
  context: vscode.ExtensionContext,
  repository: GitRepository,
  diff: string,
  api_config?: {
    config: CommitMessageConfig
    provider: any
    endpoint_url: string
  }
): Promise<string | null> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const commit_message_prompt = config.get<string>('commitMessageInstructions')
  const all_ignored_extensions = get_ignored_extensions()

  // Use provided config or get it if not provided (for backward compatibility)
  const resolved_api_config =
    api_config || (await get_commit_message_config(context))
  if (!resolved_api_config) return null

  const affected_files_data = await collect_affected_files_with_metadata(
    repository,
    all_ignored_extensions
  )

  const selected_files = await handle_file_selection_if_needed(
    context,
    affected_files_data
  )
  if (!selected_files) return null

  const affected_files = build_files_content(selected_files)
  const message = build_commit_message_prompt(
    commit_message_prompt!,
    affected_files,
    diff
  )

  return await generate_commit_message_with_api(
    resolved_api_config.endpoint_url,
    resolved_api_config.provider,
    resolved_api_config.config,
    message
  )
}
