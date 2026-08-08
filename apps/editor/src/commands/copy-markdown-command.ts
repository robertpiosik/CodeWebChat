import * as vscode from 'vscode'
import * as path from 'path'
import { PromptBuilder } from '../utils/prompt-builder'
import { is_binary_file } from '../utils/is-binary'
import { FilesCollector } from '../utils/files-collector'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors/open-editors-provider'
import { t } from '../i18n'

export const copy_markdown_commands = (
  workspace_provider: WorkspaceProvider,
  open_editors_provider: OpenEditorsProvider
) => {
  const files_collector = new FilesCollector({
    workspace_provider,
    open_editors_provider
  })

  return [
    vscode.commands.registerCommand('codeWebChat.copyMarkdown', async () => {
      let context_text = ''

      try {
        const collected = await files_collector.collect_files()
        context_text = collected.other_files + collected.recent_files
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          t('command.copy-markdown.error.collecting-files', {
            message: error.message
          })
        )
        return
      }

      if (context_text == '') {
        vscode.window.showWarningMessage(t('common.warning.no-files-selected'))
        return
      }

      context_text =
        PromptBuilder.build_prompt({ context_text }).full_prompt + '\n'
      await vscode.env.clipboard.writeText(context_text)
      vscode.window.showInformationMessage(
        t('command.copy-markdown.info.context-copied')
      )
    }),

    vscode.commands.registerCommand(
      'codeWebChat.copyMarkdownOpenEditors',
      async () => {
        if (!open_editors_provider) return
        const checked_files = open_editors_provider.get_checked_files()

        if (checked_files.length == 0) {
          vscode.window.showWarningMessage(
            t('command.copy-markdown.warning.no-open-editors')
          )
          return
        }

        let context_text = ''
        const workspace_folders = vscode.workspace.workspaceFolders
        const is_multi_root =
          !!workspace_folders && workspace_folders.length > 1

        for (const file_path of checked_files) {
          try {
            const file_uri = vscode.Uri.file(file_path)
            const content_uint8_array =
              await vscode.workspace.fs.readFile(file_uri)

            let display_path: string
            const workspace_folder =
              vscode.workspace.getWorkspaceFolder(file_uri)

            if (is_multi_root && workspace_folder) {
              const relative_path = path.relative(
                workspace_folder.uri.fsPath,
                file_path
              )
              display_path = `${workspace_folder.name}/${relative_path}`
            } else {
              display_path = vscode.workspace.asRelativePath(file_path)
            }

            if (is_binary_file(file_path, content_uint8_array)) {
              context_text += PromptBuilder.build_file_context({
                filepath: display_path,
                is_binary: true
              })
              continue
            }

            let content = new TextDecoder().decode(content_uint8_array)

            const range = workspace_provider.get_range(file_path)
            if (range) {
              content = workspace_provider.apply_range_to_content(
                content,
                range
              )
            }

            context_text += PromptBuilder.build_file_context({
              filepath: display_path,
              content
            })
          } catch (error: any) {
            vscode.window.showErrorMessage(
              t('command.copy-markdown.error.reading-file', {
                filePath: file_path,
                message: error.message
              })
            )
          }
        }

        if (context_text == '') return

        context_text =
          PromptBuilder.build_prompt({ context_text }).full_prompt + '\n'
        await vscode.env.clipboard.writeText(context_text)
        vscode.window.showInformationMessage(
          t('command.copy-markdown.info.context-from-editors-copied')
        )
      }
    )
  ]
}
