import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_all_workspace_files } from '@/context/helpers/get-all-workspace-files'
import { extract_paths_from_text } from '@/utils/extract-paths-from-text'
import { normalize_path } from '@/utils/normalize-path'

export const replace_clipboard_paths_symbol = async (params: {
  instruction: string
  workspace_provider: WorkspaceProvider
}): Promise<{ instruction: string; additional_files_definitions: string }> => {
  const regex = /#ClipboardPaths/g
  let result_instruction = params.instruction
  let additional_files_definitions = ''

  if (!regex.test(result_instruction)) {
    return { instruction: result_instruction, additional_files_definitions }
  }

  const text = await vscode.env.clipboard.readText()
  if (!text || !text.trim()) {
    result_instruction = result_instruction.replace(regex, '')
    return { instruction: result_instruction, additional_files_definitions }
  }

  const workspace_roots = params.workspace_provider.get_workspace_roots()
  if (workspace_roots.length === 0) {
    result_instruction = result_instruction.replace(regex, '')
    return { instruction: result_instruction, additional_files_definitions }
  }

  const all_workspace_files = await get_all_workspace_files({
    workspace_provider: params.workspace_provider
  })

  const absolute_paths = new Set<string>()

  for (const root of workspace_roots) {
    let workspace_files = all_workspace_files
    let prefix = ''

    if (workspace_roots.length > 1) {
      const workspace_name = params.workspace_provider.get_workspace_name(root)
      prefix = `${workspace_name}/`

      const root_files = workspace_files.filter((f) => f.startsWith(prefix))
      const stripped_files = root_files.map((f) => f.substring(prefix.length))

      workspace_files = [...root_files, ...stripped_files]
    }

    const valid_paths = extract_paths_from_text({
      text,
      workspace_files
    })

    const root_absolute_paths = Array.from(
      new Set(
        valid_paths.map((p) => {
          const relative_path =
            prefix && p.startsWith(prefix) ? p.substring(prefix.length) : p
          return path.join(root, relative_path)
        })
      )
    ).filter((p) => fs.existsSync(p))

    root_absolute_paths.forEach((p) => absolute_paths.add(p))
  }

  if (absolute_paths.size === 0) {
    result_instruction = result_instruction.replace(regex, '')
    return { instruction: result_instruction, additional_files_definitions }
  }

  let files_markdown = ''
  const display_paths: string[] = []

  for (const p of absolute_paths) {
    try {
      const stats = fs.statSync(p)
      if (stats.isFile()) {
        const content = fs.readFileSync(p, 'utf-8')
        const root = params.workspace_provider.get_workspace_root_for_file(p)
        const relative_path = root ? path.relative(root, p) : p
        let display_path = normalize_path(relative_path)

        if (root && workspace_roots.length > 1) {
          const workspace_name =
            params.workspace_provider.get_workspace_name(root)
          display_path = `${workspace_name}/${display_path}`
        }

        display_paths.push(`\`${display_path}\``)

        const backticks = content.includes('```') ? '````' : '```'
        files_markdown += `### File: \`${display_path}\`\n\n${backticks}\n${content}\n${backticks}\n\n`
      }
    } catch (error) {
      console.error(`Failed to read file ${p} from clipboard paths`, error)
    }
  }

  if (files_markdown) {
    additional_files_definitions += `# Additional files\n\n${files_markdown}`
    result_instruction = result_instruction.replace(
      regex,
      display_paths.join(', ')
    )
  } else {
    result_instruction = result_instruction.replace(regex, '')
  }

  return { instruction: result_instruction, additional_files_definitions }
}
