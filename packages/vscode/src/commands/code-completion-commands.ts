import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../helpers/make-api-request'
import { code_completion_instruction } from '../constants/instructions'
import { FilesCollector } from '../helpers/files-collector'
import { ApiToolsSettingsManager } from '../services/api-tools-settings-manager'
import { Logger } from '../helpers/logger'
import he from 'he'

async function build_completion_payload(
  document: vscode.TextDocument,
  position: vscode.Position,
  file_tree_provider: any,
  open_editors_provider?: any,
  suggestions?: string
): Promise<string> {
  const document_path = document.uri.fsPath
  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  const context_text = await files_collector.collect_files({
    exclude_path: document_path
  })

  const payload = {
    before: `<files>${context_text}<file name="${vscode.workspace.asRelativePath(
      document.uri
    )}"><![CDATA[${text_before_cursor}`,
    after: `${text_after_cursor}]]></file>\n</files>`
  }

  const instructions = `${code_completion_instruction}${
    suggestions ? ` Follow suggestions: ${suggestions}` : ''
  }`

  return `${instructions}\n${payload.before}<missing text>${payload.after}\n${instructions}`
}

/**
 * Show inline completion using Inline Completions API
 */
async function show_inline_completion(
  editor: vscode.TextEditor,
  position: vscode.Position,
  completion_text: string
) {
  const document = editor.document
  const controller = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: () => {
        const item = {
          insertText: completion_text,
          range: new vscode.Range(position, position)
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

// Core function that contains the shared logic
async function perform_code_completion(
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext,
  with_suggestions: boolean,
  auto_accept: boolean
) {
  const api_tool_settings_manager = new ApiToolsSettingsManager(context)

  const code_completions_settings =
    api_tool_settings_manager.get_code_completions_settings()

  if (!code_completions_settings.provider) {
    vscode.window.showErrorMessage(
      'API provider is not specified for Code Completions tool. Please configure them in API Tools -> Configuration.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_settings.model) {
    vscode.window.showErrorMessage(
      'Model is not specified for Code Completions tool. Please configure them in API Tools -> Configuration.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'Model is not specified for Code Completions tool.'
    })
    return
  }

  const connection_details =
    api_tool_settings_manager.provider_to_connection_details(
      code_completions_settings.provider
    )

  let suggestions: string | undefined
  if (with_suggestions) {
    suggestions = await vscode.window.showInputBox({
      placeHolder: 'Enter suggestions',
      prompt: 'E.g. include explanatory comments'
    })

    if (suggestions === undefined) {
      return
    }
  }

  if (!connection_details.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the settings.'
    )
    return
  }

  const editor = vscode.window.activeTextEditor
  if (editor) {
    const cancel_token_source = axios.CancelToken.source()
    const document = editor.document
    const position = editor.selection.active

    const content = await build_completion_payload(
      document,
      position,
      file_tree_provider,
      open_editors_provider,
      suggestions
    )

    const messages = [
      {
        role: 'user',
        content
      }
    ]

    const body = {
      messages,
      model: code_completions_settings.model,
      temperature: code_completions_settings.temperature || 0
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
        location: vscode.ProgressLocation.Window,
        title: 'Waiting for a completion...'
      },
      async (progress) => {
        progress.report({ increment: 0 })
        try {
          const completion = await make_api_request(
            connection_details.endpoint_url,
            connection_details.api_key,
            body,
            cancel_token_source.token
          )

          if (completion) {
            const match = completion.match(
              /<replacement>([\s\S]*?)<\/replacement>/i
            )
            if (match && match[1]) {
              const decoded_completion = he.decode(match[1].trim())
              if (auto_accept) {
                await editor.edit((editBuilder) => {
                  editBuilder.insert(position, decoded_completion)
                })
                await vscode.commands.executeCommand(
                  'editor.action.formatDocument',
                  document.uri
                )
              } else {
                await show_inline_completion(
                  editor,
                  position,
                  decoded_completion
                )
              }
            }
          }
        } catch (err: any) {
          Logger.error({
            function_name: 'perform_fim_completion',
            message: 'Completion error',
            data: err
          })
          vscode.window.showErrorMessage(err.message)
        } finally {
          cursor_listener.dispose()
          progress.report({ increment: 100 })
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
    vscode.commands.registerCommand('geminiCoder.codeCompletion', async () =>
      perform_code_completion(
        file_tree_provider,
        open_editors_provider,
        context,
        false,
        false
      )
    ),
    vscode.commands.registerCommand(
      'geminiCoder.codeCompletionAutoAccept',
      async () =>
        perform_code_completion(
          file_tree_provider,
          open_editors_provider,
          context,
          false,
          true
        )
    ),
    vscode.commands.registerCommand(
      'geminiCoder.codeCompletionWithSuggestions',
      async () =>
        perform_code_completion(
          file_tree_provider,
          open_editors_provider,
          context,
          true,
          false
        )
    )
  ]
}
