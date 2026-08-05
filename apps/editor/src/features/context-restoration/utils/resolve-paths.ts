import * as path from 'path'
import * as fs from 'fs'

export const resolve_paths = (params: {
  paths: string[]
  workspace_roots: string[]
  workspace_names: string[]
  origin_root?: string
}): string[] => {
  const resolved_paths: string[] = []

  for (const p of params.paths) {
    if (params.origin_root) {
      resolved_paths.push(path.join(params.origin_root, p))
      continue
    }

    // Check for "Name:path"
    const parts = p.split(':')
    if (parts.length > 1 && params.workspace_names.includes(parts[0])) {
      const workspace_name = parts[0]
      const relative_path = parts.slice(1).join(':')
      const index = params.workspace_names.indexOf(workspace_name)
      if (index !== -1) {
        resolved_paths.push(
          path.join(params.workspace_roots[index], relative_path)
        )
        continue
      }
    }

    // No prefix or unknown prefix
    if (params.workspace_roots.length == 1) {
      resolved_paths.push(path.join(params.workspace_roots[0], p))
    } else {
      // Ambiguous in multi-root if no prefix. Try to find if file exists in any root.
      let found = false
      for (const root of params.workspace_roots) {
        const candidate = path.join(root, p)
        if (fs.existsSync(candidate)) {
          resolved_paths.push(candidate)
          found = true
          break
        }
      }
      if (!found && params.workspace_roots.length > 0) {
        // Fallback
        resolved_paths.push(path.join(params.workspace_roots[0], p))
      }
    }
  }
  return resolved_paths
}
