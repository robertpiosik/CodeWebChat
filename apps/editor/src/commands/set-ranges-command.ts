import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace/workspace-provider'
import {
  RANGES_STATE_KEY,
  LAST_RANGES_SAVE_LOCATION_STATE_KEY
} from '../constants/state-keys'
import { t } from '../i18n'
import { normalize_path } from '../utils/normalize-path'

export const set_ranges_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.setRanges',
    async (item: FileItem) => {
      if (!item || !item.resourceUri) {
        return
      }

      const file_path = item.resourceUri.fsPath
      const workspace_folder = vscode.workspace.getWorkspaceFolder(
        item.resourceUri
      )
      const workspace_folders = vscode.workspace.workspaceFolders || []

      if (!workspace_folder) {
        vscode.window.showErrorMessage(
          t('command.set-ranges-command.not-in-workspace')
        )
        return
      }

      const relative_path = path.relative(
        workspace_folder.uri.fsPath,
        file_path
      )

      const get_path_key_for_state = () => {
        const rel_path_unix = normalize_path(relative_path)
        if (workspace_folders.length > 1) {
          return `${workspace_folder.name}:${rel_path_unix}`
        }
        return rel_path_unix
      }
      const state_key = get_path_key_for_state()

      // Load ranges from file
      const ranges_file_path = path.join(
        workspace_folder.uri.fsPath,
        '.vscode',
        'ranges.json'
      )
      let file_ranges: Record<string, string> = {}
      try {
        const content = await fs.readFile(ranges_file_path, 'utf-8')
        file_ranges = JSON.parse(content)
      } catch (error) {
        // File might not exist, which is fine
      }

      // Load ranges from state
      const state_ranges = extension_context.workspaceState.get<
        Record<string, string>
      >(RANGES_STATE_KEY, {})

      const file_range_value = file_ranges[relative_path]
      const state_range_value = state_ranges[state_key]
      const current_range = file_range_value || state_range_value

      const new_ranges = await vscode.window.showInputBox({
        prompt: t('command.set-ranges-command.prompt'),
        title: t('command.set-ranges-command.title'),
        placeHolder: t('command.set-ranges-command.placeholder'),
        value: current_range,
        validateInput: (value) => {
          if (value.trim() == '') return null

          const parts = value
            .trim()
            .split(/[\s,]+/)
            .filter(Boolean)
          const parsed_ranges: {
            start: number
            end: number
            original: string
          }[] = []

          for (const part of parts) {
            const match = part.match(/^(\d+)?-(\d+)?$/)
            if (!match) {
              return t('command.set-ranges-command.validation.invalid-format', {
                part
              })
            }

            const [, start_str, end_str] = match

            if (!start_str && !end_str) {
              return t('command.set-ranges-command.validation.invalid-range')
            }

            const start = start_str ? parseInt(start_str, 10) : null
            const end = end_str ? parseInt(end_str, 10) : null

            if (start !== null && start < 1) {
              return t(
                'command.set-ranges-command.validation.start-greater-than-0',
                {
                  part
                }
              )
            }

            if (end !== null && end < 1) {
              return t(
                'command.set-ranges-command.validation.end-greater-than-0',
                { part }
              )
            }

            if (start !== null && end !== null) {
              if (start > end) {
                return t(
                  'command.set-ranges-command.validation.start-greater-than-end',
                  {
                    part
                  }
                )
              }
              if (start == end) {
                return t(
                  'command.set-ranges-command.validation.start-equals-end',
                  { part }
                )
              }
            }
            parsed_ranges.push({
              start: start ?? 1,
              end: end ?? Number.MAX_SAFE_INTEGER,
              original: part
            })
          }
          parsed_ranges.sort((a, b) => a.start - b.start)

          for (let i = 0; i < parsed_ranges.length - 1; i++) {
            if (parsed_ranges[i].end >= parsed_ranges[i + 1].start) {
              return t('command.set-ranges-command.validation.overlap', {
                part1: parsed_ranges[i].original,
                part2: parsed_ranges[i + 1].original
              })
            }
          }
          return null
        }
      })

      if (new_ranges === undefined) {
        return
      }

      // If range is cleared, remove from both locations
      if (!new_ranges) {
        let changed = false
        if (file_ranges[relative_path]) {
          delete file_ranges[relative_path]
          try {
            if (Object.keys(file_ranges).length == 0) {
              await fs.unlink(ranges_file_path).catch(() => {})
            } else {
              await fs.writeFile(
                ranges_file_path,
                JSON.stringify(file_ranges, null, 2)
              )
            }
            changed = true
          } catch (error: any) {
            vscode.window.showErrorMessage(
              t('command.set-ranges-command.error.update-file', {
                error: error.message
              })
            )
          }
        }

        if (state_ranges[state_key]) {
          const updated_state = { ...state_ranges }
          delete updated_state[state_key]
          await extension_context.workspaceState.update(
            RANGES_STATE_KEY,
            updated_state
          )
          changed = true
        }

        if (changed) {
          await workspace_provider.load_all_ranges()
        }
        return
      }

      // If range is set, determine where to save
      let save_location: 'file' | 'state' | undefined

      if (file_range_value) save_location = 'file'
      else if (state_range_value) save_location = 'state'
      else {
        const last_location = extension_context.workspaceState.get<
          'file' | 'state' | undefined
        >(LAST_RANGES_SAVE_LOCATION_STATE_KEY)

        const choice = await vscode.window.showQuickPick(
          [
            {
              label: t('common.source.json-file'),
              description: t(
                'command.set-ranges-command.quick-pick.json-file-description'
              ),
              picked: last_location != 'state'
            },
            {
              label: t('common.source.workspace-state'),
              description: t(
                'command.set-ranges-command.quick-pick.workspace-state-description'
              ),
              picked: last_location == 'state'
            }
          ],
          {
            placeHolder: t('command.set-ranges-command.quick-pick.placeholder')
          }
        )

        if (!choice) return
        save_location =
          choice.label == t('common.source.json-file') ? 'file' : 'state'
        await extension_context.workspaceState.update(
          LAST_RANGES_SAVE_LOCATION_STATE_KEY,
          save_location
        )
      }

      if (new_ranges) {
        const formatted_range = new_ranges
          .trim()
          .split(/[\s,]+/)
          .filter(Boolean)
          .join(' ')

        if (save_location == 'file') {
          file_ranges[relative_path] = formatted_range
          try {
            await fs.mkdir(path.dirname(ranges_file_path), { recursive: true })
            await fs.writeFile(
              ranges_file_path,
              JSON.stringify(file_ranges, null, 2)
            )

            // Remove from state if exists
            if (state_ranges[state_key]) {
              const updated_state = { ...state_ranges }
              delete updated_state[state_key]
              await extension_context.workspaceState.update(
                RANGES_STATE_KEY,
                updated_state
              )
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(
              t('command.set-ranges-command.error.save-file', {
                error: error.message
              })
            )
          }
        } else {
          // Save to state
          const updated_state = {
            ...state_ranges,
            [state_key]: formatted_range
          }
          await extension_context.workspaceState.update(
            RANGES_STATE_KEY,
            updated_state
          )

          // Remove from file if exists
          if (file_ranges[relative_path]) {
            delete file_ranges[relative_path]
            try {
              if (Object.keys(file_ranges).length == 0) {
                await fs.unlink(ranges_file_path).catch(() => {})
              } else {
                await fs.writeFile(
                  ranges_file_path,
                  JSON.stringify(file_ranges, null, 2)
                )
              }
            } catch (error: any) {
              vscode.window.showErrorMessage(
                t('command.set-ranges-command.error.cleanup-file', {
                  error: error.message
                })
              )
            }
          }
        }

        await workspace_provider.load_all_ranges()
      }
    }
  )
}
