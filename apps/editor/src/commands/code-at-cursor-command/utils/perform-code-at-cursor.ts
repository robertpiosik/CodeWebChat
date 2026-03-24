import * as vscode from 'vscode'
import axios from 'axios'
import he from 'he'
import { make_api_request } from '../../../utils/make-api-request'
import { code_at_cursor_instructions } from '../../../constants/instructions'
import { FilesCollector } from '../../../utils/files-collector'
import { ModelProvidersManager } from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from '../../../utils/apply-reasoning-effort'
import { t } from '@/i18n'
import { build_user_content } from '../../../utils/build-user-content'

import { get_code_at_cursor_config } from './get-code-at-cursor-config'
import { show_ghost_text } from './show-ghost-text'

export const perform_code_at_cursor = async (params: {
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
      placeHolder: t('command.code-at-cursor.instructions.placeholder'),
      prompt: t('command.code-at-cursor.instructions.prompt'),
      value: last_value
    })

    if (completion_instructions === undefined) return

    await params.context.workspaceState.update(
      'last-completion-instructions',
      completion_instructions || ''
    )
  }

  let force_show_quick_pick = params.show_quick_pick || false
  let current_config_id = params.config_id

  while (true) {
    const config_result = await get_code_at_cursor_config({
      api_providers_manager,
      show_quick_pick: force_show_quick_pick,
      context: params.context,
      config_id: current_config_id,
      panel_provider: params.panel_provider
    })

    if (!config_result) {
      return
    }

    force_show_quick_pick = false
    current_config_id = undefined

    const { provider, config: code_at_cursor_config } = config_result

    if (!code_at_cursor_config.provider_name) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'API provider is not specified for Code Completions tool.'
      })
      force_show_quick_pick = true
      continue
    } else if (!code_at_cursor_config.model) {
      vscode.window.showErrorMessage(
        dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'Model is not specified for Code Completions tool.'
      })
      force_show_quick_pick = true
      continue
    }

    const endpoint_url = provider.base_url

    const editor = vscode.window.activeTextEditor
    if (editor) {
      await editor.document.save()

      if (!editor.selection.isEmpty) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.CODE_AT_CURSOR_NO_SELECTION
        )
        return
      }
      const cancel_token_source = axios.CancelToken.source()
      const document = editor.document
      const position = editor.selection.active

      const text_before_cursor = document.getText(
        new vscode.Range(new vscode.Position(0, 0), position)
      )
      const text_after_cursor = document.getText(
        new vscode.Range(
          position,
          document.positionAt(document.getText().length)
        )
      )

      const files_collector = new FilesCollector({
        workspace_provider: params.file_tree_provider,
        open_editors_provider: params.open_editors_provider
      })

      const collected = await files_collector.collect_files()

      const part1 = `<files>\n${collected.other_files}`
      const part2 = `${collected.recent_files}<file path="${vscode.workspace.asRelativePath(
        document.uri
      )}">\n<![CDATA[\n${text_before_cursor}${
        completion_instructions
          ? `<missing_text>${completion_instructions}</missing_text>`
          : '<missing_text>'
      }${text_after_cursor}\n]]>\n</file>\n</files>\n${code_at_cursor_instructions}`

      const user_content = build_user_content({
        provider_name: provider.name,
        part1,
        part2
      })

      const messages = [
        {
          role: 'user',
          content: user_content
        }
      ]

      const body: { [key: string]: any } = {
        messages,
        model: code_at_cursor_config.model,
        temperature: code_at_cursor_config.temperature
      }

      apply_reasoning_effort({
        body,
        provider,
        reasoning_effort: code_at_cursor_config.reasoning_effort
      })

      const cursor_listener = vscode.window.onDidChangeTextEditorSelection(
        () => {
          cancel_token_source.cancel(
            t('command.code-at-cursor.cancel.cursor-moved')
          )
        }
      )

      try {
        const completion_result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: t('command.code-at-cursor.progress.title'),
            cancellable: true
          },
          async (progress, token) => {
            token.onCancellationRequested(() => {
              cancel_token_source.cancel(
                t('command.code-at-cursor.cancel.user')
              )
            })

            progress.report({
              message: t('common.progress.waiting-for-server')
            })

            return await make_api_request({
              endpoint_url,
              api_key: provider.api_key,
              body,
              cancellation_token: cancel_token_source.token,
              on_chunk: () => {
                progress.report({ message: t('common.progress.receiving') })
              },
              on_thinking_chunk: () => {
                progress.report({ message: t('common.progress.thinking') })
              }
            })
          }
        )

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

            await show_ghost_text({
              editor,
              position,
              ghost_text: decoded_completion
            })
          }
          break
        } else {
          force_show_quick_pick = true
          continue
        }
      } catch (err: any) {
        if (axios.isCancel(err)) {
          if (err.message == t('command.code-at-cursor.cancel.cursor-moved')) {
            break
          }
          force_show_quick_pick = true
          continue
        }

        Logger.error({
          function_name: 'perform_code_at_cursor',
          message: 'Completion error',
          data: err
        })
        force_show_quick_pick = true
        continue
      } finally {
        cursor_listener.dispose()
      }
    } else {
      break
    }
  }
}
