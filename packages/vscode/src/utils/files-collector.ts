import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { WebsitesProvider } from '../context/providers/websites/websites-provider'
import { natural_sort } from '@/utils/natural-sort'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'

export class FilesCollector {
  private workspace_provider: WorkspaceProvider
  private open_editors_provider?: OpenEditorsProvider
  private websites_provider?: WebsitesProvider
  private workspace_roots: string[] = []

  constructor(
    workspace_provider: WorkspaceProvider,
    open_editors_provider?: OpenEditorsProvider,
    websites_provider?: WebsitesProvider
  ) {
    this.workspace_provider = workspace_provider
    this.open_editors_provider = open_editors_provider
    this.websites_provider = websites_provider

    this.workspace_roots = workspace_provider.get_workspace_roots()
  }

  async collect_files(params?: {
    exclude_path?: string
    additional_paths?: string[]
    no_context?: boolean
  }): Promise<string> {
    const additional_paths = (params?.additional_paths ?? []).map((p) => {
      if (this.workspace_roots.length > 0) {
        return path.join(this.workspace_roots[0], p)
      }
      return p
    })

    const context_files_list: string[] = []

    if (params?.no_context) {
      context_files_list.push(...additional_paths)
    } else {
      const workspace_files = this.workspace_provider.get_checked_files()
      const open_editor_files =
        this.open_editors_provider?.get_checked_files() || []
      context_files_list.push(
        ...workspace_files,
        ...open_editor_files,
        ...additional_paths
      )
    }

    const context_files = [...new Set(context_files_list)]
    const now = Date.now()
    const THREE_HOURS = 3 * 60 * 60 * 1000

    // Sort context files based on modification time and selection timestamp
    const sorted_context_files = this._sort_context_files(
      context_files,
      now,
      THREE_HOURS
    )

    let collected_text = ''

    // Only include websites when not in no_context mode
    if (!params?.no_context && this.websites_provider) {
      const checked_websites = this.websites_provider.get_checked_websites()
      checked_websites.sort((a, b) => a.url.localeCompare(b.url))

      for (const website of checked_websites) {
        collected_text += `<document title="${website.title}">\n<![CDATA[\n${website.content}\n]]>\n</document>\n`
      }
    }

    for (const file_path of sorted_context_files) {
      if (params?.exclude_path && params.exclude_path == file_path) continue
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)

        if (stats.isDirectory()) continue

        let content = fs.readFileSync(file_path, 'utf8')

        const range = this.workspace_provider.get_range(file_path)
        if (range) {
          content = this.workspace_provider.apply_range_to_content(
            content,
            range
          )
        }

        const workspace_root = this._get_workspace_root_for_file(file_path)

        if (!workspace_root) {
          collected_text += `<file path="${file_path.replace(
            /\\/g,
            '/'
          )}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
          continue
        }

        const relative_path = path
          .relative(workspace_root, file_path)
          .replace(/\\/g, '/')

        // Get the workspace name to prefix the path if there are multiple workspaces
        let display_path = relative_path
        if (this.workspace_roots.length > 1) {
          const workspace_name =
            this.workspace_provider.get_workspace_name(workspace_root)
          display_path = `${workspace_name}/${relative_path}`
        }

        collected_text += `<file path="${display_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }

  private _get_workspace_root_for_file(file_path: string): string | undefined {
    return this.workspace_provider.get_workspace_root_for_file(file_path)
  }

  private _sort_context_files(
    files: string[],
    now: number,
    three_hours: number
  ): string[] {
    const recently_modified: Array<{ path: string; mtime: number }> = []
    const older_files: Array<{ path: string; timestamp: number }> = []

    for (const file_path of files) {
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)
        if (stats.isDirectory()) continue

        const mtime = stats.mtimeMs
        const selection_timestamp =
          this.workspace_provider.get_selection_timestamp(file_path) ?? now

        if (now - mtime < three_hours) {
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

    return [
      ...older_files.map((f) => f.path),
      ...recently_modified.map((f) => f.path)
    ]
  }
}
