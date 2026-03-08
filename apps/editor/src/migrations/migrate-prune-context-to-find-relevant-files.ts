import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'prune-context-to-find-relevant-files-migration-20260310'

export async function migrate_prune_context_to_find_relevant_files(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const CONFIG_KEYS = [
      {
        old: 'pruneContextInstructionsPrefix',
        new: 'findRelevantFilesInstructionsPrefix'
      },
      {
        old: 'chatPresetsForPruneContext',
        new: 'chatPresetsForFindRelevantFiles'
      },
      {
        old: 'promptTemplatesForPruneContext',
        new: 'promptTemplatesForFindRelevantFiles'
      },
      {
        old: 'configurationsForPruneContext',
        new: 'configurationsForFindRelevantFiles'
      }
    ]

    for (const { old: old_key, new: new_key } of CONFIG_KEYS) {
      const inspect = config.inspect<any>(old_key)
      if (inspect?.globalValue !== undefined) {
        await config.update(
          new_key,
          inspect.globalValue,
          vscode.ConfigurationTarget.Global
        )
        await config.update(
          old_key,
          undefined,
          vscode.ConfigurationTarget.Global
        )
      }
    }

    const STATE_KEYS = [
      { old: 'history-prune-context', new: 'history-find-relevant-files' },
      {
        old: 'instructions-prune-context',
        new: 'instructions-find-relevant-files'
      },
      {
        old: 'recently-used-prune-context-config-ids',
        new: 'recently-used-find-relevant-files-config-ids'
      },
      {
        old: 'presets-collapsed-prune-context',
        new: 'presets-collapsed-find-relevant-files'
      },
      {
        old: 'configurations-collapsed-prune-context',
        new: 'configurations-collapsed-find-relevant-files'
      },
      {
        old: 'recently-used-presets-or-groups-prune-context',
        new: 'recently-used-presets-or-groups-find-relevant-files'
      }
    ]

    for (const { old: old_key, new: new_key } of STATE_KEYS) {
      const global_val = context.globalState.get(old_key)
      if (global_val !== undefined) {
        await context.globalState.update(new_key, global_val)
        await context.globalState.update(old_key, undefined)
      }

      const workspace_val = context.workspaceState.get(old_key)
      if (workspace_val !== undefined) {
        await context.workspaceState.update(new_key, workspace_val)
        await context.workspaceState.update(old_key, undefined)
      }
    }

    const modes = ['web-mode', 'api-mode']
    for (const mode_key of modes) {
      const global_val = context.globalState.get(mode_key)
      if (global_val === 'prune-context') {
        await context.globalState.update(mode_key, 'find-relevant-files')
      }

      const workspace_val = context.workspaceState.get(mode_key)
      if (workspace_val === 'prune-context') {
        await context.workspaceState.update(mode_key, 'find-relevant-files')
      }
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_prune_context_to_find_relevant_files',
      message: 'Successfully migrated prune-context to find-relevant-files'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_prune_context_to_find_relevant_files',
      message: 'Error migrating prune-context to find-relevant-files',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
