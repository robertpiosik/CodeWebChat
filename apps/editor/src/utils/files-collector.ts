import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { shrink_file } from '../context/utils/shrink-file/shrink-file'
import { is_binary_file } from './is-binary'
import { normalize_path } from './normalize-path'

export namespace FilesCollector {
  export const collect_files = async (params: {
    workspace_provider: WorkspaceProvider
    open_editors_provider?: OpenEditorsProvider
    additional_paths?: string[]
    no_context?: boolean
    shrink?: boolean
  }): Promise<{ other_files: string; recent_files: string }> => {
    const workspace_roots = params.workspace_provider.get_workspace_roots()
    const additional_paths = (params.additional_paths ?? []).map((p) => {
      if (workspace_roots.length > 0) {
        return path.join(workspace_roots[0], p)
      }
      return p
    })

    const context_files_list: string[] = []

    if (params.no_context) {
      context_files_list.push(...additional_paths)
    } else {
      const workspace_files = params.workspace_provider.get_checked_files()
      const open_editor_files =
        params.open_editors_provider?.get_checked_files() || []
      context_files_list.push(
        ...workspace_files,
        ...open_editor_files,
        ...additional_paths
      )
    }

    const context_files = [...new Set(context_files_list)]

    // Sort context files based on modification time and selection timestamp
    const { other_files: other_paths, recent_files: recent_paths } =
      sort_context_files({
        workspace_provider: params.workspace_provider,
        files: context_files
      })

    const process_paths = (paths: string[]) => {
      let collected_text = ''
      for (const file_path of paths) {
        try {
          if (!fs.existsSync(file_path)) continue
          const stats = fs.statSync(file_path)

          if (stats.isDirectory()) continue

          const buffer = fs.readFileSync(file_path)
          const is_binary = is_binary_file(file_path, buffer)

          let content = is_binary ? 'Binary file' : buffer.toString('utf8')

          if (!is_binary) {
            const range = params.workspace_provider.get_range(file_path)
            if (range) {
              content = params.workspace_provider.apply_range_to_content(
                content,
                range
              )
            }

            if (params.shrink) {
              content = shrink_file(content, path.extname(file_path))
            }
          }

          const workspace_root =
            params.workspace_provider.get_workspace_root_for_file(file_path)

          let display_path = normalize_path(file_path)
          if (workspace_root) {
            const relative_path = normalize_path(
              path.relative(workspace_root, file_path)
            )

            display_path = relative_path
            if (workspace_roots.length > 1) {
              const workspace_name =
                params.workspace_provider.get_workspace_name(workspace_root)
              display_path = `${workspace_name}/${relative_path}`
            }
          }

          if (is_binary) {
            collected_text += `- File: \`${display_path}\`\n\nBinary file\n\n`
          } else {
            const backticks = content.includes('```') ? '````' : '```'
            collected_text += `- File: \`${display_path}\`\n\n${backticks}\n${content}\n${backticks}\n\n`
          }
        } catch (error) {
          console.error(`Error reading file ${file_path}:`, error)
        }
      }
      return collected_text
    }

    return {
      other_files: process_paths(other_paths),
      recent_files: process_paths(recent_paths)
    }
  }

  export const sort_context_files = (params: {
    workspace_provider: WorkspaceProvider
    files: string[]
  }): {
    other_files: string[]
    recent_files: string[]
  } => {
    const recently_modified: Array<{ path: string; mtime: number }> = []
    const older_files: Array<{ path: string; timestamp: number }> = []
    const now = Date.now()
    const ONE_AND_HALF_HOURS = 1.5 * 60 * 60 * 1000

    for (const file_path of params.files) {
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)
        if (stats.isDirectory()) continue

        const mtime = stats.mtimeMs
        const selection_timestamp =
          params.workspace_provider.get_selection_timestamp(file_path) ?? now

        if (now - mtime < ONE_AND_HALF_HOURS) {
          recently_modified.push({ path: file_path, mtime })
        } else {
          older_files.push({ path: file_path, timestamp: selection_timestamp })
        }
      } catch (error) {
        console.error(`Error getting file stats for ${file_path}:`, error)
      }
    }

    // Sort older files by selection timestamp (ascending), with natural sort as tiebreaker
    // Files selected within 20 seconds of each other are grouped and sorted naturally
    older_files.sort((a, b) => {
      const timestamp_bucket_a = Math.floor(a.timestamp / 20)
      const timestamp_bucket_b = Math.floor(b.timestamp / 20)
      const bucket_diff = timestamp_bucket_a - timestamp_bucket_b
      if (bucket_diff != 0) {
        return bucket_diff
      }
      // If timestamps are within the same 20-second bucket, use natural sort on paths
      return natural_sort(a.path, b.path)
    })

    recently_modified.sort((a, b) => a.mtime - b.mtime)

    return {
      other_files: older_files.map((f) => f.path),
      recent_files: recently_modified.map((f) => f.path)
    }
  }
}
