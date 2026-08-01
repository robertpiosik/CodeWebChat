import * as vscode from 'vscode'
import axios from 'axios'
import he from 'he'
import { send_llm_message } from '../../../utils/send-llm-message'
import { code_at_cursor_instructions } from '../../../constants/instructions'
import { FilesCollector } from '../../../utils/files-collector'
import { ModelProvidersManager } from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from '../../../utils/apply-reasoning-effort'
import { t } from '@/i18n'
import { build_user_content } from '../../../utils/build-user-content'
import { get_code_at_cursor_api_configuration } from './get-code-at-cursor-config'
import { show_ghost_text } from './show-ghost-text'
import { PromptBuilder } from '../../../utils/prompt-builder'

export const perform_code_at_cursor = async (params: {
  file_tree_provider: any
  open_editors_provider: any
  extension_context: vscode.ExtensionContext
  with_completion_instructions: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  api_configuration_id?: string
  prompt_view_provider?: PromptViewProvider
}) => {
  const model_providers_manager = new ModelProvidersManager(
    params.extension_context
  )

  let completion_instructions: string | undefined =
    params.completion_instructions
  if (params.with_completion_instructions && !completion_instructions) {
    const last_value =
      params.extension_context.workspaceState.get<string>(
        'last-completion-instructions'
      ) || ''
    completion_instructions = await vscode.window.showInputBox({
      placeHolder: t('command.code-at-cursor.instructions.placeholder'),
      prompt: t('command.code-at-cursor.instructions.prompt'),
      value: last_value
    })

    if (completion_instructions === undefined) return

    await params.extension_context.workspaceState.update(
      'last-completion-instructions',
      completion_instructions || ''
    )
  }

  let force_show_quick_pick = params.show_quick_pick || false
  let current_api_configuration_id = params.api_configuration_id

  while (true) {
    const api_configuration_result = await get_code_at_cursor_api_configuration(
      {
        model_providers_manager,
        show_quick_pick: force_show_quick_pick,
        extension_context: params.extension_context,
        api_configuration_id: current_api_configuration_id,
        prompt_view_provider: params.prompt_view_provider
      }
    )

    if (!api_configuration_result) {
      return
    }

    force_show_quick_pick = false
    current_api_configuration_id = undefined

    const {
      model_provider,
      api_configuration: code_at_cursor_api_configuration
    } = api_configuration_result

    if (!code_at_cursor_api_configuration.model_provider_name) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'API provider is not specified for Code at Cursor tool.'
      })
      force_show_quick_pick = true
      continue
    } else if (!code_at_cursor_api_configuration.model) {
      vscode.window.showErrorMessage(
        dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'Model is not specified for Code at Cursor tool.'
      })
      force_show_quick_pick = true
      continue
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
      const abort_controller = new AbortController()
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

      const { part1, part2 } = PromptBuilder.build_prompt({
        other_files: collected.other_files,
        recent_files: collected.recent_files,
        active_file: {
          filepath: vscode.workspace.asRelativePath(document.uri),
          content: `${text_before_cursor}${
            completion_instructions
              ? `<missing_text>${completion_instructions}</missing_text>`
              : '<missing_text>'
          }${text_after_cursor}`
        },
        system_instructions: code_at_cursor_instructions
      })

      const user_content = build_user_content({
        model_provider,
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
        model: code_at_cursor_api_configuration.model
      }

      apply_reasoning_effort({
        body,
        model_provider,
        reasoning_effort: code_at_cursor_api_configuration.reasoning_effort
      })

      const cursor_listener = vscode.window.onDidChangeTextEditorSelection(
        () => {
          abort_controller.abort(
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
              abort_controller.abort(t('command.code-at-cursor.cancel.user'))
            })

            progress.report({
              message: t('common.progress.waiting-for-server')
            })

            return await send_llm_message({
              base_url: model_provider.base_url,
              api_key: model_provider.api_key,
              body,
              abort_signal: abort_controller.signal,
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
