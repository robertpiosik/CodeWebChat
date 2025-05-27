import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../helpers/make-api-request'
import { cleanup_api_response } from '../helpers/cleanup-api-response'
import { FilesCollector } from '../helpers/files-collector'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  TEMP_REFACTORING_INSTRUCTION_STATE_KEY,
  LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY
} from '../constants/state-keys'
import { Logger } from '../helpers/logger'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { get_refactoring_instruction } from '@/constants/instructions'
import { PROVIDERS } from '@shared/constants/providers'

export const get_refactor_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: any } | undefined> => {
  const refactor_configs =
    await api_providers_manager.get_file_refactoring_tool_configs()

  if (refactor_configs.length === 0) {
    vscode.window.showErrorMessage(
      'File Refactoring API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_refactor_config',
      message: 'File Refactoring API tool is not configured.'
    })
    return
  }

  let selected_config = null

  if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_file_refactoring_config()
  }

  if (!selected_config || show_quick_pick) {
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
        await api_providers_manager.get_default_file_refactoring_config()

      return refactor_configs.map((config, index) => {
        const buttons = []

        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model

        if (refactor_configs.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < refactor_configs.length - 1) {
            buttons.push(move_down_button)
          }
        }

        if (is_default) {
          buttons.push(unset_default_button)
        } else {
          buttons.push(set_default_button)
        }

        return {
          label: config.model,
          description: `${config.provider_name}${
            is_default ? ' • default configuration' : ''
          }`,
          config,
          index,
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select file refactoring configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY,
      0
    )

    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_file_refactoring_config(
              refactor_configs[index]
            )
            quick_pick.items = await create_items()
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_file_refactoring_config(
              null as any
            )
            quick_pick.items = await create_items()
          } else if (button.tooltip == 'Move up' && index > 0) {
            const temp = refactor_configs[index]
            refactor_configs[index] = refactor_configs[index - 1]
            refactor_configs[index - 1] = temp

            await api_providers_manager.save_file_refactoring_tool_configs(
              refactor_configs
            )

            quick_pick.items = await create_items()
          } else if (
            button.tooltip == 'Move down' &&
            index < refactor_configs.length - 1
          ) {
            const temp = refactor_configs[index]
            refactor_configs[index] = refactor_configs[index + 1]
            refactor_configs[index + 1] = temp

            await api_providers_manager.save_file_refactoring_tool_configs(
              refactor_configs
            )

            quick_pick.items = await create_items()
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
          }

          context.globalState.update(
            LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY,
            selected.index
          )

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              'API provider not found for File Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
            )
            Logger.warn({
              function_name: 'get_refactor_config',
              message: 'API provider not found for File Refactoring tool.'
            })
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
      'API provider not found for File Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_refactor_config',
      message: 'API provider not found for File Refactoring tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

const perform_refactor = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider: any
  show_quick_pick: boolean
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor

  if (!editor) {
    vscode.window.showErrorMessage('No active editor found.')
    return
  }

  let instruction = params.context.workspaceState.get<string>(
    TEMP_REFACTORING_INSTRUCTION_STATE_KEY
  )

  // If no instruction in workspace state (direct command invocation), prompt for one
  if (!instruction) {
    const last_instruction = params.context.globalState.get<string>(
      'lastRefactoringInstruction',
      ''
    )

    instruction = await vscode.window.showInputBox({
      prompt: 'Enter refactoring instructions',
      placeHolder: 'e.g., "Refactor this code to use async/await"',
      value: last_instruction,
      validateInput: (value) => {
        params.context.globalState.update('lastRefactoringInstruction', value)
        return null
      }
    })

    if (!instruction) {
      return // User cancelled the instruction input
    }
  } else {
    // Clear the temporary instruction immediately after getting it
    await params.context.workspaceState.update(
      TEMP_REFACTORING_INSTRUCTION_STATE_KEY,
      undefined
    )
  }

  const config_result = await get_refactor_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context
  )

  if (!config_result) {
    return
  }

  const { provider, config: refactoring_settings } = config_result

  if (!refactoring_settings.provider_name) {
    vscode.window.showErrorMessage(
      'API provider is not specified for File Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'perform_refactor',
      message: 'API provider is not specified for File Refactoring tool.'
    })
    return
  } else if (!refactoring_settings.model) {
    vscode.window.showErrorMessage(
      'Model is not specified for File Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'perform_refactor',
      message: 'Model is not specified for File Refactoring tool.'
    })
    return
  }

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the Settings tab.'
    )
    return
  }

  let endpoint_url = ''
  if (provider.type == 'built-in') {
    const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
    if (!provider_info) {
      vscode.window.showErrorMessage(
        `Built-in provider "${provider.name}" not found. Navigate to the Settings tab, configure API providers and setup the API tool.`
      )
      Logger.warn({
        function_name: 'perform_refactor',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  const document = editor.document
  const document_path = document.uri.fsPath
  const document_text = document.getText()

  // Store original content for potential reversion
  const original_content = document_text

  // Get the relative path of the file in the workspace
  const file_path = vscode.workspace.asRelativePath(document.uri)

  // Determine which workspace this file belongs to (for multi-root workspaces)
  let workspace_name: string | undefined = undefined
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 1
  ) {
    // Find the workspace folder that contains this file
    const workspace_folder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (workspace_folder) {
      workspace_name = workspace_folder.name
    }
  }

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  const collected_files = await files_collector.collect_files({
    exclude_path: document_path
  })

  const current_file_path = vscode.workspace.asRelativePath(document.uri)
  const selection = editor.selection
  const selected_text = editor.document.getText(selection)
  let refactoring_instruction = get_refactoring_instruction(file_path)
  if (selected_text) {
    refactoring_instruction += ` Regarding the following snippet \`\`\`${selected_text}\`\`\` ${instruction}`
  } else {
    refactoring_instruction += ` ${instruction}`
  }

  const files = `<files>${collected_files}\n<file path="${current_file_path}"><![CDATA[${document_text}]]></file>\n</files>`
  const content = `${refactoring_instruction}\n${files}\n${refactoring_instruction}`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: refactoring_settings.model,
    temperature: refactoring_settings.temperature
  }

  Logger.log({
    function_name: 'perform_refactor',
    message: 'Refactor Prompt:',
    data: content
  })

  const cancel_token_source = axios.CancelToken.source()

  // Track total length and received length for progress
  const total_length = document_text.length

  // Variables to hold processing results outside the progress scope
  let result_content = ''
  let success = false

  await vscode.window
    .withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Updating file...',
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel('Cancelled by user.')
        })

        try {
          const refactored_content = await make_api_request(
            endpoint_url,
            provider.api_key,
            body,
            cancel_token_source.token,
            (chunk: string) => {
              progress.report({
                increment: (chunk.length / total_length) * 100
              })
            }
          )

          if (refactored_content) {
            result_content = cleanup_api_response({
              content: refactored_content
            })
          }
          success = true
          return true
        } catch (error) {
          if (axios.isCancel(error)) return false
          Logger.error({
            function_name: 'perform_refactor',
            message: 'Refactoring error',
            data: error
          })
          vscode.window.showErrorMessage(
            'An error occurred during refactoring. See console for details.'
          )
          return false
        }
      }
    )
    .then(async () => {
      // Only proceed if we have successful results
      if (success && result_content) {
        const full_range = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document_text.length)
        )
        await editor.edit((edit_builder) => {
          edit_builder.replace(full_range, result_content)
        })

        await vscode.commands.executeCommand(
          'editor.action.formatDocument',
          document.uri
        )
        await document.save()

        // Store original file state for potential reversion using the revert command
        // Include workspace_name for multi-root workspace support
        await params.context.workspaceState.update(
          LAST_APPLIED_CHANGES_STATE_KEY,
          [
            {
              file_path: file_path,
              content: original_content,
              is_new: false,
              workspace_name
            }
          ]
        )

        // Show success message with Revert option
        const response = await vscode.window.showInformationMessage(
          'File has been refactored.',
          'Revert'
        )

        // Handle revert action if selected
        if (response == 'Revert') {
          await editor.edit((editBuilder) => {
            const full_range = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            )
            editBuilder.replace(full_range, original_content)
          })
          await document.save()
          vscode.window.showInformationMessage('Refactoring has been reverted.')
          // Clear the saved state since we've reverted
          await params.context.workspaceState.update(
            LAST_APPLIED_CHANGES_STATE_KEY,
            null
          )
        }
      }
    })
}

export const refactor_commands = (params: {
  context: vscode.ExtensionContext
  workspace_provider: any
  open_editors_provider?: any
  use_default_model?: boolean
}) => {
  return [
    vscode.commands.registerCommand('codeWebChat.refactor', () =>
      perform_refactor({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand('codeWebChat.refactorUsing', () =>
      perform_refactor({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: true
      })
    )
  ]
}
