import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../utils/make-api-request'
import { code_completion_instructions } from '../constants/instructions'
import { FilesCollector } from '../utils/files-collector'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { Logger } from '../utils/logger'
import he from 'he'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY } from '../constants/state-keys'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'

async function build_completion_payload(params: {
  document: vscode.TextDocument
  position: vscode.Position
  file_tree_provider: any
  open_editors_provider?: any
  completion_instructions?: string
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

  const instructions = `${code_completion_instructions}${
    params.completion_instructions
      ? ` Follow instructions: ${params.completion_instructions}`
      : ''
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

  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')

  setTimeout(() => {
    controller.dispose()
    change_listener.dispose()
  }, 10000)
}

async function get_code_completion_config(
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  config_index?: number
): Promise<{ provider: any; config: any } | undefined> {
  const code_completions_configs =
    await api_providers_manager.get_code_completions_tool_configs()

  if (code_completions_configs.length == 0) {
    vscode.window.showErrorMessage(
      'Code Completions API tool is not configured.'
    )
    Logger.warn({
      function_name: 'get_code_completion_config',
      message: 'Code Completions API tool is not configured.'
    })
    return
  }

  let selected_config = null

  if (config_index !== undefined && code_completions_configs[config_index]) {
    selected_config = code_completions_configs[config_index]
  } else if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_code_completions_config()
  }

  if (!selected_config || show_quick_pick) {
    const create_items = async () => {
      return code_completions_configs.map((config, index) => {
        const description_parts = [config.provider_name]
        if (config.temperature != DEFAULT_TEMPERATURE['code-completions']) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }

        return {
          label: config.model,
          description: description_parts.join(' · '),
          config,
          index
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select code completions configuration'
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
              'API provider for the selected API tool configuration was not found.'
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
      'API provider for the selected API tool configuration was not found.'
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
  with_completion_instructions: boolean
  auto_accept: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  config_index?: number
}) {
  const api_providers_manager = new ApiProvidersManager(params.context)

  let completion_instructions: string | undefined =
    params.completion_instructions
  if (params.with_completion_instructions && !completion_instructions) {
    const last_value =
      params.context.workspaceState.get<string>(
        'last-completion-instructions'
      ) || ''
    completion_instructions = await vscode.window.showInputBox({
      placeHolder: 'Enter completion instructions',
      prompt: 'E.g. "Include explanatory comments".',
      value: last_value
    })

    if (completion_instructions === undefined) return

    await params.context.workspaceState.update(
      'last-completion-instructions',
      completion_instructions || ''
    )
  }

  const config_result = await get_code_completion_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context,
    params.config_index
  )

  if (!config_result) {
    return
  }

  const { provider, config: code_completions_config } = config_result

  if (!code_completions_config.provider_name) {
    vscode.window.showErrorMessage(
      'API provider is not specified for Code Completions tool.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_config.model) {
    vscode.window.showErrorMessage(
      'Model is not specified for Code Completions tool.'
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
        `Built-in provider "${provider.name}" not found.`
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
      completion_instructions
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
      temperature: code_completions_config.temperature,
      reasoning_effort: code_completions_config.reasoning_effort
    }

    Logger.log({
      function_name: 'perform_fim_completion',
      message: 'Request body',
      data: body
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
        with_completion_instructions: false,
        auto_accept: false,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionAutoAccept',
      async (args?: {
        completion_instructions?: string
        config_index?: number
      }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: false,
          auto_accept: true,
          show_quick_pick: false,
          completion_instructions: args?.completion_instructions,
          config_index: args?.config_index
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructions',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          auto_accept: false,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructionsAutoAccept',
      async (args?: { completion_instructions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          auto_accept: true,
          show_quick_pick: false,
          completion_instructions: args?.completion_instructions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: false,
          auto_accept: false,
          show_quick_pick: true
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsingAutoAccept',
      async (args?: { completion_instructions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: false,
          auto_accept: true,
          show_quick_pick: true,
          completion_instructions: args?.completion_instructions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructionsUsingAutoAccept',
      async (args?: { completion_instructions?: string }) =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          auto_accept: true,
          show_quick_pick: true,
          completion_instructions: args?.completion_instructions
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructionsUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          auto_accept: false,
          show_quick_pick: true
        })
    )
  ]
}
