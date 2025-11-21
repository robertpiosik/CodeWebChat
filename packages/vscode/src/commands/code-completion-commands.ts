import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../utils/make-api-request'
import { code_completion_instructions } from '../constants/instructions'
import { FilesCollector } from '../utils/files-collector'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import he from 'he'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { ToolConfig } from '@/services/model-providers-manager'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from '../utils/apply-reasoning-effort'

const show_inline_completion = async (params: {
  editor: vscode.TextEditor
  position: vscode.Position
  completion_text: string
}) => {
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
        controller.dispose()
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

const get_code_completion_config = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  config_id?: string,
  panel_provider?: PanelProvider
): Promise<{ provider: any; config: any } | undefined> => {
  const code_completions_configs =
    await api_providers_manager.get_code_completions_tool_configs()

  if (code_completions_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_CODE_COMPLETIONS_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | null = null

  if (config_id !== undefined) {
    selected_config =
      code_completions_configs.find(
        (c) => get_tool_config_id(c) === config_id
      ) || null
  } else if (!show_quick_pick) {
    const last_selected_id =
      context.workspaceState.get<string>(
        LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY
      ) ??
      context.globalState.get<string>(
        LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY
      )
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
      return code_completions_configs.map((config: ToolConfig, index) => {
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
          index,
          id: get_tool_config_id(config)
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_items()
    quick_pick.placeholder = 'Select code completions configuration'
    quick_pick.matchOnDescription = true

    const last_selected_id =
      context.workspaceState.get<string>(
        LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY
      ) ??
      context.globalState.get<string>(
        LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY
      )

    const items = quick_pick.items as (vscode.QuickPickItem & { id: string })[]
    const last_selected_item = items.find(
      (item) => item.id === last_selected_id
    )

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
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

          context.workspaceState.update(
            LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY,
            selected.id
          )
          context.globalState.update(
            LAST_SELECTED_CODE_COMPLETION_CONFIG_ID_STATE_KEY,
            selected.id
          )

          if (panel_provider) {
            panel_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              mode: 'code-completions',
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

const perform_code_completion = async (params: {
  file_tree_provider: any
  open_editors_provider: any
  context: vscode.ExtensionContext
  with_completion_instructions: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  config_id?: string
  panel_provider?: PanelProvider
}) => {
  const api_providers_manager = new ModelProvidersManager(params.context)

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
    params.config_id,
    params.panel_provider
  )

  if (!config_result) {
    return
  }

  const { provider, config: code_completions_config } = config_result

  if (!code_completions_config.provider_name) {
    vscode.window.showErrorMessage(
      dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_COMPLETIONS
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_config.model) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_COMPLETIONS
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
        dictionary.error_message.BUILT_IN_PROVIDER_NOT_FOUND(provider.name)
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
    vscode.window.showErrorMessage(dictionary.error_message.API_KEY_MISSING)
    return
  }

  const editor = vscode.window.activeTextEditor
  if (editor) {
    if (!editor.selection.isEmpty) {
      vscode.window.showWarningMessage(
        dictionary.warning_message.CODE_COMPLETIONS_NO_SELECTION
      )
      return
    }
    const cancel_token_source = axios.CancelToken.source()
    const document = editor.document
    const position = editor.selection.active

    const document_path = document.uri.fsPath
    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
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
        document.uri
      )}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const content = `${code_completion_instructions}\n${payload.before}${
      completion_instructions
        ? `<missing_text>${completion_instructions}</missing_text>`
        : '<missing_text>'
    }${payload.after}\n${code_completion_instructions}`

    const messages = [
      {
        role: 'user',
        content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: code_completions_config.model,
      temperature: code_completions_config.temperature
    }

    apply_reasoning_effort(
      body,
      provider,
      code_completions_config.reasoning_effort
    )

    const cursor_listener = vscode.window.onDidChangeTextEditorSelection(() => {
      cancel_token_source.cancel('User moved the cursor, cancelling request.')
    })

    let thinking_reported = false
    let resolve_thinking: () => void
    const thinking_promise = new Promise<void>((resolve) => {
      resolve_thinking = resolve
    })

    const on_thinking_chunk = () => {
      if (!thinking_reported) {
        thinking_reported = true
        resolve_thinking()
      }
    }

    const api_promise = make_api_request({
      endpoint_url,
      api_key: provider.api_key,
      body,
      cancellation_token: cancel_token_source.token,
      on_thinking_chunk
    })

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: dictionary.api_call.WAITING_FOR_RESPONSE,
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            cancel_token_source.cancel('User cancelled the operation')
          })

          let wait_time = 0
          const wait_timer = setInterval(() => {
            progress.report({
              message: `${(wait_time / 10).toFixed(1)}s`
            })
            wait_time++
          }, 100)

          await Promise.race([api_promise, thinking_promise])
          clearInterval(wait_timer)
        }
      )

      if (thinking_reported) {
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: dictionary.api_call.THINKING,
            cancellable: true
          },
          async (progress, token) => {
            token.onCancellationRequested(() => {
              cancel_token_source.cancel('User cancelled the operation')
            })

            let thinking_time = 0
            const thinking_timer = setInterval(() => {
              progress.report({
                message: `${(thinking_time / 10).toFixed(1)}s`
              })
              thinking_time++
            }, 100)

            try {
              await api_promise
            } finally {
              clearInterval(thinking_timer)
            }
          }
        )
      }

      const completion_result = await api_promise

      if (completion_result) {
        const match = completion_result.response.match(
          /<replacement>([\s\S]*?)<\/replacement>/i
        )
        if (match && match[1]) {
          let decoded_completion = he.decode(match[1].trim())
          decoded_completion = decoded_completion
            .replace(/<!\[CDATA\[/g, '')
            .replace(/\]\]>/g, '')
            .trim()

          await show_inline_completion({
            editor,
            position,
            completion_text: decoded_completion
          })
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
}

export const code_completion_commands = (
  params: {
    file_tree_provider: any
    open_editors_provider: any
    context: vscode.ExtensionContext
    panel_provider: PanelProvider
  }
) => {
  return [
    vscode.commands.registerCommand('codeWebChat.codeCompletion', async () =>
      perform_code_completion({
        file_tree_provider: params.file_tree_provider,
        open_editors_provider: params.open_editors_provider,
        context: params.context,
        with_completion_instructions: false,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructions',
      async () =>
        perform_code_completion({
          file_tree_provider: params.file_tree_provider,
          open_editors_provider: params.open_editors_provider,
          context: params.context,
          with_completion_instructions: true,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsing',
      async () =>
        perform_code_completion({
          file_tree_provider: params.file_tree_provider,
          open_editors_provider: params.open_editors_provider,
          context: params.context,
          with_completion_instructions: false,
          show_quick_pick: true,
          panel_provider: params.panel_provider
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructionsUsing',
      async () =>
        perform_code_completion({
          file_tree_provider: params.file_tree_provider,
          open_editors_provider: params.open_editors_provider,
          context: params.context,
          with_completion_instructions: true,
          show_quick_pick: true,
          panel_provider: params.panel_provider
        })
    )
  ]
}
