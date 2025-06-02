import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors-provider'
import { WebsitesProvider } from '../context/providers/websites-provider'
import { natural_sort } from '@/utils/natural-sort'

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

    this.workspace_roots = workspace_provider.getWorkspaceRoots()
  }

  async collect_files(params?: {
    exclude_path?: string
    active_path?: string
  }): Promise<string> {
    const workspace_files = this.workspace_provider.get_checked_files()
    const open_editor_files =
      this.open_editors_provider?.get_checked_files() || []

    const context_files = Array.from(
      new Set([...workspace_files, ...open_editor_files])
    ).sort((a, b) => natural_sort(a, b))

    let collected_text = ''

    if (this.websites_provider) {
      const checked_websites = this.websites_provider.get_checked_websites()

      for (const website of checked_websites) {
        collected_text += `<text title="${website.title}">\n<![CDATA[\n${website.content}\n]]>\n</text>\n`
      }
    }

    for (const file_path of context_files) {
      if (params?.exclude_path && params.exclude_path == file_path) continue
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)

        if (stats.isDirectory()) continue

        const content = fs.readFileSync(file_path, 'utf8')

        const workspace_root = this.get_workspace_root_for_file(file_path)

        if (!workspace_root) {
          const is_active = params?.active_path == file_path
          collected_text += `<file path="${file_path}"${
            is_active ? ' active' : ''
          }>\n<![CDATA[\n${content}\n]]>\n</file>\n`
          continue
        }

        const relative_path = path.relative(workspace_root, file_path)

        // Get the workspace name to prefix the path if there are multiple workspaces
        let display_path = relative_path
        if (this.workspace_roots.length > 1) {
          const workspace_name =
            this.workspace_provider.get_workspace_name(workspace_root)
          display_path = `${workspace_name}/${relative_path}`
        }

        const is_active = params?.active_path == file_path
        collected_text += `<file path="${display_path}"${
          is_active ? ' active' : ''
        }>\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }

  private get_workspace_root_for_file(file_path: string): string | undefined {
    return this.workspace_provider.get_workspace_root_for_file(file_path)
  }
}
