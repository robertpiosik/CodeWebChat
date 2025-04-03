import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { SAVED_CONTEXTS_STATE_KEY } from '../constants/state-keys'

type SavedContext = {
  name: string
  paths: string[]
}

type GeminiCoderConfig = {
  savedContexts?: SavedContext[]
}

/**
 * Migrates saved contexts from the old file-based storage (.vscode/gemini-coder.json)
 * to the new workspace state storage.
 */
export async function migrate_saved_contexts(
  context: vscode.ExtensionContext
): Promise<void> {
  // Check if we have workspaceFolders
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    return // No workspace folders, so nothing to migrate
  }

  // Process each workspace folder
  for (const folder of vscode.workspace.workspaceFolders) {
    const workspace_root = folder.uri.fsPath
    const config_path = path.join(
      workspace_root,
      '.vscode',
      'gemini-coder.json'
    )

    // Check if config file exists
    if (!fs.existsSync(config_path)) {
      continue // No file in this workspace, skip
    }

    try {
      // Read config file
      const config_content = fs.readFileSync(config_path, 'utf8')
      const config = JSON.parse(config_content) as GeminiCoderConfig

      // Check if there are saved contexts
      if (!config.savedContexts || config.savedContexts.length === 0) {
        continue // No saved contexts, skip
      }

      // Get existing contexts from workspace state
      const existing_contexts: SavedContext[] = context.workspaceState.get(
        SAVED_CONTEXTS_STATE_KEY,
        []
      )

      // Map existing contexts by name for easy lookup
      const existing_contexts_map = new Map<string, SavedContext>()
      existing_contexts.forEach((ctx) =>
        existing_contexts_map.set(ctx.name, ctx)
      )

      // Add workspace prefix to paths if in multi-root workspace
      const is_multi_root = vscode.workspace.workspaceFolders.length > 1
      const prefixed_contexts = config.savedContexts.map((ctx) => {
        if (is_multi_root) {
          return {
            ...ctx,
            paths: ctx.paths.map((p) => `${folder.name}:${p}`)
          }
        }
        return ctx
      })

      // Merge contexts (file contexts take precedence in case of name clashes)
      const merged_contexts: SavedContext[] = [...existing_contexts]

      for (const file_context of prefixed_contexts) {
        const existing_index = merged_contexts.findIndex(
          (c) => c.name === file_context.name
        )

        if (existing_index !== -1) {
          // Replace existing context with the one from file
          merged_contexts[existing_index] = file_context
        } else {
          // Add new context
          merged_contexts.push(file_context)
        }
      }

      // Sort contexts alphabetically
      merged_contexts.sort((a, b) => a.name.localeCompare(b.name))

      // Update workspace state
      await context.workspaceState.update(
        SAVED_CONTEXTS_STATE_KEY,
        merged_contexts
      )

      // Remove savedContexts key from the config and save back to file
      delete config.savedContexts
      try {
        fs.writeFileSync(config_path, JSON.stringify(config, null, 2), 'utf8')
        // Removed notification message
      } catch (error: any) {
        // Log error but don't show notification
        console.error(
          `Failed to update configuration file ${config_path}:`,
          error
        )
      }
    } catch (error: any) {
      // Log error but don't show notification
      console.error(`Error migrating contexts from ${config_path}:`, error)
    }
  }
}
