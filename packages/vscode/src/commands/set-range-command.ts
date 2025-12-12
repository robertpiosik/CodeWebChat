import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace-provider'
import {
  RANGES_STATE_KEY,
  LAST_RANGE_SAVE_LOCATION_STATE_KEY
} from '../constants/state-keys'

export const set_range_command = (
  workspace_provider: WorkspaceProvider,
  context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.setRange',
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
        vscode.window.showErrorMessage('File is not in a workspace folder.')
        return
      }

      const relative_path = path.relative(
        workspace_folder.uri.fsPath,
        file_path
      )

      const get_path_key_for_state = () => {
        const rel_path_unix = relative_path.replace(/\\/g, '/')
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
      const state_ranges = context.workspaceState.get<Record<string, string>>(
        RANGES_STATE_KEY,
        {}
      )

      const file_range_value = file_ranges[relative_path]
      const state_range_value = state_ranges[state_key]
      const current_range = file_range_value || state_range_value

      const new_range = await vscode.window.showInputBox({
        prompt: `Set range of lines for ${path.basename(file_path)}`,
        title: 'Range',
        placeHolder: 'e.g., 100-300 400- -500 or empty to clear',
        value: current_range,
        validateInput: (value) => {
          if (value.trim() == '') return null

          const parts = value.trim().split(/\s+/)
          const parsed_ranges: {
            start: number
            end: number
            original: string
          }[] = []

          for (const part of parts) {
            const match = part.match(/^(\d+)?-(\d+)?$/)
            if (!match) {
              return `Invalid format in "${part}". Use formats like 100-300, 100-, -300.`
            }

            const [, start_str, end_str] = match

            if (!start_str && !end_str) {
              return 'Invalid range "-". Specify at least a start or an end line.'
            }

            const start = start_str ? parseInt(start_str, 10) : null
            const end = end_str ? parseInt(end_str, 10) : null

            if (start !== null && start < 1) {
              return `Start line must be 1 or greater in "${part}".`
            }

            if (end !== null && end < 1) {
              return `End line must be 1 or greater in "${part}".`
            }

            if (start !== null && end !== null) {
              if (start > end) {
                return `Start line cannot be greater than end line in "${part}".`
              }
              if (start == end) {
                return `Start and end lines cannot be the same in "${part}".`
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
              return `Ranges cannot overlap: "${
                parsed_ranges[i].original
              }" and "${parsed_ranges[i + 1].original}".`
            }
          }
          return null
        }
      })

      if (new_range === undefined) {
        return
      }

      // If range is cleared, remove from both locations
      if (!new_range) {
        let changed = false
        if (file_ranges[relative_path]) {
          delete file_ranges[relative_path]
          try {
            if (Object.keys(file_ranges).length === 0) {
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
              `Failed to update range in file: ${error.message}`
            )
          }
        }

        if (state_ranges[state_key]) {
          const updated_state = { ...state_ranges }
          delete updated_state[state_key]
          await context.workspaceState.update(RANGES_STATE_KEY, updated_state)
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
        const last_location = context.workspaceState.get<
          'file' | 'state' | undefined
        >(LAST_RANGE_SAVE_LOCATION_STATE_KEY)

        const choice = await vscode.window.showQuickPick(
          [
            {
              label: 'JSON File',
              description: '.vscode/ranges.json',
              picked: last_location != 'state'
            },
            {
              label: 'Workspace State',
              description: 'Internal storage',
              picked: last_location == 'state'
            }
          ],
          { placeHolder: 'Where do you want to save this range?' }
        )

        if (!choice) return
        save_location = choice.label == 'JSON File' ? 'file' : 'state'
        await context.workspaceState.update(
          LAST_RANGE_SAVE_LOCATION_STATE_KEY,
          save_location
        )
      }

      if (new_range) {
        const formatted_range = new_range.trim().split(/\s+/).join(' ')

        if (save_location === 'file') {
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
              await context.workspaceState.update(
                RANGES_STATE_KEY,
                updated_state
              )
            }
          } catch (error: any) {
            vscode.window.showErrorMessage(
              `Failed to save range to file: ${error.message}`
            )
          }
        } else {
          // Save to state
          const updated_state = {
            ...state_ranges,
            [state_key]: formatted_range
          }
          await context.workspaceState.update(RANGES_STATE_KEY, updated_state)

          // Remove from file if exists
          if (file_ranges[relative_path]) {
            delete file_ranges[relative_path]
            try {
              if (Object.keys(file_ranges).length === 0) {
                await fs.unlink(ranges_file_path).catch(() => {})
              } else {
                await fs.writeFile(
                  ranges_file_path,
                  JSON.stringify(file_ranges, null, 2)
                )
              }
            } catch (error: any) {
              vscode.window.showErrorMessage(
                `Failed to clean up range from file: ${error.message}`
              )
            }
          }
        }

        await workspace_provider.load_all_ranges()
      }
    }
  )
}
