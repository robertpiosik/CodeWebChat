import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../helpers/make-api-request'
import { code_completion_instruction } from '../constants/instructions'
import { FilesCollector } from '../helpers/files-collector'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { Logger } from '../helpers/logger'
import he from 'he'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY } from '../constants/state-keys'

async function build_completion_payload(params: {
  document: vscode.TextDocument
  position: vscode.Position
  file_tree_provider: any
  open_editors_provider?: any
  suggestions?: string
}): Promise<string> {
  const document_path = params.document.uri.fsPath
  const text_before_cursor = params.document.getText(
    new vscode.Range(new vscode.Position(0, 0), params.position)
  )
  const text_after_cursor = params.document.getText(
    new vscode.Range(
      params.position,
      params.document.positionAt(params.document.getText().length)
    )
  )

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  const context_text = await files_collector.collect_files({
    exclude_path: document_path
  })

  const payload = {
    before: `<files>\n${context_text}<file path="${vscode.workspace.asRelativePath(
      params.document.uri
    )}">\n<![CDATA[\n${text_before_cursor}`,
    after: `${text_after_cursor}\n]]>\n</file>\n</files>`
  }

  const instructions = `${code_completion_instruction}${
    params.suggestions ? ` Follow suggestions: ${params.suggestions}` : ''
  }`

  return `${instructions}\n${payload.before}<missing text>${payload.after}\n${instructions}`
}

/**
 * Show inline completion using Inline Completions API
 */
async function show_inline_completion(params: {
  editor: vscode.TextEditor
  position: vscode.Position
  completion_text: string
}) {
  const document = params.editor.document
  const controller = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: () => {
        const item = {
          insertText: params.completion_text,
          range: new vscode.Range(params.position, params.position)
        }
        return [item]
      }
    }
  )

  // Listen for text document changes that would indicate completion acceptance
  const change_listener = vscode.workspace.onDidChangeTextDocument(
    async (e) => {
      if (e.document === document) {
        await vscode.commands.executeCommand(
          'editor.action.formatDocument',
          document.uri
        )
        change_listener.dispose()
      }
    }
  )

  // Trigger the inline completion UI
  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')

  // Dispose after a timeout or some event (optional cleanup)
  setTimeout(() => {
    controller.dispose()
    change_listener.dispose() // Make sure to clean up the listener if not used
  }, 10000)
}

async function get_code_completion_config(
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: any } | undefined> {
  const code_completions_configs =
    await api_providers_manager.get_code_completions_tool_configs()

  if (code_completions_configs.length === 0) {
    vscode.window.showErrorMessage(
      'Code Completions API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_code_completion_config',
      message: 'Code Completions API tool is not configured.'
    })
    return
  }

  let selected_config = null

  if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_code_completions_config()
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
        await api_providers_manager.get_default_code_completions_config()

      return code_completions_configs.map((config, index) => {
        const buttons = []

        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model

        if (code_completions_configs.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < code_completions_configs.length - 1) {
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
            is_default ? ' • Default configuration' : ''
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
    quick_pick.placeholder = 'Select code completion configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
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
            await api_providers_manager.set_default_code_completions_config(
              code_completions_configs[index]
            )
            quick_pick.items = await create_items()
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_code_completions_config(
              null as any
            )
            quick_pick.items = await create_items()
          } else if (button.tooltip == 'Move up' && index > 0) {
            const temp = code_completions_configs[index]
            code_completions_configs[index] =
              code_completions_configs[index - 1]
            code_completions_configs[index - 1] = temp

            await api_providers_manager.save_code_completions_tool_configs(
              code_completions_configs
            )

            quick_pick.items = await create_items()
          } else if (
            button.tooltip == 'Move down' &&
            index < code_completions_configs.length - 1
          ) {
            const temp = code_completions_configs[index]
            code_completions_configs[index] =
              code_completions_configs[index + 1]
            code_completions_configs[index + 1] = temp

            await api_providers_manager.save_code_completions_tool_configs(
              code_completions_configs
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
            LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
            selected.index
          )

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              'API provider not found for Code Completions tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
            )
            Logger.warn({
              function_name: 'get_code_completion_config',
              message: 'API provider not found for Code Completions tool.'
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
      'API provider not found for Code Completions tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_code_completion_config',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

async function perform_code_completion(params: {
  file_tree_provider: any
  open_editors_provider: any
  context: vscode.ExtensionContext
  with_suggestions: boolean
  auto_accept: boolean
  show_quick_pick?: boolean
  suggestions?: string
}) {
  const api_providers_manager = new ApiProvidersManager(params.context)

  let suggestions: string | undefined = params.suggestions
  if (params.with_suggestions && !suggestions) {
    suggestions = await vscode.window.showInputBox({
      placeHolder: 'Enter suggestions',
      prompt: 'E.g. include explanatory comments'
    })

    if (suggestions === undefined) {
      return
    }
  }

  const config_result = await get_code_completion_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context
  )

  if (!config_result) {
    return
  }

  const { provider, config: code_completions_config } = config_result

  if (!code_completions_config.provider_name) {
    vscode.window.showErrorMessage(
      'API provider is not specified for Code Completions tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_config.model) {
    vscode.window.showErrorMessage(
      'Model is not specified for Code Completions tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'Model is not specified for Code Completions tool.'
    })
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
        function_name: 'perform_code_completion',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the Settings tab.'
    )
    return
  }

  const editor = vscode.window.activeTextEditor
  if (editor) {
    const cancel_token_source = axios.CancelToken.source()
    const document = editor.document
    const position = editor.selection.active

    const content = await build_completion_payload({
      document,
      position,
      file_tree_provider: params.file_tree_provider,
      open_editors_provider: params.open_editors_provider,
      suggestions
    })

    const messages = [
      {
        role: 'user',
        content
      }
    ]

    const body = {
      messages,
      model: code_completions_config.model,
      temperature: code_completions_config.temperature
    }

    Logger.log({
      function_name: 'perform_fim_completion',
      message: 'Prompt:',
      data: content
    })

    const cursor_listener = vscode.workspace.onDidChangeTextDocument(() => {
      cancel_token_source.cancel('User moved the cursor, cancelling request.')
    })

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Waiting for code completion...',
        cancellable: true
      },
      async (_, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel('User cancelled the operation')
        })

        try {
          const completion = await make_api_request(
            endpoint_url,
            provider.api_key,
            body,
            cancel_token_source.token
          )

          if (completion) {
            const match = completion.match(
              /<replacement>([\s\S]*?)<\/replacement>/i
            )
            if (match && match[1]) {
              let decoded_completion = he.decode(match[1].trim())
              // Clean potential CDATA tags from the replacement
              decoded_completion = decoded_completion
                .replace(/<!\[CDATA\[/g, '')
                .replace(/\]\]>/g, '')
                .trim()

              if (params.auto_accept) {
                await editor.edit((editBuilder) => {
                  editBuilder.insert(position, decoded_completion)
                })
                await vscode.commands.executeCommand(
                  'editor.action.formatDocument',
                  document.uri
                )
              } else {
                await show_inline_completion({
                  editor,
                  position,
                  completion_text: decoded_completion
                })
              }
            }
          }
        } catch (err: any) {
          Logger.error({
            function_name: 'perform_fim_completion',
            message: 'Completion error',
            data: err
          })
        } finally {
          cursor_listener.dispose()
        }
      }
    )
  }
}

export function code_completion_commands(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext
) {
  return [
    vscode.commands.registerCommand('codeWebChat.codeCompletion', async () =>
      perform_code_completion({
        file_tree_provider,
        open_editors_provider,
        context,
        with_suggestions: false,
        auto_accept: false,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionAutoAccept',
      async (args?: { suggestions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: false,
          auto_accept: true,
          show_quick_pick: false,
          suggestions: args?.suggestions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithSuggestions',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: true,
          auto_accept: false,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithSuggestionsAutoAccept',
      async (args?: { suggestions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: true,
          auto_accept: true,
          show_quick_pick: false,
          suggestions: args?.suggestions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: false,
          auto_accept: false,
          show_quick_pick: true
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsingAutoAccept',
      async (args?: { suggestions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: false,
          auto_accept: true,
          show_quick_pick: true,
          suggestions: args?.suggestions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithSuggestionsUsingAutoAccept',
      async (args?: { suggestions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: true,
          auto_accept: true,
          show_quick_pick: true,
          suggestions: args?.suggestions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithSuggestionsUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_suggestions: true,
          auto_accept: false,
          show_quick_pick: true
        })
    )
  ]
}
