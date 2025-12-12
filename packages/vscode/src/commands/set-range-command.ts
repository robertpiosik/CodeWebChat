import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import { FileItem } from '../context/providers/workspace-provider'

export const set_range_command = () => {
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

      if (!workspace_folder) {
        vscode.window.showErrorMessage('File is not in a workspace folder.')
        return
      }

      const ranges_file_path = path.join(
        workspace_folder.uri.fsPath,
        '.vscode',
        'ranges.json'
      )
      let ranges: Record<string, string> = {}
      try {
        const content = await fs.readFile(ranges_file_path, 'utf-8')
        ranges = JSON.parse(content)
      } catch (error) {
        // File might not exist, which is fine
      }

      const relative_path = path.relative(
        workspace_folder.uri.fsPath,
        file_path
      )
      const current_range = ranges[relative_path]

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

      if (new_range) {
        ranges[relative_path] = new_range.trim().split(/\s+/).join(' ')
      } else {
        delete ranges[relative_path]
      }

      try {
        await fs.mkdir(path.dirname(ranges_file_path), { recursive: true })
        await fs.writeFile(ranges_file_path, JSON.stringify(ranges, null, 2))
      } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to save range: ${error.message}`)
      }
    }
  )
}
