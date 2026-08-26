import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { t } from '../../i18n'
import { get_referencing_files_for_position } from './utils/get-referencing-files-for-position'
import { get_referencing_files_for_uris } from './utils/get-referencing-files-for-uris'
import { prompt_for_referencing_files } from './utils/prompt-for-referencing-files'
import { WebSocketManager } from '@/services/websocket-manager'

const handle_reference_selection = async (params: {
  matched_files: { file_path: string; range: vscode.Range }[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
}) => {
  const { matched_files, workspace_provider, extension_context } = params

  if (matched_files.length == 0) {
    vscode.window.showInformationMessage(
      t('command.select-referencing-files.no-files')
    )
    return
  }

  const selected_paths = await prompt_for_referencing_files({
    matched_files,
    workspace_provider,
    extension_context,
    websocket_manager: params.websocket_manager
  })

  if (!selected_paths) {
    return
  }

  const selected_paths_set = new Set(selected_paths)
  const unselected_files_set = new Set(
    matched_files
      .map((m) => m.file_path)
      .filter((file_path) => !selected_paths_set.has(file_path))
  )
  const latest_checked = workspace_provider.get_checked_files()
  const latest_checked_filtered = latest_checked.filter(
    (file) => !unselected_files_set.has(file)
  )
  const paths_to_apply = [
    ...new Set([...latest_checked_filtered, ...selected_paths])
  ]

  Logger.info({
    message: `Selected ${selected_paths.length} files from reference search.`,
    data: { paths: selected_paths }
  })

  await workspace_provider.set_checked_files(paths_to_apply)
}

export const select_referencing_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext,
  websocket_manager: WebSocketManager
) => {
  const select_referencing_files_command = vscode.commands.registerCommand(
    'codeWebChat.selectReferencingFiles',
    async (item?: any) => {
      try {
        let matched_files: { file_path: string; range: vscode.Range }[] = []

        let target_uri: vscode.Uri | undefined

        let should_check_position = false
        let target_position: vscode.Position | undefined

        if (item?.resourceUri) {
          target_uri = item.resourceUri
        } else if (
          item instanceof vscode.Uri ||
          (item && item.fsPath && item.scheme)
        ) {
          target_uri = item as vscode.Uri
          const editor = vscode.window.activeTextEditor
          if (editor && editor.document.uri.fsPath === target_uri.fsPath) {
            should_check_position = true
            target_position = editor.selection.active
          }
        } else {
          const editor = vscode.window.activeTextEditor
          if (editor) {
            target_uri = editor.document.uri
            should_check_position = true
            target_position = editor.selection.active
          }
        }

        if (!target_uri) {
          return
        }

        let do_whole_file_search = true

        if (should_check_position && target_position) {
          matched_files = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: t('command.select-referencing-files.processing')
            },
            async () => {
              let definitions = await vscode.commands.executeCommand<any[]>(
                'vscode.executeDefinitionProvider',
                target_uri,
                target_position
              )

              if (!definitions || definitions.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 500))
                definitions = await vscode.commands.executeCommand<any[]>(
                  'vscode.executeDefinitionProvider',
                  target_uri,
                  target_position
                )
              }

              const ignore_paths: string[] = []

              if (definitions) {
                for (const d of definitions) {
                  const uri = d.uri || d.targetUri
                  if (uri && uri.fsPath == target_uri!.fsPath) {
                    if (!ignore_paths.includes(target_uri!.fsPath)) {
                      ignore_paths.push(target_uri!.fsPath)
                    }
                  }
                }
              }

              return await get_referencing_files_for_position({
                uri: target_uri,
                position: target_position,
                workspace_provider,
                ignore_paths
              })
            }
          )

          if (matched_files.length > 0) {
            do_whole_file_search = false
          }
        }

        if (do_whole_file_search) {
          const starting_uris = await workspace_provider.get_all_files_for_uri(
            target_uri!
          )

          if (starting_uris.length == 0) {
            vscode.window.showInformationMessage(
              t('command.select-referencing-files.no-files')
            )
            return
          }

          let is_cancelled = false

          matched_files = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: t('command.select-referencing-files.processing'),
              cancellable: true
            },
            async (progress, token) => {
              token.onCancellationRequested(() => {
                is_cancelled = true
              })
              return await get_referencing_files_for_uris({
                uris: starting_uris,
                workspace_provider,
                ignore_paths: starting_uris.map((u) => u.fsPath),
                progress,
                token
              })
            }
          )

          if (is_cancelled) {
            return
          }
        }

        await handle_reference_selection({
          matched_files,
          workspace_provider,
          extension_context,
          websocket_manager
        })
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.select-referencing-files.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'select_referencing_files_command',
          message: 'Error searching references',
          data: error
        })
      }
    }
  )

  const select_referencing_files_for_selected_command =
    vscode.commands.registerCommand(
      'codeWebChat.selectReferencingFilesForSelected',
      async () => {
        try {
          const checked_files = workspace_provider.get_checked_files()

          if (checked_files.length == 0) {
            vscode.window.showInformationMessage(
              t('command.select-referencing-files.no-files')
            )
            return
          }

          let is_cancelled = false
          const uris = checked_files.map((file_path) =>
            vscode.Uri.file(file_path)
          )

          const matched_files = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: t('command.select-referencing-files.processing'),
              cancellable: true
            },
            async (progress, token) => {
              token.onCancellationRequested(() => {
                is_cancelled = true
              })
              return await get_referencing_files_for_uris({
                uris,
                workspace_provider,
                ignore_paths: checked_files,
                progress,
                token
              })
            }
          )

          if (is_cancelled) {
            return
          }

          await handle_reference_selection({
            matched_files,
            workspace_provider,
            extension_context,
            websocket_manager
          })
        } catch (error) {
          vscode.window.showErrorMessage(
            t('command.select-referencing-files.failed', {
              error: error instanceof Error ? error.message : String(error)
            })
          )
          Logger.error({
            function_name: 'select_referencing_files_for_selected_command',
            message: 'Error searching references',
            data: error
          })
        }
      }
    )

  return [
    select_referencing_files_command,
    select_referencing_files_for_selected_command
  ]
}
