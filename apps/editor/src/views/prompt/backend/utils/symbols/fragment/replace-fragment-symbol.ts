import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const replace_fragment_symbol = async (params: {
  instruction: string
  workspace_provider: WorkspaceProvider
}): Promise<string> => {
  const regex = /#Fragment\((.+?):(\d+):(\d+)-(\d+):(\d+)\)/g

  const matches = [...params.instruction.matchAll(regex)]
  if (matches.length === 0) return params.instruction

  let result = params.instruction

  for (const match of matches) {
    const full_match = match[0]
    const file_path = match[1]
    const start_line = parseInt(match[2], 10)
    const end_line = parseInt(match[4], 10)
    
    let content = ''
    try {
      let absolute_path = file_path
      if (!path.isAbsolute(file_path)) {
        const roots = params.workspace_provider.get_workspace_roots()
        for (const root of roots) {
          const test_path = path.join(root, file_path)
          if (fs.existsSync(test_path)) {
            absolute_path = test_path
            break
          }

          if (roots.length > 1) {
            const workspace_name = params.workspace_provider.get_workspace_name(root)
            const prefix = `${workspace_name}/`
            const prefix_win = `${workspace_name}\\`
            
            if (file_path.startsWith(prefix) || file_path.startsWith(prefix_win)) {
              const stripped_test_path = path.join(root, file_path.substring(prefix.length))
              if (fs.existsSync(stripped_test_path)) {
                absolute_path = stripped_test_path
                break
              }
            }
          }
        }
      }

      const file_uri = vscode.Uri.file(absolute_path)
      const document = await vscode.workspace.openTextDocument(file_uri)
      
      const start_pos = new vscode.Position(start_line - 1, parseInt(match[3], 10) - 1)
      const end_pos = new vscode.Position(end_line - 1, parseInt(match[5], 10) - 1)
      const valid_range = document.validateRange(new vscode.Range(start_pos, end_pos))
      content = document.getText(valid_range)
    } catch (e) {
      content = `// Error reading file ${file_path}`
    }

    const range_str = ` (${start_line}-${end_line})`
    const replacement = `\n\n\`${file_path}\`${range_str}\n\n\`\`\`\n${content}\n\`\`\`\n\n`
    
    result = result.replace(full_match, replacement)
  }

  return result
}
