import * as fs from 'fs'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { OpenEditorsProvider } from '../context/providers/open-editors-provider'
import { WebsitesProvider } from '../context/providers/websites-provider'

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

    // Get all workspace roots
    this.workspace_roots = workspace_provider.getWorkspaceRoots()
  }

  async collect_files(params?: {
    disable_xml?: boolean
    exclude_path?: string
    active_path?: string
  }): Promise<string> {
    // Get checked files from both providers
    const workspace_files = this.workspace_provider.get_checked_files()
    const open_editor_files =
      this.open_editors_provider?.get_checked_files() || []

    // Combine and deduplicate files
    const context_files = Array.from(
      new Set([...workspace_files, ...open_editor_files])
    )
    let collected_text = ''

    // Add content from checked websites
    if (this.websites_provider) {
      const checked_websites = this.websites_provider.get_checked_websites()

      for (const website of checked_websites) {
        if (params?.disable_xml) {
          // Just add the content without XML wrapping for token counting
          collected_text += website.content
        } else {
          collected_text += `<text title="${website.title}">\n<![CDATA[\n${website.content}\n]]>\n</text>\n`
        }
      }
    }

    // Process each checked file
    for (const file_path of context_files) {
      if (params?.exclude_path && params.exclude_path == file_path) continue
      try {
        if (!fs.existsSync(file_path)) continue
        const stats = fs.statSync(file_path)

        // Skip directories
        if (stats.isDirectory()) continue

        const content = fs.readFileSync(file_path, 'utf8')

        // Find which workspace root this file belongs to
        const workspace_root = this.getWorkspaceRootForFile(file_path)

        if (!workspace_root) {
          // File is outside any workspace - use full path as name
          if (params?.disable_xml) {
            collected_text += content
          } else {
            const is_active = params?.active_path === file_path
            collected_text += `<file name="${file_path}"${
              is_active ? ' active' : ''
            }>\n<![CDATA[\n${content}\n]]>\n</file>\n`
          }
          continue
        }

        // Convert absolute path to workspace-relative path
        const relative_path = path.relative(workspace_root, file_path)

        // Get the workspace name to prefix the path if there are multiple workspaces
        let display_path = relative_path
        if (this.workspace_roots.length > 1) {
          // Find workspace name
          const workspace_name =
            this.workspace_provider.getWorkspaceName(workspace_root)
          display_path = `${workspace_name}/${relative_path}`
        }

        if (params?.disable_xml) {
          // Just add the content without XML wrapping, used for context counting so that it matches values shown in file tree
          collected_text += content
        } else {
          const is_active = params?.active_path == file_path
          collected_text += `<file name="${display_path}"${
            is_active ? ' active' : ''
          }>\n<![CDATA[\n${content}\n]]>\n</file>\n`
        }
      } catch (error) {
        console.error(`Error reading file ${file_path}:`, error)
      }
    }

    return collected_text
  }

  // Helper method to determine which workspace root a file belongs to
  private getWorkspaceRootForFile(file_path: string): string | undefined {
    return this.workspace_provider.get_workspace_root_for_file(file_path)
  }
}
